// Import only the reviewed synthetic V3 release. Never point this at a real review file.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-workbench-demo.mjs <synthetic-review.html>');
const sourceBytes = await readFile(sourcePath);
// Git checkouts may use CRLF on Windows and LF on the deployment host.
// Canonical LF keeps the public assets and their version tokens platform-independent.
const source = sourceBytes.toString('utf8').replace(/\r\n?/g, '\n');
const datasetMatch = source.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/);
const styles = source.match(/<style>([\s\S]*?)<\/style>/g);
const scripts = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!source.includes('Synthetic demonstration') || !datasetMatch || styles?.length !== 1 || scripts.length !== 1) {
  throw new Error('Expected the reviewed synthetic release format with one style and one executable script.');
}
const dataset = JSON.parse(datasetMatch[1]);
if (dataset.schema_version !== '3.0' || dataset.records.length !== 99 || !dataset.records.every(record => /^asset_[a-f0-9]{16}$/.test(record.asset_id) && /^source_[a-f0-9]{16}$/.test(record.source_id))) {
  throw new Error('Dataset does not match the reviewed 99-record synthetic release. Audit a new release before publishing it.');
}
const directory = resolve(fileURLToPath(new URL('../', import.meta.url)), 'assets/demos/lead-service-line-workbench');
await mkdir(directory, { recursive: true });
const stylesheet = styles[0].replace(/^<style>|<\/style>$/g, '') + '\n.portfolio-note{padding:12px 4vw;background:#e7f1ed;color:#173f3b;font-size:13px}.portfolio-note a{color:inherit;font-weight:700}.portfolio-note p{margin:5px 0 0}\n';
const javascript = scripts[0][1];
const cssHash = createHash('sha256').update(stylesheet).digest('hex').slice(0, 12);
const jsHash = createHash('sha256').update(javascript).digest('hex').slice(0, 12);
const policy = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'";
let html = source
  .replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, `<meta http-equiv="Content-Security-Policy" content="${policy}">`)
  .replace(styles[0], `<link rel="stylesheet" href="./review.css?v=${cssHash}">`)
  .replace(scripts[0][0], `<script src="./review.js?v=${jsHash}"></script>`)
  .replace('<body>', '<body><aside class="portfolio-note"><a href="../../../lead-service-line-evidence-workbench/index.html">Back to the case study</a><p>Synthetic interactive demonstration. Use invented reviewer IDs and notes. Decisions stay in this tab until exported; they are not submitted to a server.</p></aside>')
  .replace('This page makes no network requests.', 'This demonstration loads only its local page assets; review decisions are not sent over the network.');
if (/\sstyle=|\son\w+=/.test(html) || /<style>|<script>/.test(html)) throw new Error('Executable inline content remains in the public demo.');
await writeFile(resolve(directory, 'index.html'), html);
await writeFile(resolve(directory, 'review.css'), stylesheet);
await writeFile(resolve(directory, 'review.js'), javascript);
await writeFile(resolve(directory, 'provenance.json'), JSON.stringify({
  release: '0.3.0', disclosure: 'Invented synthetic records only. Not utility field performance.',
  source_sha256: createHash('sha256').update(sourceBytes).digest('hex'),
  source_normalized_sha256: createHash('sha256').update(source).digest('hex'),
  dataset_id: dataset.dataset_id, schema_version: dataset.schema_version, work_plan_records: dataset.records.length,
  adaptations: ['External same-origin stylesheet and executable script for portfolio CSP compatibility.', 'Canonical LF line endings for stable asset-version hashes across checkouts.', 'Public synthetic-demo notice and relative return link.']
}, null, 2) + '\n');
console.log(`Imported ${dataset.records.length} reviewed synthetic work-plan records with external scripts and styles.`);
