import type { CallOptions, Core } from '../core.js';
import { MageError } from '../errors.js';
import type { UploadRequest, UploadTicket } from '../generated/types.js';

export type UploadContentType = UploadRequest['content_type'];

export interface UploadOptions extends CallOptions {
  /** The file's media type. Defaults to a Blob's own `type`. */
  contentType?: UploadContentType;
}

export class Uploads {
  readonly #core: Core;

  constructor(core: Core) {
    this.#core = core;
  }

  /** Creates an upload ticket: a signed URL to PUT one file to. */
  create(body: UploadRequest, options?: CallOptions): Promise<UploadTicket> {
    return this.#core.call('POST', '/v1/uploads', {
      body,
      retry: 'safe',
      ...options,
    });
  }

  /**
   * Uploads a file to Mage storage and returns its ticket. Send `ticket.url`
   * in any media field, or as a character's `voice` or an audio reference's
   * `audio`. Use this for files too large for a data URL.
   */
  async upload(
    data: Blob | ArrayBuffer | ArrayBufferView,
    options: UploadOptions = {},
  ): Promise<UploadTicket> {
    const contentType =
      options.contentType ??
      (data instanceof Blob && data.type
        ? (data.type as UploadContentType)
        : undefined);
    if (!contentType) {
      throw new MageError(
        'Pass `contentType` (for example `image/png`) to upload this file.',
      );
    }
    const bytes = await toBytes(data);
    const ticket = await this.create(
      { content_type: contentType },
      { signal: options.signal },
    );
    if (bytes.byteLength > ticket.max_bytes) {
      throw new MageError(
        `The file is ${bytes.byteLength} bytes; an upload takes at most ${ticket.max_bytes}.`,
      );
    }
    // Storage checks these headers against the signature, and the API key
    // must not travel to it.
    await this.#core.send(
      ticket.upload_url,
      { method: ticket.method, headers: ticket.headers, body: bytes },
      'safe',
      options.signal,
    );
    return ticket;
  }
}

async function toBytes(
  data: Blob | ArrayBuffer | ArrayBufferView,
): Promise<Uint8Array<ArrayBuffer>> {
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  // Copy the view so the upload owns its bytes.
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice();
}
