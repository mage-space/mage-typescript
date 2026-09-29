import type { GenerationRequest } from './generated/types.js';

/** The base class of every error the SDK throws. */
export class MageError extends Error {
  override name = 'MageError';
}

/** The API, or the storage an upload goes to, answered with an error status. */
export class MageAPIError extends MageError {
  override name = 'MageAPIError';
  /** The HTTP status. */
  readonly status: number;
  /**
   * The API's error code, such as `insufficient_gems`, or null when the body
   * is not the API's error envelope (a proxy error page, or storage). Treat
   * a code you do not know by its HTTP status.
   */
  readonly code: string | null;
  /** The request the refusal belongs to, when the API recorded one. */
  readonly requestId: string | null;
  /** The parsed JSON body, or the raw text when it is not JSON. */
  readonly body: unknown;
  readonly headers: Headers;

  constructor(init: {
    status: number;
    code: string | null;
    message: string;
    requestId: string | null;
    body: unknown;
    headers: Headers;
  }) {
    super(init.message);
    this.status = init.status;
    this.code = init.code;
    this.requestId = init.requestId;
    this.body = init.body;
    this.headers = init.headers;
  }

  /** Builds the error for an error response and its body text. */
  static from(response: Response, text: string): MageAPIError {
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON: keep the text.
    }
    const envelope = errorEnvelope(body);
    return new MageAPIError({
      status: response.status,
      code: envelope?.code ?? null,
      message: envelope?.message ?? `HTTP ${response.status}`,
      requestId: envelope?.request_id ?? null,
      body,
      headers: response.headers,
    });
  }
}

/** A call got no response: the network failed or the attempt timed out. */
export class MageConnectionError extends MageError {
  override name = 'MageConnectionError';
}

/**
 * `wait` or `run` reached its `timeout` before the request finished. The
 * request keeps running on Mage.
 */
export class MageTimeoutError extends MageError {
  override name = 'MageTimeoutError';
  /** The last state read, or null when none was read in time. */
  readonly request: GenerationRequest | null;

  constructor(requestId: string, request: GenerationRequest | null) {
    super(
      request
        ? `Request ${requestId} was still ${request.status} when the wait timed out.`
        : `Request ${requestId} could not be read before the wait timed out.`,
    );
    this.request = request;
  }
}

/** `run` finished with a failed or cancelled request. */
export class MageGenerationError extends MageError {
  override name = 'MageGenerationError';
  readonly request: GenerationRequest;
  /** The request's error code, or `cancelled`. */
  readonly code: string;

  constructor(request: GenerationRequest) {
    const code = request.error?.code ?? 'cancelled';
    super(
      request.error
        ? `Request ${request.request_id} failed (${code}): ${request.error.message}`
        : `Request ${request.request_id} was cancelled.`,
    );
    this.request = request;
    this.code = code;
  }
}

function errorEnvelope(
  body: unknown,
): { code: string; message: string; request_id?: string } | null {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return null;
  }
  const error = body.error;
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error) ||
    typeof error.code !== 'string' ||
    !('message' in error) ||
    typeof error.message !== 'string'
  ) {
    return null;
  }
  const requestId =
    'request_id' in error && typeof error.request_id === 'string'
      ? error.request_id
      : undefined;
  return { code: error.code, message: error.message, request_id: requestId };
}
