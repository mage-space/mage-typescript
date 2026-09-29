// Type-level checks, compiled by `npm run typecheck` and never run.
import Mage from '../src/index.js';

declare const mage: Mage;
declare const someArchitecture: string;

// A known architecture checks its own config.
void mage.generate('mango', { prompt: 'a', aspect_ratio: '4:5' });
// @ts-expect-error: not one of Mango's aspect ratios
void mage.generate('mango', { prompt: 'a', aspect_ratio: '7:3' });
// @ts-expect-error: every config needs a prompt
void mage.generate('cherry', { duration: '5' });
// Unknown fields pass through to the model.
void mage.generate('mango', { prompt: 'a', novel_field: true });

// An architecture newer than the SDK takes the shared config.
void mage.generate('future_model', { prompt: 'a', anything: 1 });
void mage.generate(someArchitecture, { prompt: 'a' });

// run resolves to a request whose result is present.
void mage.run('mango', { prompt: 'a' }).then((request) => request.result.url);
