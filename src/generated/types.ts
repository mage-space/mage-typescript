// Generated from spec/openapi.json by scripts/generate.mjs. Do not edit.

/** The error codes this version of the SDK knows. */
export type ErrorCode =
  | 'unauthorized'
  | 'invalid_request'
  | 'invalid_config'
  | 'architecture_not_found'
  | 'architecture_retired'
  | 'request_not_found'
  | 'character_not_found'
  | 'reference_not_found'
  | 'not_found'
  | 'insufficient_gems'
  | 'forbidden'
  | 'content_blocked'
  | 'request_finished'
  | 'handle_taken'
  | 'too_many_requests'
  | 'generation_failed'
  | 'internal_error';

export interface GenerationRequest {
  /** The request id, also the id in `status_url` and `cancel_url`. */
  request_id: string;
  /** `queued` and `in_progress` are live; `completed`, `failed`, and `cancelled` are final. */
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  /** The architecture the request generates with. */
  architecture: string;
  /** The model variant, when the architecture has variants. */
  model_id: string | null;
  /** When the request was accepted. */
  created_at: string;
  /** When the request last changed. */
  updated_at: string;
  billing: GenerationRequestBilling;
  /** The output once `status` is `completed`, else null. */
  result: GenerationRequestResult | null;
  /** Why the request failed once `status` is `failed`, else null. */
  error: GenerationRequestError | null;
  /** Poll this URL for the request. */
  status_url: string;
  /** POST to this URL to stop the request. */
  cancel_url: string;
}

export interface GenerationRequestBilling {
  /** Every API request is paid in gems. */
  mode: 'gems';
  /** Gems debited for the request. */
  gems_charged: number;
  /** Gems returned to the account; present on failed requests. */
  gems_refunded?: number;
}

export interface GenerationRequestResult {
  /** The media type of the output. */
  type: 'image' | 'video' | 'audio';
  /** Where to download the output. */
  url: string;
  /** Output width in pixels; 0 for audio. */
  width: number;
  /** Output height in pixels; 0 for audio. */
  height: number;
  /** The seed the generation ran with. */
  seed: number;
  /** When `url` stops working: 30 days after the request for temporary media, or null for permanent media. */
  expires_at: string | null;
  /** Moderation flags on the output. */
  moderation: GenerationRequestResultModeration;
}

/** Moderation flags on the output. */
export interface GenerationRequestResultModeration {
  /** Whether moderation flagged the output as NSFW. */
  nsfw: boolean;
}

export interface GenerationRequestError {
  /** A stable error code. */
  code: ErrorCode | (string & {});
  /** What went wrong, for a person. */
  message: string;
}

export interface ErrorBody {
  /** Further fields depend on the code. */
  error: ErrorBodyError;
}

/** Further fields depend on the code. */
export interface ErrorBodyError {
  /** A stable error code; treat an unknown code by its HTTP status. */
  code: ErrorCode | (string & {});
  /** What went wrong, for a person. */
  message: string;
  /** The request the refusal belongs to, when one was recorded before the refusal. */
  request_id?: string;
  /** The price of the refused generation, on `insufficient_gems`. */
  gems_required?: number;
  /** Where to read the API reference, on `not_found`. */
  docs_url?: string;
  /** The handle that is taken, on `handle_taken`. */
  handle?: string;
  [key: string]: unknown;
}

export interface GenerateConfig {
  /** The text prompt. An `@handle` in it attaches one of your saved characters or references. */
  prompt: string;
  /** The model variant; the architecture default when omitted. */
  model_id?: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The output aspect ratio as `W:H` (`16:9`), on models that have one; each model lists its ratios. */
  aspect_ratio?: string;
  /** The first frame image, on models that start a video from one. An https URL or a data URL. */
  first_image?: string;
  /** The last frame image, on models that end a video on one. An https URL or a data URL. */
  last_image?: string;
  /** The output resolution token, on models that offer one; each model lists its tokens. */
  resolution?: string;
  /** The clip length in seconds as a token, on video and audio models that offer one; each model lists its tokens. */
  duration?: string;
  [key: string]: unknown;
}

export interface ArchitectureList {
  architectures: Architecture[];
}

export interface Architecture {
  /** The architecture id, as used in its endpoint path. */
  id: string;
  /** The display name. */
  name: string;
  /** What the architecture generates. */
  type: 'image' | 'video' | 'audio';
  /** What the model is for and its usage rules. */
  description: string;
  /** The request field for each image role; an absent role is not supported. */
  image_inputs: ArchitectureImageInputs;
  /** The source-video field, or null when the architecture takes no video. */
  video_inputs: ArchitectureVideoInputs | null;
  /** The default config every request starts from. */
  base_config: Record<string, unknown>;
  /** Allowed tokens per adjustable field, across all variants. */
  options: Record<string, string[]>;
  /** Per-variant narrowing of `options`, keyed by `model_id`; empty when variants share the lists. */
  options_by_model: Record<string, Record<string, string[]>>;
  /** Which saved characters and references a prompt may mention by `@handle`, per model variant. */
  mentions: ArchitectureMentions;
  /** Image inputs, characters, and references per request, which share one budget. */
  max_images: number;
  /** Per-variant overrides of `max_images`, keyed by `model_id`; empty when every variant shares it. */
  max_images_by_model: Record<string, number>;
  /** The request body as JSON Schema (draft 2020-12), defaults folded in. */
  input_schema: ArchitectureInputSchema;
  /** The gem price of the default config. */
  gems: number;
  /** The endpoint to submit a generation to. */
  generate_url: string;
}

/** The request field for each image role; an absent role is not supported. */
export interface ArchitectureImageInputs {
  /** The field a first frame image goes in, or null. */
  first_frame: string | null;
  /** The field a last frame image goes in, or null. */
  last_frame: string | null;
  /** Reference image fields, or null when the architecture takes none. */
  references: ArchitectureImageInputsReferences | null;
}

export interface ArchitectureImageInputsReferences {
  /** The field the first reference image goes in. */
  field: string;
  /** The list field further reference images go in, or null. */
  additional_field: string | null;
}

export interface ArchitectureVideoInputs {
  /** The field holding the source video or videos. */
  field: string;
}

/** Which saved characters and references a prompt may mention by `@handle`, per model variant. */
export interface ArchitectureMentions {
  /** Model ids whose prompts may mention `@character` handles; empty when none may. */
  characters: string[];
  /** Model ids whose prompts may mention image `@reference` handles; empty when none may. */
  references: string[];
  /** Model ids whose prompts may mention audio `@reference` handles; empty when none may. */
  audio_references: string[];
  /** Audio references per request. On a model that also sends character voices, the voices share these slots. 0 when the model takes no audio references, which does not stop it sending voices. */
  max_audio_references: number;
  /** Whether a mentioned character's voice is sent with its image, unless the request sets `use_character_voices` to false. */
  character_voices: boolean;
}

/** The request body as JSON Schema (draft 2020-12), defaults folded in. */
export interface ArchitectureInputSchema {
  properties: Record<string, Record<string, unknown>>;
  required: string[];
  [key: string]: unknown;
}

export interface Account {
  gems: AccountGems;
}

export interface AccountGems {
  /** Gems available to the account. */
  balance: number;
}

export interface UploadRequest {
  /** The media type of the file you will upload: an image or video for a generate request, or an audio clip for a character voice or an audio reference. */
  content_type:
    | 'image/jpeg'
    | 'image/png'
    | 'video/mp4'
    | 'video/quicktime'
    | 'video/webm'
    | 'audio/mpeg'
    | 'audio/mp3'
    | 'audio/wav'
    | 'audio/wave'
    | 'audio/x-wav';
}

export interface UploadTicket {
  /** PUT the file here. */
  upload_url: string;
  method: 'PUT';
  /** Headers the PUT must carry exactly; storage checks them against the signature. */
  headers: Record<string, string>;
  /** The URL the file has once the PUT succeeds. Send it in any media field, or as `voice` or `audio` when creating a character or an audio reference. */
  url: string;
  /** The media type the PUT must declare. */
  content_type: string;
  /** The largest body the upload accepts: 100 MB. */
  max_bytes: number;
  /** When `upload_url` stops accepting the PUT. */
  upload_url_expires_at: string;
  /** When the uploaded file is deleted: 30 days after the ticket. */
  url_expires_at: string;
}

export interface Character {
  /** The character id, as `DELETE /v1/characters/{character_id}` takes it. */
  id: string;
  /** Mention the character in a prompt as `@handle`. */
  handle: string;
  /** The display name. */
  name: string;
  /** Your notes, or null. */
  description: string | null;
  /** The portrait. */
  image_url: string;
  /** The processed voice clip, or null for a character without one. */
  voice_url: string | null;
  /** Characters created through the API are private; publishing happens in the app. */
  visibility: 'public' | 'private';
  /** When it was created. */
  created_at: string;
}

export interface CharacterList {
  /** The page, newest first. */
  data: Character[];
  /** Send as `cursor` for the next page; null on the last page. */
  next_cursor: string | null;
}

export interface CreateCharacterRequest {
  /** The display name. */
  name: string;
  /** The `@handle` prompts mention it by: 1 to 15 lowercase letters, digits, underscores, or dashes, starting with a letter. Handles such as image1 and image2 are reserved for uploaded images. Derived from the name when omitted. Cannot be changed later. */
  handle?: string;
  /** The portrait: an https URL, an upload URL, or a data URL of a JPEG or PNG. Stored permanently with the character. */
  image: string;
  /** Optional notes, for your own reference. */
  description?: string;
  /** Optional voice clip: an https URL, an upload URL, or a data URL of an MP3 or WAV. Trimmed to 10 seconds and normalized, like a clip uploaded in the app. */
  voice?: string;
}

export interface Reference {
  /** The reference id, as `DELETE /v1/references/{reference_id}` takes it. */
  id: string;
  /** Mention the reference in a prompt as `@handle`. */
  handle: string;
  /** The display name. */
  name: string;
  /** What the reference is. */
  kind: 'object' | 'location' | 'pose' | 'outfit' | 'audio';
  /** Your notes, or null. */
  description: string | null;
  /** The image, for the four image kinds; null for an audio reference. */
  image_url: string | null;
  /** The processed clip, for `kind: "audio"`; null otherwise. */
  audio_url: string | null;
  /** When it was created. */
  created_at: string;
}

export interface ReferenceList {
  /** The page, newest first. */
  data: Reference[];
  /** Send as `cursor` for the next page; null on the last page. */
  next_cursor: string | null;
}

export interface CreateReferenceRequest {
  /** The display name. */
  name: string;
  /** The `@handle` prompts mention it by: 1 to 15 lowercase letters, digits, underscores, or dashes, starting with a letter. Handles such as image1 and image2 are reserved for uploaded images. Derived from the name when omitted. Cannot be changed later. */
  handle?: string;
  /** What the reference is. The four image kinds take `image`; `audio` takes `audio`. */
  kind: 'object' | 'location' | 'pose' | 'outfit' | 'audio';
  /** The image, for the four image kinds: an https URL, an upload URL, or a data URL of a JPEG or PNG. Stored permanently with the reference. */
  image?: string;
  /** The clip, for `kind: "audio"`: an https URL, an upload URL, or a data URL of an MP3 or WAV. Trimmed to 15 seconds and normalized, like a clip uploaded in the app. */
  audio?: string;
  /** Optional notes, for your own reference. */
  description?: string;
}

/** The config for Anima (`POST /v1/anima/generate`). Generate an image with Anima. */
export interface AnimaConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"anima-v1"`. */
  model_id?: 'anima-v1';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"1k"`. */
  resolution?: '1k' | '2k';
  /** Default: `"euler"`. */
  scheduler?: string;
  /** Default: `3`. */
  shift?: number;
  /** Default: `true`. */
  prompt_weighting?: boolean;
  /** Default: `30`. */
  num_inference_steps?: number;
  /** Default: `5`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for Chroma (`POST /v1/chroma/generate`). Generate an image with Chroma. */
export interface ChromaConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"chroma-v1-hd"`. */
  model_id?: 'chroma-v1-hd';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Default: `40`. */
  num_inference_steps?: number;
  /** Default: `3`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for Flux 2 (`POST /v1/flux2/generate`). Generate an image with Flux 2. */
export interface Flux2Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"flux2-dev"`. */
  model_id?: 'flux2-dev';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"1k"`. */
  resolution?: '1k' | '2k';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `28`. */
  num_inference_steps?: number;
  /** Default: `4`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for GPT Image 2 (`POST /v1/gpt_image_2/generate`). Generate an image with GPT Image 2. */
export interface GptImage2Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"gpt-image-2"`. */
  model_id?: 'gpt-image-2' | 'gpt-image-2.5-flare' | 'gpt-image-2.5-sunburst';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"1K"`. */
  resolution?: '1K' | '2K';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `"low"`. */
  quality?: string;
  [key: string]: unknown;
}

/** The config for Grok Image (`POST /v1/grok_image/generate`). Generate an image with Grok Image. */
export interface GrokImageConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"grok-imagine-image-quality"`. */
  model_id?:
    | 'grok-imagine-image'
    | 'grok-imagine-image-quality'
    | 'grok-imagine-image-2.0';
  /** Aspect ratio as `W:H`. Default: `"1:1"`. */
  aspect_ratio?:
    | '1:1'
    | '16:9'
    | '9:16'
    | '4:3'
    | '3:4'
    | '3:2'
    | '2:3'
    | '2:1'
    | '1:2'
    | '19.5:9'
    | '9:19.5'
    | '20:9'
    | '9:20';
  /** Output resolution token. Default: `"1k"`. */
  resolution?: '1k' | '2k';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `"medium"`. */
  quality?: string;
  [key: string]: unknown;
}

/** The config for Guava (`POST /v1/guava/generate`). Generate an image with Guava. */
export interface GuavaConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"guava"`. */
  model_id?:
    'guava' | 'guava-pro' | 'guava-pro-v1-5' | 'guava-2' | 'guava-2-pro';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"1K"`. */
  resolution?: '1K' | '2K';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `false`. */
  prompt_extend?: boolean;
  [key: string]: unknown;
}

/** The config for HiDream (`POST /v1/hidream/generate`). Generate an image with HiDream. */
export interface HidreamConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"hidream-fast"`. */
  model_id?: 'hidream-fast';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Default: `""`. */
  negative_prompt?: string;
  /** Default: `16`. */
  num_inference_steps?: number;
  /** Default: `0`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for Krea 2 (`POST /v1/krea_2/generate`). Generate an image with Krea 2. */
export interface Krea2Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"krea-2-turbo"`. */
  model_id?: 'krea-2-turbo';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"1k"`. */
  resolution?: '1k' | '2k';
  /** Default: `"euler"`. */
  scheduler?: string;
  /** Default: `8`. */
  num_inference_steps?: number;
  /** Default: `0`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for Mango (`POST /v1/mango/generate`). Generate an image with Mango. */
export interface MangoConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"mango-v3"`. */
  model_id?: 'mango' | 'mango-v2' | 'mango-v3s' | 'mango-v3' | 'mango-v3-turbo';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"2K"`. */
  resolution?: '1K' | '2K' | '3K' | '4K';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  [key: string]: unknown;
}

/** The config for Nano Banana 2 (`POST /v1/nano_banana_v2/generate`). Generate an image with Nano Banana 2. */
export interface NanoBananaV2Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"nano-banana-v2.1"`. */
  model_id?: 'nano-banana-v2' | 'nano-banana-v2.1';
  /** Aspect ratio as `W:H`. Default: `"1:1"`. */
  aspect_ratio?:
    | '1:1'
    | '3:2'
    | '2:3'
    | '3:4'
    | '4:1'
    | '4:3'
    | '4:5'
    | '5:4'
    | '8:1'
    | '9:16'
    | '16:9'
    | '21:9';
  /** Output resolution token. Default: `"1K"`. */
  resolution?: '512' | '1K' | '2K' | '4K';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `"minimal"`. */
  thinking_level?: string;
  /** Default: `false`. */
  web_search?: boolean;
  /** Default: `false`. */
  image_search?: boolean;
  [key: string]: unknown;
}

/** The config for SDXL Plus (`POST /v1/sdxl_plus/generate`). Generate an image with SDXL Plus. */
export interface SdxlPlusConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"6A35A7855770AE9820A3C931D4964C3817B6D9E3C6F9C4DABB5B3A94E5643B80"`. */
  model_id?: '6A35A7855770AE9820A3C931D4964C3817B6D9E3C6F9C4DABB5B3A94E5643B80';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Default: `""`. */
  negative_prompt?: string;
  /** Default: `50`. */
  num_inference_steps?: number;
  /** Default: `5`. */
  guidance_scale?: number;
  /** Default: `"euler"`. */
  scheduler?: string;
  /** Default: `"v1"`. */
  prompt_embed_version?: string;
  /** Default: `true`. */
  hires?: boolean;
  /** Default: `0.5`. */
  hires_strength?: number;
  /** Default: `true`. */
  adetailer_face?: boolean;
  /** Default: `0.4`. */
  adetailer_face_strength?: number;
  /** Default: `4`. */
  adetailer_face_blur?: number;
  /** Default: `4`. */
  adetailer_face_dilation?: number;
  /** Default: `true`. */
  adetailer_hands?: boolean;
  /** Default: `0.4`. */
  adetailer_hands_strength?: number;
  /** Default: `4`. */
  adetailer_hands_blur?: number;
  /** Default: `4`. */
  adetailer_hands_dilation?: number;
  [key: string]: unknown;
}

/** The config for Stable Diffusion v1.5 (`POST /v1/stable_diffusion_v15/generate`). Generate an image with Stable Diffusion v1.5. */
export interface StableDiffusionV15Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"15012C538F503CE2EBFC2C8547B268C75CCDAFF7A281DB55399940FF1D70E21D"`. */
  model_id?: '15012C538F503CE2EBFC2C8547B268C75CCDAFF7A281DB55399940FF1D70E21D';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Default: `""`. */
  negative_prompt?: string;
  /** Default: `20`. */
  num_inference_steps?: number;
  /** Default: `7.5`. */
  guidance_scale?: number;
  /** Default: `"kdpm2_karras"`. */
  scheduler?: string;
  [key: string]: unknown;
}

/** The config for Stable Diffusion v3.5 Large (`POST /v1/stable_diffusion_v35_large/generate`). Generate an image with Stable Diffusion v3.5 Large. */
export interface StableDiffusionV35LargeConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"sd-3-5-large"`. */
  model_id?: 'sd-3-5-large';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Default: `""`. */
  negative_prompt?: string;
  /** Default: `28`. */
  num_inference_steps?: number;
  /** Default: `7.5`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for Stable Diffusion XL (`POST /v1/stable_diffusion_xl/generate`). Generate an image with Stable Diffusion XL. */
export interface StableDiffusionXlConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"6A35A7855770AE9820A3C931D4964C3817B6D9E3C6F9C4DABB5B3A94E5643B80"`. */
  model_id?: '6A35A7855770AE9820A3C931D4964C3817B6D9E3C6F9C4DABB5B3A94E5643B80';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Default: `""`. */
  negative_prompt?: string;
  /** Default: `30`. */
  num_inference_steps?: number;
  /** Default: `7`. */
  guidance_scale?: number;
  /** Default: `"v1"`. */
  prompt_embed_version?: string;
  [key: string]: unknown;
}

/** The config for Z-Image (`POST /v1/z_image/generate`). Generate an image with Z-Image. */
export interface ZImageConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"z-image-turbo"`. */
  model_id?: 'z-image-turbo';
  /** Aspect ratio as `W:H`. Default: `"4:5"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"1k"`. */
  resolution?: '1k' | '2k';
  /** Default: `9`. */
  num_inference_steps?: number;
  /** Default: `0`. */
  guidance_scale?: number;
  [key: string]: unknown;
}

/** The config for Berry (`POST /v1/berry/generate`). Generate a video with Berry. */
export interface BerryConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"berry-2"`. */
  model_id?: 'berry' | 'berry-2';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '4:5' | '5:4';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '720p' | '1080p' | '480p';
  /** Clip length in seconds, as a token. Default: `"3"`. */
  duration?:
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** The source video. An https URL or a data URL. */
  video?: string;
  [key: string]: unknown;
}

/** The config for Blueberry (`POST /v1/blueberry/generate`). Generate a video with Blueberry. */
export interface BlueberryConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"blueberry-v2"`. */
  model_id?: 'blueberry' | 'blueberry-v2';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  /** Output resolution token. Default: `"720p"`. */
  resolution?: '720p' | '1080p';
  /** Clip length in seconds, as a token. Default: `"4"`. */
  duration?:
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The last frame image. An https URL or a data URL. */
  last_image?: string;
  /** Default: `"single"`. */
  shot_type?: string;
  /** Default: `false`. */
  prompt_extend?: boolean;
  /** Default: `true`. */
  audio?: boolean;
  [key: string]: unknown;
}

/** The config for Cherry (`POST /v1/cherry/generate`). Generate a video with Cherry. */
export interface CherryConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"cherry-2-pro"`. */
  model_id?: 'cherry-mini' | 'cherry' | 'cherry-pro' | 'cherry-2-pro';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '480p' | '720p' | '1080p' | '4k';
  /** Clip length in seconds, as a token. Default: `"4"`. */
  duration?: '4' | '5' | '8' | '10' | '15' | '20' | '25' | '30';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** The source videos. Each an https URL or a data URL. */
  videos?: string[];
  /** Default: `true`. */
  use_character_voices?: boolean;
  [key: string]: unknown;
}

/** The config for Grok Video (`POST /v1/grok_video/generate`). Generate a video with Grok Video. */
export interface GrokVideoConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"grok-imagine-video"`. */
  model_id?: 'grok-imagine-video';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '480p' | '720p';
  /** Clip length in seconds, as a token. Default: `"5"`. */
  duration?:
    | '1'
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** The source video. An https URL or a data URL. */
  video?: string;
  [key: string]: unknown;
}

/** The config for Kiwi (`POST /v1/kiwi/generate`). Generate a video with Kiwi. */
export interface KiwiConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"kiwi"`. */
  model_id?: 'kiwi';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '480p' | '720p' | '1080p';
  /** Clip length in seconds, as a token. Default: `"5"`. */
  duration?: '5' | '10';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  [key: string]: unknown;
}

/** The config for Lemon (`POST /v1/lemon/generate`). Generate a video with Lemon. */
export interface LemonConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"lemon"`. */
  model_id?: 'lemon';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '480p' | '720p' | '1080p';
  /** Clip length in seconds, as a token. Default: `"3"`. */
  duration?:
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15'
    | '16'
    | '17'
    | '18'
    | '19'
    | '20'
    | '21'
    | '22'
    | '23'
    | '24'
    | '25'
    | '26'
    | '27'
    | '28'
    | '29'
    | '30';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The last frame image. An https URL or a data URL. */
  last_image?: string;
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** The source videos. Each an https URL or a data URL. */
  videos?: string[];
  /** Default: `true`. */
  audio?: boolean;
  /** Default: `false`. */
  prompt_extend?: boolean;
  /** Default: `true`. */
  use_character_voices?: boolean;
  [key: string]: unknown;
}

/** The config for LTX Video (`POST /v1/ltx_video/generate`). Generate a video with LTX Video. */
export interface LtxVideoConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"ltx-video-096-distilled"`. */
  model_id?: 'ltx-video-096-distilled' | 'ltx-video-096-dev';
  /** Aspect ratio as `W:H`. Default: `"3:2"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '240p' | '360p' | '480p' | '720p';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** Default: `"worst quality, inconsistent motion, blurry, jittery, distorted"`. */
  negative_prompt?: string;
  /** Default: `8`. */
  num_inference_steps?: number;
  /** Default: `3`. */
  guidance_scale?: number;
  /** Default: `0.05`. */
  decode_timestep?: number;
  /** Default: `0.025`. */
  decode_noise_scale?: number;
  /** Default: `true`. */
  prompt_enhance?: boolean;
  [key: string]: unknown;
}

/** The config for Melon (`POST /v1/melon/generate`). Generate a video with Melon. */
export interface MelonConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"melon"`. */
  model_id?: 'melon' | 'melon-pro';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '3:4' | '4:3';
  /** Output resolution token. Default: `"540p"`. */
  resolution?: '540p' | '720p' | '1080p';
  /** Clip length in seconds, as a token. Default: `"4"`. */
  duration?: '3' | '4' | '5' | '6' | '8' | '10' | '16';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The last frame image. An https URL or a data URL. */
  last_image?: string;
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `false`. */
  generate_audio?: boolean;
  [key: string]: unknown;
}

/** The config for MiniMax-H3 (`POST /v1/minimax_h3/generate`). Generate a video with MiniMax-H3. */
export interface MinimaxH3Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"minimax-h3-turbo"`. */
  model_id?: 'minimax-h3-turbo' | 'minimax-h3';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"480p"`. */
  resolution?: '480p' | '544p' | '720p' | '768p';
  /** Clip length in seconds, as a token. Default: `"5"`. */
  duration?:
    '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The last frame image. An https URL or a data URL. */
  last_image?: string;
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** The source videos. Each an https URL or a data URL. */
  videos?: string[];
  /** Default: `true`. */
  use_character_voices?: boolean;
  [key: string]: unknown;
}

/** The config for Plum (`POST /v1/plum/generate`). Generate a video with Plum. */
export interface PlumConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"plum-max"`. */
  model_id?: 'plum' | 'plum-max';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | '21:9';
  /** Output resolution token. Default: `"480P"`. */
  resolution?: '768P' | '2K' | '480P';
  /** Clip length in seconds, as a token. Default: `"5"`. */
  duration?:
    '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14' | '15';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The last frame image. An https URL or a data URL. */
  last_image?: string;
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** The source videos. Each an https URL or a data URL. */
  videos?: string[];
  /** Default: `true`. */
  use_character_voices?: boolean;
  [key: string]: unknown;
}

/** The config for Raspberry (`POST /v1/raspberry/generate`). Generate a video with Raspberry. */
export interface RaspberryConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"raspberry"`. */
  model_id?: 'raspberry';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  /** Output resolution token. Default: `"720p"`. */
  resolution?: '720p' | '1080p';
  /** Clip length in seconds, as a token. Default: `"4"`. */
  duration?:
    | '2'
    | '3'
    | '4'
    | '5'
    | '6'
    | '7'
    | '8'
    | '9'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Additional reference images. Each an https URL or a data URL. */
  additional_images?: string[];
  /** Default: `true`. */
  use_character_voices?: boolean;
  [key: string]: unknown;
}

/** The config for Wan Video v2.2 (`POST /v1/wan_22/generate`). Generate a video with Wan Video v2.2. */
export interface Wan22Config {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"wan22-video"`. */
  model_id?: 'wan22-video' | 'wan22-video-lightning';
  /** Aspect ratio as `W:H`. Default: `"16:9"`. */
  aspect_ratio?:
    '21:9' | '16:9' | '3:2' | '5:4' | '1:1' | '4:5' | '2:3' | '9:16' | '9:21';
  /** Output resolution token. Default: `"240p"`. */
  resolution?: '240p' | '360p' | '480p' | '720p';
  /** The first frame image. An https URL or a data URL. */
  first_image?: string;
  /** Default: `""`. */
  negative_prompt?: string;
  /** Default: `15`. */
  num_inference_steps?: number;
  /** Default: `4`. */
  guidance_scale?: number;
  /** Default: `12`. */
  flow_shift?: number;
  /** Default: `81`. */
  num_frames?: number;
  [key: string]: unknown;
}

/** The config for Seed Audio (`POST /v1/seed_audio/generate`). Generate audio with Seed Audio. */
export interface SeedAudioConfig {
  /** The text prompt. */
  prompt: string;
  /** Integer seed for reproducible output; omit or send null for a random seed. */
  seed?: number | null;
  /** The model variant to generate with. Default: `"seed-audio-1.0"`. */
  model_id?: 'seed-audio-1.0';
  /** Clip length in seconds, as a token. Default: `"5"`. */
  duration?: '5' | '10' | '30' | '60' | '120';
  /** The reference image. An https URL or a data URL. */
  image?: string;
  /** Default: `48000`. */
  sample_rate?: number;
  /** Default: `0`. */
  speech_rate?: number;
  /** Default: `0`. */
  loudness_rate?: number;
  /** Default: `0`. */
  pitch_rate?: number;
  [key: string]: unknown;
}

/** Each architecture's config, keyed by the id in its endpoint path. */
export interface ArchitectureConfigs {
  anima: AnimaConfig;
  chroma: ChromaConfig;
  flux2: Flux2Config;
  gpt_image_2: GptImage2Config;
  grok_image: GrokImageConfig;
  guava: GuavaConfig;
  hidream: HidreamConfig;
  krea_2: Krea2Config;
  mango: MangoConfig;
  nano_banana_v2: NanoBananaV2Config;
  sdxl_plus: SdxlPlusConfig;
  stable_diffusion_v15: StableDiffusionV15Config;
  stable_diffusion_v35_large: StableDiffusionV35LargeConfig;
  stable_diffusion_xl: StableDiffusionXlConfig;
  z_image: ZImageConfig;
  berry: BerryConfig;
  blueberry: BlueberryConfig;
  cherry: CherryConfig;
  grok_video: GrokVideoConfig;
  kiwi: KiwiConfig;
  lemon: LemonConfig;
  ltx_video: LtxVideoConfig;
  melon: MelonConfig;
  minimax_h3: MinimaxH3Config;
  plum: PlumConfig;
  raspberry: RaspberryConfig;
  wan_22: Wan22Config;
  seed_audio: SeedAudioConfig;
}

/** The id of an architecture this version of the SDK knows. */
export type ArchitectureId = keyof ArchitectureConfigs;

/** The architectures in the API reference this SDK was generated from. */
export const ARCHITECTURES = {
  anima: { name: 'Anima', type: 'image' },
  chroma: { name: 'Chroma', type: 'image' },
  flux2: { name: 'Flux 2', type: 'image' },
  gpt_image_2: { name: 'GPT Image 2', type: 'image' },
  grok_image: { name: 'Grok Image', type: 'image' },
  guava: { name: 'Guava', type: 'image' },
  hidream: { name: 'HiDream', type: 'image' },
  krea_2: { name: 'Krea 2', type: 'image' },
  mango: { name: 'Mango', type: 'image' },
  nano_banana_v2: { name: 'Nano Banana 2', type: 'image' },
  sdxl_plus: { name: 'SDXL Plus', type: 'image' },
  stable_diffusion_v15: { name: 'Stable Diffusion v1.5', type: 'image' },
  stable_diffusion_v35_large: {
    name: 'Stable Diffusion v3.5 Large',
    type: 'image',
  },
  stable_diffusion_xl: { name: 'Stable Diffusion XL', type: 'image' },
  z_image: { name: 'Z-Image', type: 'image' },
  berry: { name: 'Berry', type: 'video' },
  blueberry: { name: 'Blueberry', type: 'video' },
  cherry: { name: 'Cherry', type: 'video' },
  grok_video: { name: 'Grok Video', type: 'video' },
  kiwi: { name: 'Kiwi', type: 'video' },
  lemon: { name: 'Lemon', type: 'video' },
  ltx_video: { name: 'LTX Video', type: 'video' },
  melon: { name: 'Melon', type: 'video' },
  minimax_h3: { name: 'MiniMax-H3', type: 'video' },
  plum: { name: 'Plum', type: 'video' },
  raspberry: { name: 'Raspberry', type: 'video' },
  wan_22: { name: 'Wan Video v2.2', type: 'video' },
  seed_audio: { name: 'Seed Audio', type: 'audio' },
} as const;
