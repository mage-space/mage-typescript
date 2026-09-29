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
   * Give up after this many milliseconds with a MageTimeoutError. The request
   * keeps running. Default: no limit.
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
    const deadline = timeout === undefined ? undefined : Date.now() + timeout;
    let current: GenerationRequest;
    if (typeof request === 'string') {
      current = await this.get(request, { signal });
      onUpdate?.(current);
    } else {
      current = request;
    }
    let delay = pollInterval;
    while (!isFinal(current)) {
      let pause = delay + Math.random() * 500;
      if (deadline !== undefined) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new MageTimeoutError(current);
        pause = Math.min(pause, remaining);
      }
      await sleep(pause, signal);
      current = await this.get(current.request_id, { signal });
      onUpdate?.(current);
      delay = Math.min(delay * 1.5, maxPollInterval);
    }
    return current;
  }
}
