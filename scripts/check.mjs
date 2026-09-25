import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects, profile } from '../content/portfolio.mjs';
import { siteProjects, collections } from '../content/site-structure.mjs';
import { evidenceAssets } from '../content/evidence.mjs';
import { socialCards } from './social-cards.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'build-manifest.json'), 'utf8'));
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
const allowed = new Set([...manifest.pages, ...siteProjects.flatMap(project => project.gallery.flatMap(image => [image.src, image.preview])), ...evidenceAssets, ...socialCards.map(card => `assets/social/${card.Name}.png`), 'styles.css', 'script.js', 'theme.js', 'assets/efk-logo.avif', 'assets/gis-background.webp', 'sitemap.xml', 'robots.txt', '_headers', '.htaccess', 'build-manifest.json']);
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(file);
    else assert.ok(allowed.has(relative(root, file).split(sep).join('/')), `Unreviewed file in publication output: ${file}`);
  }
}
await walk(root);
console.log(`PASS: ${pages.size} pages, ${projects.length} complete projects, ${checkedLinks} local links/assets, all 20 original routes, and publication allowlist.`);
