import { Mage } from './client.js';

export {
  Mage,
  type CompletedGenerationRequest,
  type ConfigFor,
  type GenerateOptions,
  type MageOptions,
  type RunOptions,
} from './client.js';
export type { CallOptions } from './core.js';
export {
  MageAPIError,
  MageConnectionError,
  MageError,
  MageGenerationError,
  MageTimeoutError,
} from './errors.js';
export * from './generated/types.js';
export type { ListParams } from './resources/library.js';
export { isFinal, type WaitOptions } from './resources/requests.js';
export type { UploadContentType, UploadOptions } from './resources/uploads.js';
export { VERSION } from './version.js';

export default Mage;
