// Runs one real generation against the Mage API with MAGE_API_KEY: the
// cheapest image model at its default settings. Spends gems. Build first.
import Mage from '../dist/index.js';

const mage = new Mage();

const { gems } = await mage.account.get();
console.log(`Balance: ${gems.balance} gems`);

const { architectures } = await mage.architectures.list();
const [cheapest] = architectures
  .filter((architecture) => architecture.type === 'image')
  .sort((a, b) => a.gems - b.gems);
if (!cheapest) throw new Error('The catalog lists no image architecture.');
console.log(`Running ${cheapest.id} (${cheapest.gems} gems)`);

const request = await mage.run(
  cheapest.id,
  { prompt: 'A small red cube on a white table, soft studio light' },
  { timeout: 10 * 60_000 },
);
const download = await fetch(request.result.url);
if (!download.ok) {
  throw new Error(
    `Downloading ${request.result.url} answered ${download.status}.`,
  );
}
console.log(
  `Completed ${request.request_id} for ${request.billing.gems_charged} gems: ${request.result.url}`,
);
