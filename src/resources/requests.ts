import { type CallOptions, type Core, sleep } from '../core.js';
import { MageTimeoutError } from '../errors.js';
import type { GenerationRequest } from '../generated/types.js';

const FINAL_STATUSES: ReadonlySet<GenerationRequest['status']> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

/** Whether a request has reached a status it will not leave. */
export function isFinal(request: GenerationRequest): boolean {
  return FINAL_STATUSES.has(request.status);
}

export interface WaitOptions extends CallOptions {
  /** The first delay between status reads, in milliseconds. Default 2000. */
  pollInterval?: number;
  /** The longest delay between status reads, in milliseconds. Default 15000. */
  maxPollInterval?: number;
  /**
   * Give up after this many milliseconds with a MageTimeoutError, even in the
   * middle of a status read. The request keeps running. Default: no limit.
   */
  timeout?: number;
  /** Called with the request after every status read. */
  onUpdate?: (request: GenerationRequest) => void;
}

export class Requests {
  readonly #core: Core;

  constructor(core: Core) {
    this.#core = core;
  }

  /** Reads a request's current state. */
  get(requestId: string, options?: CallOptions): Promise<GenerationRequest> {
    return this.#core.call(
      'GET',
      `/v1/requests/${encodeURIComponent(requestId)}/status`,
      { retry: 'safe', ...options },
    );
  }

  /**
   * Stops a live request. Gems are not returned. Cancelling a finished
   * request throws MageAPIError with code `request_finished`.
   */
  cancel(requestId: string, options?: CallOptions): Promise<GenerationRequest> {
    return this.#core.call(
      'POST',
      `/v1/requests/${encodeURIComponent(requestId)}/cancel`,
      { retry: 'safe', ...options },
    );
  }

  /**
   * Polls a request until it is completed, failed, or cancelled, backing off
   * by 1.5x per read with jitter, and returns its final state.
   */
  async wait(
    request: GenerationRequest | string,
    options: WaitOptions = {},
  ): Promise<GenerationRequest> {
    const {
      pollInterval = 2000,
      maxPollInterval = 15000,
      timeout,
      onUpdate,
      signal,
    } = options;
    // The deadline bounds the pauses and every status read, retries included.
    const expiry =
      timeout === undefined ? undefined : AbortSignal.timeout(timeout);
    const waitSignal =
      signal && expiry ? AbortSignal.any([signal, expiry]) : (signal ?? expiry);
    const requestId =
      typeof request === 'string' ? request : request.request_id;
    let current = typeof request === 'string' ? null : request;
    let delay = pollInterval;
    try {
      while (current === null || !isFinal(current)) {
        if (current !== null) {
          await sleep(delay + Math.random() * 500, waitSignal);
          delay = Math.min(delay * 1.5, maxPollInterval);
        }
        current = await this.get(requestId, { signal: waitSignal });
        onUpdate?.(current);
      }
    } catch (error) {
      if (expiry?.aborted && !signal?.aborted) {
        throw new MageTimeoutError(requestId, current);
      }
      throw error;
    }
    return current;
  }
}
