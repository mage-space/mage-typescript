# Mage TypeScript SDK

The official TypeScript client for the [Mage API](https://docs.mage.space/api/overview). Use it to generate images, video, and audio with Mage models from your own server code.

> **Beta.** This SDK is at `0.x` and may still change between minor versions. The API itself is versioned separately and stays stable within `v1`.

## Install

```bash
npm install @mage-space/sdk
```

You need Node.js 20.19 or later, or any other runtime with `fetch`. The package is ESM-only; recent Node versions can `require()` it as well.

Keep your API key on your servers. The API does not send CORS headers, so browsers cannot call it, and anyone who has the key can spend your Gems.

## Quick start

Create a key under [API → API Keys](https://www.mage.space/api?tab=api-keys) and set it as `MAGE_API_KEY`.

```ts
import Mage from '@mage-space/sdk';

const mage = new Mage(); // reads MAGE_API_KEY

const request = await mage.run('mango', {
  prompt: 'Editorial portrait in soft daylight, 35mm film look',
  aspect_ratio: '4:5',
});

console.log(request.result.url);
```

`run` submits the generation, polls until it finishes, and resolves to the completed request. Results are kept for 30 days, so download anything you want to keep.

## Models

Every model's config is typed. The first argument is the architecture id from the endpoint path (`mango`, `cherry`, `seed_audio`, …); `model_id` selects a variant inside it.

```ts
// Video with Cherry 2 Pro, guided by a reference image.
const video = await mage.run('cherry', {
  prompt: 'The camera slowly pushes in as the lights come on',
  model_id: 'cherry-2-pro',
  image: 'https://example.com/reference.png',
  resolution: '720p',
  duration: '5',
});

// Audio with Seed Audio.
const audio = await mage.run('seed_audio', {
  prompt: 'Warm lo-fi beat with vinyl crackle',
  duration: '30',
});
```

See the [model reference](https://docs.mage.space/api/models/overview) for every model's fields, options, and prices. `ARCHITECTURES` lists the ones this version of the SDK knows, and the `MangoConfig`, `CherryConfig`, … types are exported.

A model released after your version of the SDK still works: pass its id as a string, and the config is checked only against the fields every model shares.

## Submitting and polling separately

```ts
const submitted = await mage.generate('cherry', { prompt: 'Waves at dusk' });
console.log(submitted.request_id, submitted.status); // e.g. "in_progress"

// Later, perhaps in another process:
const final = await mage.requests.wait(submitted.request_id, {
  timeout: 15 * 60_000,
  onUpdate: (request) => console.log(request.status),
});

if (final.status === 'completed') console.log(final.result?.url);
```

`requests.wait` polls with the backoff the API recommends: it starts at 2 seconds, multiplies the delay by 1.5 after each read, adds jitter, and caps the delay at 15 seconds. It resolves to the final request whatever its status. `run` throws `MageGenerationError` instead when a request fails or is cancelled.

`requests.get(id)` reads a request's current state once. `requests.cancel(id)` stops a live request; its Gems are not returned.

## Images, video, and audio as inputs

Media fields accept an `https` URL or a data URL. For files larger than about 3 MB, or files that are not at a public URL, upload them first:

```ts
import { readFile } from 'node:fs/promises';

const clip = await mage.uploads.upload(await readFile('clip.mp4'), {
  contentType: 'video/mp4',
});

await mage.run('cherry', {
  prompt: 'Restyle this clip as a watercolor painting',
  videos: [clip.url],
});
```

Uploaded files expire after 30 days (`clip.url_expires_at`).

## Characters and references

Saved characters and references are used by writing their `@handle` in the prompt:

```ts
await mage.characters.create({
  name: 'Ana',
  handle: 'ana',
  image: 'https://example.com/ana.png',
});

await mage.run('mango', { prompt: '@ana walking through a night market' });

const page = await mage.characters.list({ limit: 50 });
// Pass page.next_cursor as `cursor` to read the next page.
```

`mage.references` works the same way for objects, locations, poses, outfits, and audio clips.

## Errors

| Error                 | When                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MageAPIError`        | The API answered with an error. It has `status`, `code` (such as `insufficient_gems` or `invalid_config`), `message`, and `requestId`. Handle a code you do not recognise by its `status`. |
| `MageGenerationError` | `run` finished with a failed or cancelled request. It has `code` and `request`.                                                                                                            |
| `MageTimeoutError`    | `wait` or `run` reached your `timeout`, which also cuts short a status read in progress. The request keeps running; `request` is the last state read.                                      |
| `MageConnectionError` | No response arrived after retrying.                                                                                                                                                        |
| `MageError`           | The base class of all of the above, also thrown for a missing API key.                                                                                                                     |

```ts
import { MageAPIError } from '@mage-space/sdk';

try {
  await mage.run('mango', { prompt: 'A lighthouse at night' });
} catch (error) {
  if (error instanceof MageAPIError && error.code === 'insufficient_gems') {
    // Top up and try again.
  }
  throw error;
}
```

## Retries and idempotency

Calls that are safe to repeat, such as reads, cancels, and uploads, are retried up to twice on network errors, `408`, `429`, and `5xx` responses, with exponential backoff.

`generate` sends an `Idempotency-Key` with every submission, so a retried submission never charges twice. The SDK generates a new key per call and reuses it when it retries that call itself. It retries only when no response arrived, or on a `408` or `5xx` that did not record the request. Pass your own key to protect retries across processes:

```ts
await mage.generate(
  'mango',
  { prompt: 'A lighthouse' },
  { idempotencyKey: `job-${job.id}` },
);
```

Creating a character or reference is never retried automatically.

## Configuration

```ts
const mage = new Mage({
  apiKey: process.env.MAGE_API_KEY, // default: MAGE_API_KEY
  baseURL: 'https://api.mage.space', // default: MAGE_BASE_URL, then this
  timeout: 60_000, // per HTTP attempt, in milliseconds
  maxRetries: 2,
  fetch: customFetch, // default: global fetch
});
```

Every method also takes a `signal` to abort it.

## Versioning

The SDK follows semantic versioning; while it is in beta (`0.x`), a breaking change bumps the minor version. The model types come from the published [API reference](https://docs.mage.space/api/openapi.json). A bot opens a pull request when the reference changes, so new models and options arrive as new releases.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
