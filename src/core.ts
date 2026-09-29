import { MageAPIError, MageConnectionError } from './errors.js';
import { VERSION } from './version.js';

/**
 * Which failures a call may retry:
 * - `safe`: reads, deletes, cancels, and uploads. Retried on no response,
 *   408, 429, and 5xx.
 * - `generate`: a submit carrying an idempotency key. Retried on no response,
 *   and on 408 or 5xx unless the API recorded the refusal (its body names a
 *   `request_id`, which the same key would only replay).
 * - `none`: calls that are not idempotent, such as creating a character.
 */
export type RetryPolicy = 'safe' | 'generate' | 'none';

export interface CallOptions {
  /** Aborts the call, including any retry wait. */
  signal?: AbortSignal;
}

export interface CoreOptions {
  apiKey: string;
  baseURL: string;
  timeout: number;
  maxRetries: number;
  fetch: typeof fetch;
}

/** Sends HTTP calls with the SDK's timeout, retry, and error handling. */
export class Core {
  readonly baseURL: string;
  readonly #apiKey: string;
  readonly #timeout: number;
  readonly #maxRetries: number;
  readonly #fetch: typeof fetch;

  constructor(options: CoreOptions) {
    this.baseURL = options.baseURL;
    this.#apiKey = options.apiKey;
    this.#timeout = options.timeout;
    this.#maxRetries = options.maxRetries;
    this.#fetch = options.fetch;
  }

  /** Calls an API endpoint and returns its JSON body (undefined for 204). */
  async call<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    init: {
      query?: Record<string, string | number | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
      retry: RetryPolicy;
    } & CallOptions,
  ): Promise<T> {
    const url = new URL(path, this.baseURL);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#apiKey}`,
      Accept: 'application/json',
      'User-Agent': `mage-space-typescript/${VERSION}`,
      ...init.headers,
    };
    let body: string | undefined;
    if (init.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.body);
    }
    const { text } = await this.send(
      url,
      { method, headers, body },
      init.retry,
      init.signal,
    );
    return (text === '' ? undefined : JSON.parse(text)) as T;
  }

  /**
   * Sends a request to any URL, retrying per `retry`, and returns the
   * successful response with its body read. Throws MageAPIError for an error
   * status and MageConnectionError when no complete response arrived.
   */
  async send(
    url: URL | string,
    init: RequestInit,
    retry: RetryPolicy,
    signal?: AbortSignal,
  ): Promise<{ response: Response; text: string }> {
    for (let attempt = 0; ; attempt++) {
      const retriesLeft = retry !== 'none' && attempt < this.#maxRetries;
      let response: Response;
      let text: string;
      try {
        response = await this.#fetch(url, {
          ...init,
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(this.#timeout)])
            : AbortSignal.timeout(this.#timeout),
        });
        // Reading the body belongs to the attempt: a connection that drops
        // after the headers is retried like one that drops before them.
        text = await response.text();
      } catch (error) {
        signal?.throwIfAborted();
        if (retriesLeft) {
          await sleep(backoff(attempt), signal);
          continue;
        }
        throw new MageConnectionError(
          `No response from ${new URL(url).host}: ${describe(error)}`,
          { cause: error },
        );
      }
      if (response.ok) return { response, text };
      const error = MageAPIError.from(response, text);
      if (retriesLeft && isRetryable(error, retry)) {
        await sleep(backoff(attempt), signal);
        continue;
      }
      throw error;
    }
  }
}

function isRetryable(error: MageAPIError, retry: RetryPolicy): boolean {
  const transient = error.status === 408 || error.status >= 500;
  if (retry === 'generate') return transient && error.requestId === null;
  return transient || error.status === 429;
}

/** Half a second, doubling per attempt, capped at 8 seconds, plus up to 25% jitter. */
function backoff(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 8000) * (1 + Math.random() * 0.25);
}

function describe(error: unknown): string {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'the attempt timed out';
  }
  return error instanceof Error ? error.message : String(error);
}

/** Resolves after `ms`, or rejects with the signal's reason when it aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
