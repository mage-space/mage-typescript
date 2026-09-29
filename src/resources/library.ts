import type { CallOptions, Core } from '../core.js';
import type {
  Character,
  CharacterList,
  CreateCharacterRequest,
  CreateReferenceRequest,
  Reference,
  ReferenceList,
} from '../generated/types.js';

export interface ListParams {
  /** Items per page, 1 to 200. Default 50. */
  limit?: number;
  /** The `next_cursor` of the previous page. */
  cursor?: string;
}

class Library<Item, List, Create> {
  readonly #core: Core;
  readonly #path: string;

  constructor(core: Core, path: string) {
    this.#core = core;
    this.#path = path;
  }

  /** Lists one page, newest first. Pass its `next_cursor` back as `cursor`. */
  list(params: ListParams = {}, options?: CallOptions): Promise<List> {
    return this.#core.call('GET', this.#path, {
      query: { limit: params.limit, cursor: params.cursor },
      retry: 'safe',
      ...options,
    });
  }

  /** Creates one. Not retried automatically: a retry could create it twice. */
  create(body: Create, options?: CallOptions): Promise<Item> {
    return this.#core.call('POST', this.#path, {
      body,
      retry: 'none',
      ...options,
    });
  }

  /** Deletes one by id. */
  async delete(id: string, options?: CallOptions): Promise<void> {
    await this.#core.call('DELETE', `${this.#path}/${encodeURIComponent(id)}`, {
      retry: 'safe',
      ...options,
    });
  }
}

/** Saved characters, used in prompts by `@handle`. */
export class Characters extends Library<
  Character,
  CharacterList,
  CreateCharacterRequest
> {
  constructor(core: Core) {
    super(core, '/v1/characters');
  }
}

/** Saved image and audio references, used in prompts by `@handle`. */
export class References extends Library<
  Reference,
  ReferenceList,
  CreateReferenceRequest
> {
  constructor(core: Core) {
    super(core, '/v1/references');
  }
}
