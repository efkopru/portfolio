import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const blockAfter = (text, pattern) => {
  const match = pattern.exec(text);
  assert.ok(match, `Missing CSS block: ${pattern}`);
  const start = text.indexOf('{', match.index);
  let depth = 1;
  for (let index = start + 1; index < text.length; index++) {
    if (text[index] === '{') depth++;
    if (text[index] === '}' && --depth === 0) return text.slice(start + 1, index);
  }
  assert.fail(`Unclosed CSS block: ${pattern}`);
};
const declarations = (css, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return blockAfter(css, new RegExp(`${escaped}\\s*\\{`));
};

test('header CSS and JavaScript share a 1320px desktop breakpoint with evenly distributed navigation', async () => {
  const [css, script] = await Promise.all([source('styles.css'), source('script.js')]);
  const breakpoint = script.match(/const desktopNavigation\s*=\s*window\.matchMedia\(['"]\(min-width:\s*(\d+)px\)['"]\)/)?.[1];
  assert.equal(breakpoint, '1320');
  const desktop = blockAfter(css, new RegExp(`@media\\s*\\(min-width:\\s*${breakpoint}px\\)\\s*\\{`));
  const mobile = blockAfter(css, new RegExp(`@media\\s*\\(max-width:\\s*${Number(breakpoint) - 1}px\\)\\s*\\{`));
  const nav = declarations(desktop, '.site-nav');
  for (const rule of [/\bflex:\s*1\s*(?:;|$)/, /\bflex-wrap:\s*nowrap\s*(?:;|$)/, /\bjustify-content:\s*space-between\s*(?:;|$)/, /\bgap:\s*1\.25rem\s*(?:;|$)/, /\bmargin-inline-start:\s*0\s*(?:;|$)/]) {
    assert.match(nav, rule);
  }
  assert.doesNotMatch(desktop, /(?:^|[^\d.])5%/, 'Desktop header no longer reserves a percentage spacer');
  assert.match(declarations(desktop, '.menu-toggle'), /\bdisplay:\s*none\s*!important/);
  assert.match(declarations(mobile, '.site-nav'), /\bflex-direction:\s*column\s*(?:;|$)/);
  assert.match(declarations(mobile, '.js .site-nav:not(.open)'), /\bdisplay:\s*none\s*(?:;|$)/);
  assert.match(script, /desktopNavigation\.addEventListener\(['"]change['"],\s*closeMenu\)/);
  assert.equal(css, await source('dist/styles.css'));
  assert.equal(script, await source('dist/script.js'));
});

test('compact homepage wrappers retain introduction, skills, actions and project section order', async () => {
  for (const path of ['index.html', 'dist/index.html']) {
    const html = await source(path);
    const intro = html.match(/<section\b[^>]*class="[^"]*\bhome-intro\b[^"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(intro, `${path}: introduction is present`);
    const copy = intro.match(/<div class="intro-copy">([\s\S]*?)<\/div>/);
    assert.ok(copy, `${path}: copy is grouped separately from links`);
    assert.ok(copy[1].includes('<h1>Esad Kopru</h1>'));
    assert.ok(copy[1].includes('<p class="home-specialty">Geospatial data science, data engineering &amp; software engineering</p>'));
    assert.ok(copy[1].includes('<p>10+ years building GIS systems, analytical models, and automated data pipelines that turn location information into decisions.</p>'));
    const linksIndex = intro.indexOf('<div class="intro-links">');
    assert.ok(linksIndex >= copy.index + copy[0].length, `${path}: links follow introductory copy`);
    const links = intro.slice(linksIndex);
    const skills = links.match(/<ul\b[^>]*aria-label="Selected skills"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
    assert.ok(skills, `${path}: skills remain within the link column`);
    assert.deepEqual([...skills.matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1]), ['Python', 'SQL', 'Machine learning', 'ETL pipelines']);
    const actions = links.match(/<div class="home-actions">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(actions, `${path}: action links remain grouped`);
    assert.deepEqual([...actions.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => [match[1], match[2]]), [['#selected-work', 'Selected work'], ['#projects', 'All projects']]);
    const heading = html.match(/<div class="selected-work-heading">([\s\S]*?)<\/div>/);
    assert.ok(heading, `${path}: selected work has its compact heading wrapper`);
    assert.ok(heading[1].includes('<h2 id="selected-heading">Selected work</h2>'));
    assert.ok(heading[1].includes('Three projects across geospatial analysis, data delivery, and public-facing software.'));
    const positions = [html.indexOf('<section class="home-intro'), html.indexOf('id="selected-work"'), heading.index, html.indexOf('class="featured-grid"'), html.indexOf('class="shell library-heading"'), html.indexOf('id="projects"')];
    assert.ok(positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1])), `${path}: intro, selected work, and full project collections remain in order`);
    const cards = [...html.matchAll(/<article class="featured-card">([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, 3);
    for (const [index, card] of cards.entries()) {
      const content = card[1].match(/<div class="featured-body">([\s\S]*?)<\/div>/)?.[1];
      assert.ok(content, `${path}: featured card ${index + 1} has one content body`);
      const title = content.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/);
      const workflow = content.match(/<ol\b[^>]*class="[^"]*\bfeatured-flow\b[^"]*"[^>]*>/);
      assert.ok(title && workflow, `${path}: title and workflow both belong to the featured body`);
      assert.ok(workflow.index >= title.index + title[0].length, `${path}: featured card ${index + 1} presents its title before its workflow`);
    }
  }
});
