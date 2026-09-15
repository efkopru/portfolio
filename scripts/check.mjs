import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects, profile } from '../content/portfolio.mjs';
import { siteProjects, collections, unlistedProjectIds } from '../content/site-structure.mjs';
import { previewCompanionFiles } from '../content/preview-evidence.mjs';

const directory = process.argv[2] || 'dist';
assert.ok(['dist', 'dist-preview', 'dist-candidate'].includes(directory), 'Check only a known build output');
const root = fileURLToPath(new URL(`../${directory}/`, import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'build-manifest.json'), 'utf8'));
const alternate = ['preview', 'candidate'].includes(manifest.mode);
const pages = new Map(await Promise.all(manifest.pages.map(async page => [page, await readFile(resolve(root, page), 'utf8')])));
const roleIds = new Set(profile.roles.map(role => role.id));
assert.equal(new Set(projects.map(p => p.id)).size, projects.length, 'Duplicate project IDs');
assert.equal(manifest.projects, projects.length);
for (const p of projects) {
  assert.match(p.id, /^[a-z0-9-]+$/);
  for (const field of ['title', 'summary', 'context', 'problem', 'contribution', 'result', 'boundary']) assert.ok(p[field]?.trim(), `${p.id}: missing ${field}`);
  assert.ok(p.approach.length >= 2 && p.tools.length >= 1 && p.roles.length >= 1);
  assert.ok(p.roles.every(role => roleIds.has(role)), `${p.id}: unknown role`);
  for (const link of p.links) assert.equal(new URL(link.url).protocol, 'https:', `${p.id}: unsafe link`);
  for (const image of p.gallery) {
    assert.ok(image.caption.trim() && image.width > 0 && image.height > 0, `${p.id}: incomplete screenshot metadata`);
    assert.match(image.src, /^assets\/screenshots\/[a-z0-9-]+\.(png|jpg)$/);
    assert.ok(image.preview === image.src || /^assets\/screenshots\/[a-z0-9-]+-preview\.(png|jpg|webp)$/.test(image.preview), `${p.id}: invalid screenshot preview`);
  }
}
let checkedLinks = 0;
for (const [page, html] of pages) {
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${page}: one h1 required`);
  assert.equal((html.match(/<main(?:\s|>)/g) || []).length, 1, `${page}: one main required`);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<meta name="description" content="[^"]{20,}"/);
  assert.match(html, /Skip to content/);
  if (manifest.mode === 'preview' || alternate && unlistedProjectIds.has(page.split('/')[0])) {
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
    assert.ok(!html.includes('rel="canonical"'), `${page}: excluded pages must not declare a canonical`);
  } else if (alternate && page !== '404.html') {
    const route = page === 'index.html' ? '' : page.replace(/index\.html$/, '');
    assert.ok(html.includes(`<link rel="canonical" href="${manifest.origin}/${route}">`), `${page}: canonical must use configured origin`);
  }
  if (alternate) {
    const image = html.match(/<meta property="og:image" content="([^"]+)">/);
    assert.ok(image, `${page}: social preview required`);
    const imageUrl = new URL(image[1]);
    assert.equal(imageUrl.origin, manifest.origin);
    const imageBytes = await readFile(resolve(root, imageUrl.pathname.slice(1)));
    assert.equal(imageBytes.subarray(1, 4).toString(), 'PNG', `${page}: share cover must be a PNG`);
    assert.equal(imageBytes.readUInt32BE(16), 1200);
    assert.equal(imageBytes.readUInt32BE(20), 630);
  }
  assert.ok(!/data-copy-email|copy-status|print-button|window\.print\(/i.test(html), `${page}: removed control returned`);
  const tags = (html.match(/<[^>]+>/g) || []).map(tag => tag.replace(/"[^"]*"/g, '""')).join('');
  assert.ok(!/\sdownload(?:\s|=|>)/i.test(tags), `${page}: download control returned`);
  assert.ok(!/Message captured locally|Keep cancelling|cookie-banner|embed-preview|9\+ years|github\.com\/ekopru\//i.test(html), `${page}: stale content`);
  assert.ok(!/C:\\Users|OneDrive|LEGACY_AUDIT|api[_-]?key\s*[:=]/i.test(html), `${page}: internal data`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${page}: duplicate IDs`);
  const schema = html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
  assert.equal(JSON.parse(schema[1]).mainEntity.name, profile.name);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = new URL(raw.replaceAll('&amp;', '&'), `https://local.test/${page}`);
    if (url.origin !== 'https://local.test') continue;
    const path = decodeURIComponent(url.pathname).replace(/^\//, '');
    const target = path.endsWith('/') || !path ? `${path}index.html` : path;
    assert.ok((await stat(resolve(root, target))).isFile(), `${page}: missing ${target}`);
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = pages.get(target);
      assert.ok(targetHtml?.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `${page}: missing anchor ${target}${url.hash}`);
    }
    checkedLinks++;
  }
}
const originals = ['contact', 'resume', 'spatial-and-data-analysis', 'spatial-analysis', 'arcgis-enterprise-and-online', 'qgis', 'code-enforcement-violations', 'crime-analysis', 'ml-optimization', 'income-level-prediction-using-r', 'building-footprint-extraction', 'traveling-salesman', 'water-conservation-routes', 'development-and-etl', 'python-and-notebooks', 'sql-and-javascript-and-r', 'modelbuilder-and-arcmap-tool-in-vbnet', 'interactive-maps-a-custom-js-app', 'interactive-maps-experience-builder', 'doctoral-research'];
for (const slug of originals) assert.ok(pages.has(`${slug}/index.html`), `Lost original route ${slug}`);
for (const collection of collections) {
  for (const [id] of collection.entries) assert.ok(pages.has(`${id}/index.html`), `Missing original collection page ${id}`);
}
const allowed = new Set([...manifest.pages, ...[...siteProjects, ...(alternate ? projects : [])].flatMap(project => project.gallery.flatMap(image => [image.src, image.preview])), 'styles.css', 'script.js', 'theme.js', 'assets/efk-logo.avif', 'assets/gis-background.webp', 'sitemap.xml', 'robots.txt', '_headers', 'build-manifest.json', ...(alternate ? ['preview.css', ...previewCompanionFiles, ...['portfolio', 'utility-inspection-etl', 'accessibility-analysis', 'interactive-maps-a-custom-js-app'].map(name => `assets/social/${name}.png`)] : [])]);
if (alternate) {
  const sitemap = await readFile(resolve(root, 'sitemap.xml'), 'utf8');
  for (const id of unlistedProjectIds) assert.ok(!sitemap.includes(`/${id}/`), `${id}: excluded project leaked into sitemap`);
  if (manifest.mode === 'preview') assert.ok(!sitemap.includes('<loc>'), 'Review sitemap must contain no discoverable URLs');
}
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else assert.ok(allowed.has(relative(root, file).split(sep).join('/')), `Unreviewed file in publication output: ${file}`);
  }
}
await walk(root);
console.log(`PASS: ${pages.size} pages, ${projects.length} complete projects, ${checkedLinks} local links/assets, all 20 original routes, and publication allowlist.`);
