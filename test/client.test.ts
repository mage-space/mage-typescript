import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Mage, {
  type GenerationRequest,
  MageAPIError,
  MageConnectionError,
  MageError,
  MageGenerationError,
  MageTimeoutError,
} from '../src/index.js';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function fakeFetch(...handlers: Handler[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = vi.fn(async (input: URL | string, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const handler = handlers[calls.length - 1];
    if (!handler) throw new Error(`Unexpected call ${calls.length}: ${url}`);
    return handler(url, init);
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

const json =
  (status: number, body: unknown): Handler =>
  () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

const text =
  (status: number, body: string): Handler =>
  () =>
    new Response(body, { status });

const networkError: Handler = () => {
  throw new TypeError('fetch failed');
};

const headersOf = (init: RequestInit) => init.headers as Record<string, string>;

function request(
  overrides: Partial<GenerationRequest> = {},
): GenerationRequest {
  return {
    request_id: 'req_1',
    status: 'in_progress',
    architecture: 'mango',
    model_id: 'mango-v3',
    created_at: '2026-09-29T00:00:00.000Z',
    updated_at: '2026-09-29T00:00:00.000Z',
    billing: { mode: 'gems', gems_charged: 135 },
    result: null,
    error: null,
    status_url: 'https://api.mage.space/v1/requests/req_1/status',
    cancel_url: 'https://api.mage.space/v1/requests/req_1/cancel',
    ...overrides,
  };
}

const completed = request({
  status: 'completed',
  result: {
    type: 'image',
    url: 'https://cdn.mage.space/out.png',
    width: 1024,
    height: 1280,
    seed: 7,
    expires_at: null,
    moderation: { nsfw: false },
  },
});

function client(fetch: typeof globalThis.fetch, maxRetries = 2) {
  return new Mage({ apiKey: 'mage_sk_test', fetch, maxRetries });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** Settles a call whose retries or polling wait on timers. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const settled = promise.then(
    (value) => ({ value }),
    (error: unknown) => ({ error }),
  );
  await vi.runAllTimersAsync();
  const outcome = await settled;
  if ('error' in outcome) throw outcome.error;
  return outcome.value;
}

describe('configuration', () => {
  it('refuses to start without an API key', () => {
    vi.stubEnv('MAGE_API_KEY', '');
    expect(() => new Mage()).toThrow(MageError);
  });

  it('reads the key and base URL from the environment', async () => {
    vi.stubEnv('MAGE_API_KEY', 'mage_sk_env');
    vi.stubEnv('MAGE_BASE_URL', 'https://api.beta.mage.space/');
    const { fetch, calls } = fakeFetch(json(200, { gems: { balance: 5 } }));
    const mage = new Mage({ fetch });

    await expect(mage.account.get()).resolves.toEqual({ gems: { balance: 5 } });

    expect(calls[0]?.url).toBe('https://api.beta.mage.space/v1/account');
    expect(headersOf(calls[0]!.init).Authorization).toBe('Bearer mage_sk_env');
  });
});

describe('generate', () => {
  it('posts the config with an idempotency key', async () => {
    const { fetch, calls } = fakeFetch(json(202, request()));

    const result = await client(fetch).generate('mango', {
      prompt: 'A lighthouse',
      aspect_ratio: '4:5',
    });

    expect(result.request_id).toBe('req_1');
    const call = calls[0]!;
    expect(call.url).toBe('https://api.mage.space/v1/mango/generate');
    expect(call.init.method).toBe('POST');
    expect(JSON.parse(call.init.body as string)).toEqual({
      prompt: 'A lighthouse',
      aspect_ratio: '4:5',
    });
    const headers = headersOf(call.init);
    expect(headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['User-Agent']).toMatch(/^mage-space-typescript\//);
  });

  it('sends a new key per call and the caller key when given', async () => {
    const { fetch, calls } = fakeFetch(
      json(202, request()),
      json(202, request()),
      json(200, request()),
    );
    const mage = client(fetch);

    await mage.generate('mango', { prompt: 'a' });
    await mage.generate('mango', { prompt: 'a' });
    await mage.generate('mango', { prompt: 'a' }, { idempotencyKey: 'job-42' });

    const keys = calls.map((call) => headersOf(call.init)['Idempotency-Key']);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[2]).toBe('job-42');
  });

  it('retries a 5xx without a recorded request under the same key', async () => {
    const { fetch, calls } = fakeFetch(
      text(502, '<html>Bad gateway</html>'),
      networkError,
      json(202, request()),
    );

    await settle(client(fetch).generate('mango', { prompt: 'a' }));

    expect(calls).toHaveLength(3);
    const keys = new Set(
      calls.map((call) => headersOf(call.init)['Idempotency-Key']),
    );
    expect(keys.size).toBe(1);
  });

  it('does not retry a refusal the API recorded', async () => {
    const { fetch, calls } = fakeFetch(
      json(500, {
        error: {
          code: 'internal_error',
          message: 'Something broke.',
          request_id: 'req_9',
        },
      }),
    );

    const error = await settle(
      client(fetch).generate('mango', { prompt: 'a' }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MageAPIError);
    expect((error as MageAPIError).requestId).toBe('req_9');
    expect(calls).toHaveLength(1);
  });

  it('does not retry 429', async () => {
    const { fetch, calls } = fakeFetch(
      json(429, {
        error: { code: 'too_many_requests', message: 'Too many.' },
      }),
    );

    await expect(
      settle(client(fetch).generate('mango', { prompt: 'a' })),
    ).rejects.toMatchObject({ status: 429, code: 'too_many_requests' });
    expect(calls).toHaveLength(1);
  });

  it('accepts architectures newer than the SDK', async () => {
    const { fetch, calls } = fakeFetch(json(202, request()));

    await client(fetch).generate('future_model', {
      prompt: 'a',
      novel_field: 3,
    });

    expect(calls[0]?.url).toBe(
      'https://api.mage.space/v1/future_model/generate',
    );
  });
});

describe('errors and retries', () => {
  it('parses the error envelope', async () => {
    const { fetch } = fakeFetch(
      json(402, {
        error: {
          code: 'insufficient_gems',
          message: 'Not enough gems.',
          gems_required: 135,
        },
      }),
    );

    const error = (await client(fetch)
      .generate('mango', { prompt: 'a' })
      .catch((caught: unknown) => caught)) as MageAPIError;

    expect(error).toBeInstanceOf(MageAPIError);
    expect(error.status).toBe(402);
    expect(error.code).toBe('insufficient_gems');
    expect(error.message).toBe('Not enough gems.');
    expect(error.requestId).toBeNull();
    expect(error.body).toMatchObject({ error: { gems_required: 135 } });
  });

  it('reports a body that is not the envelope by its status', async () => {
    const { fetch } = fakeFetch(text(404, 'Not here'));

    const error = (await client(fetch)
      .requests.get('req_1')
      .catch((caught: unknown) => caught)) as MageAPIError;

    expect(error.code).toBeNull();
    expect(error.message).toBe('HTTP 404');
    expect(error.body).toBe('Not here');
  });

  it('retries safe calls on 429 and 5xx up to maxRetries', async () => {
    const { fetch, calls } = fakeFetch(
      text(429, ''),
      text(503, ''),
      text(503, ''),
    );

    await expect(
      settle(client(fetch).requests.get('req_1')),
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toHaveLength(3);
  });

  it('never retries creating a character', async () => {
    const { fetch, calls } = fakeFetch(text(503, ''));

    await expect(
      settle(
        client(fetch).characters.create({
          name: 'Ana',
          image: 'https://example.com/ana.png',
        }),
      ),
    ).rejects.toBeInstanceOf(MageAPIError);
    expect(calls).toHaveLength(1);
  });

  it('throws MageConnectionError when no response arrives', async () => {
    const { fetch, calls } = fakeFetch(networkError);

    await expect(client(fetch, 0).account.get()).rejects.toBeInstanceOf(
      MageConnectionError,
    );
    expect(calls).toHaveLength(1);
  });
});

describe('wait and run', () => {
  it('returns a final request without reading it again', async () => {
    const { fetch, calls } = fakeFetch();

    await expect(client(fetch).requests.wait(completed)).resolves.toBe(
      completed,
    );
    expect(calls).toHaveLength(0);
  });

  it('backs off by 1.5x up to the cap', async () => {
    const statuses = Array.from({ length: 7 }, () => json(200, request()));
    const { fetch, calls } = fakeFetch(...statuses, json(200, completed));
    const times: number[] = [];
    const start = Date.now();

    const final = await settle(
      client(fetch).requests.wait(request(), {
        onUpdate: () => times.push(Date.now() - start),
      }),
    );

    expect(final.status).toBe('completed');
    expect(calls).toHaveLength(8);
    const gaps = times.map((time, index) => time - (times[index - 1] ?? 0));
    expect(gaps).toEqual([2000, 3000, 4500, 6750, 10125, 15000, 15000, 15000]);
  });

  it('reads an id first', async () => {
    const { fetch, calls } = fakeFetch(json(200, completed));

    await expect(client(fetch).requests.wait('req_1')).resolves.toEqual(
      completed,
    );
    expect(calls[0]?.url).toBe(
      'https://api.mage.space/v1/requests/req_1/status',
    );
  });

  it('times out with the last state and leaves the request running', async () => {
    const { fetch, calls } = fakeFetch(
      json(200, request()),
      json(200, request()),
    );

    const error = await settle(
      client(fetch).requests.wait(request(), { timeout: 4000 }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MageTimeoutError);
    expect((error as MageTimeoutError).request.status).toBe('in_progress');
    expect(calls.every((call) => call.url.endsWith('/status'))).toBe(true);
  });

  it('stops when the signal aborts', async () => {
    const { fetch } = fakeFetch(json(200, request()));
    const controller = new AbortController();
    const waiting = client(fetch).requests.wait(request(), {
      signal: controller.signal,
    });
    const outcome = waiting.catch((caught: unknown) => caught);

    controller.abort(new Error('stop'));

    await expect(outcome).resolves.toMatchObject({ message: 'stop' });
  });

  it('run returns the completed request', async () => {
    const { fetch } = fakeFetch(json(202, request()), json(200, completed));

    const result = await settle(
      client(fetch).run('mango', { prompt: 'A lighthouse' }),
    );

    expect(result.result.url).toBe('https://cdn.mage.space/out.png');
  });

  it('run throws for a failed request with its code', async () => {
    const failed = request({
      status: 'failed',
      error: { code: 'content_blocked', message: 'Blocked.' },
    });
    const { fetch } = fakeFetch(json(202, request()), json(200, failed));

    const error = await settle(
      client(fetch).run('mango', { prompt: 'a' }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(MageGenerationError);
    expect((error as MageGenerationError).code).toBe('content_blocked');
    expect((error as MageGenerationError).request).toEqual(failed);
  });

  it('run throws for a cancelled request', async () => {
    const { fetch } = fakeFetch(
      json(202, request()),
      json(200, request({ status: 'cancelled' })),
    );

    await expect(
      settle(client(fetch).run('mango', { prompt: 'a' })),
    ).rejects.toMatchObject({ code: 'cancelled' });
  });
});

describe('uploads', () => {
  const ticket = {
    upload_url: 'https://storage.example.com/signed?sig=abc',
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'x-goog-content-length-range': '0,104857600',
    },
    url: 'https://cdn.mage.space/temp/30d/uploads/clip.mp4',
    content_type: 'video/mp4',
    max_bytes: 10,
    upload_url_expires_at: '2026-09-29T00:15:00.000Z',
    url_expires_at: '2026-10-29T00:00:00.000Z',
  };

  it('puts the bytes with exactly the ticket headers', async () => {
    const { fetch, calls } = fakeFetch(json(200, ticket), text(200, ''));
    const bytes = new Uint8Array([1, 2, 3]);

    const result = await client(fetch).uploads.upload(bytes, {
      contentType: 'video/mp4',
    });

    expect(result.url).toBe(ticket.url);
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      content_type: 'video/mp4',
    });
    const put = calls[1]!;
    expect(put.url).toBe(ticket.upload_url);
    expect(put.init.method).toBe('PUT');
    expect(put.init.headers).toEqual(ticket.headers);
    expect(put.init.body).toEqual(bytes);
  });

  it('takes the content type from a Blob', async () => {
    const { fetch, calls } = fakeFetch(json(200, ticket), text(200, ''));

    await client(fetch).uploads.upload(
      new Blob([new Uint8Array([1])], { type: 'video/mp4' }),
    );

    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      content_type: 'video/mp4',
    });
  });

  it('asks for a content type it cannot infer', async () => {
    const { fetch, calls } = fakeFetch();

    await expect(
      client(fetch).uploads.upload(new Uint8Array([1])),
    ).rejects.toBeInstanceOf(MageError);
    expect(calls).toHaveLength(0);
  });

  it('refuses a file over the ticket limit before sending it', async () => {
    const { fetch, calls } = fakeFetch(json(200, ticket));

    await expect(
      client(fetch).uploads.upload(new Uint8Array(11), {
        contentType: 'video/mp4',
      }),
    ).rejects.toThrow('at most 10');
    expect(calls).toHaveLength(1);
  });

  it('reports a storage refusal', async () => {
    const { fetch } = fakeFetch(
      json(200, ticket),
      text(403, '<Error>SignatureDoesNotMatch</Error>'),
    );

    await expect(
      client(fetch, 0).uploads.upload(new Uint8Array(1), {
        contentType: 'video/mp4',
      }),
    ).rejects.toMatchObject({ status: 403, code: null });
  });
});

describe('library', () => {
  it('sends only the paging params given', async () => {
    const { fetch, calls } = fakeFetch(
      json(200, { data: [], next_cursor: null }),
      json(200, { data: [], next_cursor: null }),
    );
    const mage = client(fetch);

    await mage.characters.list();
    await mage.references.list({ limit: 10, cursor: 'abc' });

    expect(calls[0]?.url).toBe('https://api.mage.space/v1/characters');
    expect(calls[1]?.url).toBe(
      'https://api.mage.space/v1/references?limit=10&cursor=abc',
    );
  });

  it('deletes and resolves to undefined', async () => {
    const { fetch, calls } = fakeFetch(
      () => new Response(null, { status: 204 }),
    );

    await expect(client(fetch).characters.delete('c_1')).resolves.toBe(
      undefined,
    );
    expect(calls[0]?.init.method).toBe('DELETE');
    expect(calls[0]?.url).toBe('https://api.mage.space/v1/characters/c_1');
  });
});
