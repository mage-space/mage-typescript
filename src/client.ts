import { type CallOptions, Core } from './core.js';
import { MageError, MageGenerationError } from './errors.js';
import type {
  Account,
  ArchitectureConfigs,
  ArchitectureId,
  ArchitectureList,
  GenerateConfig,
  GenerationRequest,
  GenerationRequestResult,
} from './generated/types.js';
import { Characters, References } from './resources/library.js';
import { Requests, type WaitOptions } from './resources/requests.js';
import { Uploads } from './resources/uploads.js';

export interface MageOptions {
  /** Your API key. Defaults to the `MAGE_API_KEY` environment variable. */
  apiKey?: string;
  /**
   * The API origin. Defaults to the `MAGE_BASE_URL` environment variable,
   * then `https://api.mage.space`.
   */
  baseURL?: string;
  /** How long one HTTP attempt may take, in milliseconds. Default 60000. */
  timeout?: number;
  /** How many times a failed call is retried when that is safe. Default 2. */
  maxRetries?: number;
  /** A `fetch` implementation to use instead of the global one. */
  fetch?: typeof fetch;
}

/**
 * The config a generate call takes: the architecture's own config when the
 * SDK knows the architecture, else the fields every architecture shares.
 */
export type ConfigFor<A extends string> = A extends ArchitectureId
  ? ArchitectureConfigs[A]
  : GenerateConfig;

export interface GenerateOptions extends CallOptions {
  /**
   * Identifies this submission so a retry cannot charge twice. The SDK sends
   * a fresh one per call, and reuses it when it retries that call itself.
   */
  idempotencyKey?: string;
}

export interface RunOptions extends GenerateOptions, WaitOptions {}

/** A request that finished with an output. */
export type CompletedGenerationRequest = GenerationRequest & {
  status: 'completed';
  result: GenerationRequestResult;
};

/** A client for the Mage API. Keep API keys on your servers. */
export class Mage {
  readonly requests: Requests;
  readonly uploads: Uploads;
  readonly characters: Characters;
  readonly references: References;
  readonly account: { get(options?: CallOptions): Promise<Account> };
  readonly architectures: {
    list(options?: CallOptions): Promise<ArchitectureList>;
  };
  readonly #core: Core;

  constructor(options: MageOptions = {}) {
    const apiKey = options.apiKey ?? readEnv('MAGE_API_KEY');
    if (!apiKey) {
      throw new MageError(
        'No API key: pass `apiKey` or set MAGE_API_KEY. Create a key at https://www.mage.space/api?tab=api-keys.',
      );
    }
    const core = new Core({
      apiKey,
      baseURL: (
        options.baseURL ??
        readEnv('MAGE_BASE_URL') ??
        'https://api.mage.space'
      ).replace(/\/+$/, ''),
      timeout: options.timeout ?? 60_000,
      maxRetries: options.maxRetries ?? 2,
      fetch: options.fetch ?? globalThis.fetch,
    });
    this.#core = core;
    this.requests = new Requests(core);
    this.uploads = new Uploads(core);
    this.characters = new Characters(core);
    this.references = new References(core);
    this.account = {
      get: (callOptions) =>
        core.call('GET', '/v1/account', { retry: 'safe', ...callOptions }),
    };
    this.architectures = {
      list: (callOptions) =>
        core.call('GET', '/v1/architectures', {
          retry: 'safe',
          ...callOptions,
        }),
    };
  }

  /**
   * Submits a generation and returns the request at once, usually
   * `in_progress`. Poll it with `requests.wait`, or use `run` to do both.
   */
  generate<A extends ArchitectureId | (string & {})>(
    architecture: A,
    config: ConfigFor<A>,
    options: GenerateOptions = {},
  ): Promise<GenerationRequest> {
    return this.#core.call(
      'POST',
      `/v1/${encodeURIComponent(architecture)}/generate`,
      {
        body: config,
        headers: {
          'Idempotency-Key': options.idempotencyKey ?? crypto.randomUUID(),
        },
        retry: 'generate',
        signal: options.signal,
      },
    );
  }

  /**
   * Submits a generation, waits for it, and returns the completed request;
   * the output is at `result.url`. Throws MageGenerationError when the
   * request fails or is cancelled.
   */
  async run<A extends ArchitectureId | (string & {})>(
    architecture: A,
    config: ConfigFor<A>,
    options: RunOptions = {},
  ): Promise<CompletedGenerationRequest> {
    const submitted = await this.generate(architecture, config, options);
    const request = await this.requests.wait(submitted, options);
    if (request.status !== 'completed' || !request.result) {
      throw new MageGenerationError(request);
    }
    return request as CompletedGenerationRequest;
  }
}

function readEnv(name: string): string | undefined {
  return globalThis.process?.env?.[name]?.trim() || undefined;
}
