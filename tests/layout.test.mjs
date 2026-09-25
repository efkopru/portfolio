import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { featuredWork } from '../content/evidence.mjs';
import { projects } from '../content/portfolio.mjs';

const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
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

test('header keeps its logo position and shows full navigation from 1140px, including 1280px laptops', async () => {
  const [css, script] = await Promise.all([source('styles.css'), source('script.js')]);
  const breakpoint = script.match(/const desktopNavigation\s*=\s*window\.matchMedia\(['"]\(min-width:\s*(\d+)px\)['"]\)/)?.[1];
  assert.equal(breakpoint, '1140');
  const desktop = blockAfter(css, new RegExp(`@media\\s*\\(min-width:\\s*${breakpoint}px\\)\\s*\\{`));
  const mobile = blockAfter(css, new RegExp(`@media\\s*\\(max-width:\\s*${Number(breakpoint) - 1}px\\)\\s*\\{`));
  const nav = declarations(desktop, '.site-nav');
  for (const rule of [/\bflex:\s*1\s*(?:;|$)/, /\bflex-wrap:\s*nowrap\s*(?:;|$)/, /\bjustify-content:\s*flex-start\s*(?:;|$)/, /\bgap:\s*0\s*(?:;|$)/, /\bmargin-inline-start:\s*0\s*(?:;|$)/]) {
    assert.match(nav, rule);
  }
  const header = declarations(desktop, '.header-inner');
  assert.match(header, /\bwidth:\s*min\(1440px,\s*calc\(100%\s*-\s*3rem\)\)\s*(?:;|$)/, 'Header width and horizontal position stay unchanged');
  assert.match(header, /\bgap:\s*2rem\s*(?:;|$)/, 'Logo-to-navigation gap stays unchanged');
  assert.match(header, /\bjustify-content:\s*flex-start\s*(?:;|$)/);
  assert.match(declarations(css, '.brand'), /\bflex-shrink:\s*0\s*(?:;|$)/);
  assert.match(declarations(desktop, '.site-nav>:not(:last-child)'), /\bflex:\s*3\s+0\s+auto\s*(?:;|$)/);
  assert.match(declarations(desktop, '.site-nav>:not(:last-child)'), /\bpadding-inline-end:\s*\.9375rem\s*(?:;|$)/);
  assert.match(declarations(desktop, '.site-nav>:last-child'), /\bflex:\s*0\s+0\s+auto\s*(?:;|$)/);
  const tail = declarations(desktop, '.site-nav::after');
  assert.match(tail, /\bcontent:\s*["']["']\s*(?:;|$)/);
  assert.match(tail, /\bflex:\s*7\s+0\s+2\.1875rem\s*(?:;|$)/);
  assert.match(tail, /\bpointer-events:\s*none\s*(?:;|$)/);
  assert.doesNotMatch(desktop, /(?:^|[^\d.])5%/, 'Desktop header no longer reserves a percentage spacer');
  assert.match(declarations(desktop, '.menu-toggle'), /\bdisplay:\s*none\s*!important/);
  const mobileNav = declarations(mobile, '.site-nav');
  assert.match(mobileNav, /\bflex-direction:\s*column\s*(?:;|$)/);
  assert.match(mobileNav, /\bgap:\s*\.2rem\s*(?:;|$)/, 'Mobile menu spacing remains unchanged');
  assert.match(mobileNav, /\bpadding-top:\s*1rem\s*(?:;|$)/);
  assert.doesNotMatch(mobile, /\.site-nav::after|\.site-nav>:(?:not\(:last-child\)|last-child)/, 'Compact horizontal distribution is desktop-only');
  assert.match(declarations(mobile, '.js .site-nav:not(.open)'), /\bdisplay:\s*none\s*(?:;|$)/);
  assert.match(script, /desktopNavigation\.addEventListener\(['"]change['"],\s*closeMenu\)/);
  assert.equal(css, await source('dist/styles.css'));
  assert.equal(script, await source('dist/script.js'));
});

test('desktop navigation fits at its breakpoint beside a classic scrollbar', async () => {
  const [css, script] = await Promise.all([source('styles.css'), source('script.js')]);
  const breakpoint = Number(script.match(/const desktopNavigation\s*=\s*window\.matchMedia\(['"]\(min-width:\s*(\d+)px\)['"]\)/)?.[1]);
  const desktop = blockAfter(css, new RegExp(`@media\\s*\\(min-width:\\s*${breakpoint}px\\)\\s*\\{`));
  const rootSize = 16;
  const scrollbar = 17;
  // Measured in Chromium with the Arial fallback: seven titles and three disclosure buttons, without spacing.
  const measuredItems = 814;
  const padding = Number(declarations(desktop, '.site-nav>:not(:last-child)').match(/\bpadding-inline-end:\s*([\d.]+)rem/)?.[1]) * rootSize;
  const tailBasis = Number(declarations(desktop, '.site-nav--main-only::after').match(/\bflex:\s*[\d.]+\s+0\s+([\d.]+)rem/)?.[1]) * rootSize;
  const available = Math.min(1440, breakpoint - scrollbar - 3 * rootSize) - 101 - 2 * rootSize;
  assert.ok(available >= measuredItems + 6 * padding + tailBasis, `Navigation needs ${measuredItems + 6 * padding + tailBasis}px but has ${available}px at ${breakpoint}px`);
  assert.ok(breakpoint <= 1280, 'Common 1280px laptop windows show the full desktop navigation');
});

test('desktop spacing distribution uses seven top-level items when Additional projects is empty', async () => {
  for (const path of ['index.html', 'dist/index.html', 'resume/index.html', 'dist/resume/index.html']) {
    const html = await source(path);
    assert.match(html, /<a class="brand"[^>]*><img[^>]*width="101" height="48"/, `${path}: logo dimensions stay unchanged`);
    const navigation = html.match(/<nav\b[^>]*id="site-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(navigation, `${path}: main navigation exists`);
    assert.match(html, /<nav\b[^>]*id="site-nav"[^>]*class="site-nav site-nav--main-only"/, `${path}: seven-item spacing is scoped to the main-only navigation`);
    // Only links and divs can contain further links/divs in this navigation.
    const topLevel = [];
    let depth = 0;
    for (const token of navigation.matchAll(/<(\/?)(a|div)\b([^>]*)>/g)) {
      if (token[1]) depth--;
      else {
        if (depth === 0) topLevel.push({ tag: token[2], attributes: token[3] });
        depth++;
      }
      assert.ok(depth >= 0, `${path}: navigation markup is balanced`);
    }
    assert.equal(depth, 0);
    assert.equal(topLevel.length, 7, `${path}: the empty Additional projects item is omitted`);
    assert.deepEqual(topLevel.map(item => item.tag), ['a', 'a', 'a', 'div', 'div', 'div', 'a']);
    assert.match(topLevel[0].attributes, /href="(?:\.\/|\.\.\/)index\.html"/);
    assert.match(topLevel[6].attributes, /href="(?:\.\/|\.\.\/)doctoral-research\/index\.html"/);
  }
});

test('desktop flex distribution makes each visible gap exactly 75 percent of its previous size', async () => {
  const css = await source('styles.css');
  const desktop = blockAfter(css, /@media\s*\(min-width:\s*1140px\)\s*\{/);
  const item = declarations(desktop, '.site-nav>:not(:last-child)');
  const itemGrow = Number(item.match(/\bflex:\s*([\d.]+)\s+0\s+auto/)?.[1]);
  const itemPaddingRem = Number(item.match(/\bpadding-inline-end:\s*([\d.]+)rem/)?.[1]);
  for (const [selector, gaps] of [['.site-nav::after', 7], ['.site-nav--main-only::after', 6]]) {
    const tail = declarations(desktop, selector);
    const tailFlex = tail.match(/\bflex:\s*([\d.]+)\s+0\s+([\d.]+)rem/);
    const tailGrow = Number(tailFlex?.[1]);
    const tailBasisRem = Number(tailFlex?.[2]);
    assert.equal(tailGrow, gaps, `${selector}: trailing flex scales with the visible gaps`);
    for (const rootSize of [16, 18, 20]) {
      const oldMinimumGap = 1.25 * rootSize;
      const padding = itemPaddingRem * rootSize;
      const tailBasis = tailBasisRem * rootSize;
      assert.equal(gaps * padding + tailBasis, gaps * oldMinimumGap, 'Compacting titles preserves the minimum total navigation width');
      for (const viewport of [1140, 1280, 1320, 1440, 1600, 1920]) {
        const navWidth = Math.min(1440, viewport - 3 * rootSize) - 101 - 2 * rootSize;
        for (const intrinsicWidth of [860, 960, 1060]) {
          const oldGap = Math.max(oldMinimumGap, (navWidth - intrinsicWidth) / gaps);
          const surplus = Math.max(0, navWidth - intrinsicWidth - gaps * padding - tailBasis);
          const compactGap = padding + surplus * itemGrow / (gaps * itemGrow + tailGrow);
          assert.ok(Math.abs(compactGap - oldGap * .75) < 1e-10, `${selector}, viewport ${viewport}, intrinsic width ${intrinsicWidth}, root size ${rootSize}: every gap is reduced by 25 percent`);
        }
      }
    }
  }
});

test('compact homepage wrappers retain introduction, skills, actions and project section order', async () => {
  for (const path of ['index.html', 'dist/index.html']) {
    const html = await source(path);
    const intro = html.match(/<section\b[^>]*class="[^"]*\bhome-intro\b[^"]*"[^>]*>([\s\S]*?)<\/section>/)?.[1];
    assert.ok(intro, `${path}: introduction is present`);
    const copy = intro.match(/<div class="intro-copy">([\s\S]*?)<\/div>/);
    assert.ok(copy, `${path}: copy is grouped separately from links`);
    assert.ok(copy[1].includes('<h1>Esad Kopru</h1>'));
    assert.ok(copy[1].includes('<p class="home-specialty">Geospatial data science, data engineering &amp; spatial analysis</p>'));
    assert.ok(copy[1].includes('<p>10+ years building GIS systems, analytical models, and automated data pipelines that turn location information into decisions.</p>'));
    const linksIndex = intro.indexOf('<div class="intro-links">');
    assert.ok(linksIndex >= copy.index + copy[0].length, `${path}: links follow introductory copy`);
    const links = intro.slice(linksIndex);
    const skills = links.match(/<ul\b[^>]*aria-label="Selected skills"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
    assert.ok(skills, `${path}: skills remain within the links group below the introductory copy`);
    assert.deepEqual([...skills.matchAll(/<li>([^<]+)<\/li>/g)].map(match => match[1]), ['Python', 'SQL', 'Machine learning', 'ETL pipelines', 'Spatial Optimization']);
    const actions = links.match(/<div class="home-actions">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(actions, `${path}: action links remain grouped`);
    assert.deepEqual([...actions.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => [match[1], match[2]]), [['#projects', 'All projects']]);
    assert.doesNotMatch(intro, /href="#selected-work"|\bproject-button\b|Highlighted work/, `${path}: highlighted-work CTA is removed from the introduction`);
    const heading = html.match(/<div class="selected-work-heading">([\s\S]*?)<\/div>/);
    assert.ok(heading, `${path}: selected work has its compact heading wrapper`);
    assert.ok(heading[1].includes('<h2 id="selected-heading">Highlighted work</h2>'));
    assert.equal((html.match(/id="selected-work"/g) || []).length, 1, `${path}: existing highlighted-work hash remains unique`);
    assert.equal((html.match(/id="selected-heading"/g) || []).length, 1, `${path}: existing heading ID remains unique`);
    assert.match(html, /<section\b[^>]*id="selected-work"[^>]*aria-labelledby="selected-heading"/);
    assert.doesNotMatch(intro + heading[1], />\s*Selected work\s*</, `${path}: visible action and heading use the updated label`);
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

test('homepage places plain skills and wrapping actions beneath the single-column introduction', async () => {
  const css = await source('styles.css');
  assert.match(declarations(css, '.home-intro.evidence-intro'), /\bdisplay:\s*grid\s*(?:;|$)/);
  assert.match(declarations(css, '.home-intro.evidence-intro'), /\bgrid-template-columns:\s*(?:1fr|minmax\(0,\s*1fr\))\s*(?:;|$)/);
  for (const rule of css.matchAll(/\.home-intro\.evidence-intro\s*\{([^}]*)\}/g)) {
    const columns = rule[1].match(/\bgrid-template-columns:\s*([^;]+)/)?.[1];
    if (columns !== undefined) assert.match(columns.trim(), /^(?:1fr|minmax\(0,\s*1fr\))$/, 'No responsive override restores a sidebar');
  }
  const keywords = declarations(css, '.home-keywords');
  assert.match(keywords, /\bdisplay:\s*flex\s*(?:;|$)/);
  assert.match(keywords, /\bjustify-content:\s*flex-start\s*(?:;|$)/);
  assert.match(keywords, /\bflex-wrap:\s*wrap\s*(?:;|$)/, 'Skills can wrap instead of overflowing on narrow screens');
  assert.match(declarations(css, '.home-actions'), /\bjustify-content:\s*flex-start\s*(?:;|$)/);
  const links = declarations(css, '.intro-links');
  assert.match(links, /\bdisplay:\s*flex\s*(?:;|$)/);
  assert.match(links, /\bflex-wrap:\s*wrap\s*(?:;|$)/, 'Skills and actions may wrap into additional rows on narrow screens');
  for (const rule of css.matchAll(/\.intro-links\s*\{([^}]*)\}/g)) {
    const direction = rule[1].match(/\bflex-direction:\s*([^;]+)/)?.[1];
    if (direction !== undefined) assert.equal(direction.trim(), 'row', 'Links use horizontal flow with wrapping, not a stacked sidebar');
  }
  const plainSkills = declarations(css, '.home-keywords li');
  for (const [property, allowed] of [
    ['border', /^(?:0|none)$/],
    ['border-radius', /^0$/],
    ['background', /^(?:transparent|none)$/],
    ['padding', /^0$/]
  ]) {
    const value = plainSkills.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1];
    if (value !== undefined) assert.match(value.trim(), allowed, `Skill ${property} does not recreate boxed badges`);
  }
  assert.equal(css, await source('dist/styles.css'));
});

test('homepage introduction uses available width without preventing natural text wrapping', async () => {
  const css = await source('styles.css');
  assert.match(declarations(css, '.intro-copy p'), /\bmax-width:\s*none\s*(?:;|$)/, 'The introductory paragraph has no artificial line-length cap');
  const paragraphRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(rule => rule[1].includes('.intro-copy'));
  assert.ok(paragraphRules.length > 0);
  for (const rule of paragraphRules) {
    const maxWidth = rule[2].match(/(?:^|;)\s*max-width\s*:\s*([^;]+)/)?.[1];
    if (maxWidth !== undefined) assert.equal(maxWidth.trim(), 'none', 'Responsive intro rules do not restore an artificial paragraph width cap');
    assert.doesNotMatch(rule[2], /(?:^|;)\s*(?:white-space|text-wrap)\s*:\s*(?:nowrap|pre)\s*(?:;|$)|(?:-webkit-)?line-clamp\s*:|text-overflow\s*:\s*ellipsis|(?:^|;)\s*overflow(?:-x|-y)?\s*:\s*(?:hidden|clip)/i, 'Intro copy wraps naturally instead of being clipped or forced onto one mobile line');
  }
});

test('highlighted-work category labels are larger and bolder than project titles without changing other page labels', async () => {
  const css = await source('styles.css');
  const category = declarations(css, '.featured-body .project-kind');
  const title = declarations(css, '.featured-body h3');
  const remSize = rule => Number(rule.match(/\bfont-size:\s*([\d.]+)rem\s*(?:;|$)/)?.[1]);
  const weight = rule => Number(rule.match(/\bfont-weight:\s*(\d+)\s*(?:;|$)/)?.[1]);
  assert.equal(remSize(category), 1.15, 'Featured category size stays unchanged');
  assert.equal(weight(category), 800, 'Featured categories use an extra-bold weight');
  assert.equal(remSize(title), .825, 'Project titles are 10 percent larger than their previous .75rem size');
  assert.ok(Math.abs(remSize(title) / .75 - 1.1) < 1e-12, 'Project title size increases by exactly 10 percent');
  assert.equal(weight(title), 600, 'Project titles stay visually secondary');
  assert.ok(remSize(category) > remSize(title), 'Featured categories remain larger than project titles');
  assert.ok(weight(category) > weight(title));
  for (const rule of [/\bline-height:\s*1\.3\s*(?:;|$)/, /\bletter-spacing:\s*0\s*(?:;|$)/, /\bcolor:\s*var\(--ink\)\s*(?:;|$)/, /\bmargin-bottom:\s*\.35rem\s*(?:;|$)/]) {
    assert.match(category, rule);
  }
  const globalCategory = declarations(css, '.project-kind');
  assert.equal(remSize(globalCategory), .8, 'Category labels outside highlighted work keep their original size');
  assert.equal(weight(globalCategory), 700, 'Category labels outside highlighted work keep their original weight');
  assert.match(globalCategory, /\bletter-spacing:\s*\.04em\s*(?:;|$)/);
  assert.match(globalCategory, /\bcolor:\s*var\(--muted\)\s*(?:;|$)/);
  assert.match(globalCategory, /\bmargin-bottom:\s*\.6rem\s*(?:;|$)/);
  for (const path of ['index.html', 'dist/index.html']) {
    const cards = [...(await source(path)).matchAll(/<article class="featured-card">([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, 3);
    assert.deepEqual(cards.map(card => card[1].match(/<p class="project-kind">([^<]+)<\/p>/)?.[1]), ['Data engineering', 'Data science', 'Software engineering']);
    for (const [index, card] of cards.entries()) {
      const item = featuredWork[index];
      const project = projects.find(project => project.id === item.id);
      assert.ok(card[1].includes(`<p class="project-kind">${esc(item.role)}</p><h3><a href="./${item.id}/index.html">${esc(project.title)}</a></h3>`), `${path}: categories remain above the unchanged linked project titles`);
    }
  }
  assert.equal(css, await source('dist/styles.css'));
});

test('highlighted-work SVG arrows use a fixed stroke without repositioning or bolding their labels', async () => {
  const css = await source('styles.css');
  const icon = declarations(css, '.featured-card .project-arrow');
  for (const rule of [/\bdisplay:\s*block\s*(?:;|$)/, /\bwidth:\s*1\.125rem\s*(?:;|$)/, /\bheight:\s*1\.125rem\s*(?:;|$)/, /\bflex-shrink:\s*0\s*(?:;|$)/, /\bfill:\s*none\s*(?:;|$)/, /\bstroke:\s*currentColor\s*(?:;|$)/, /\bstroke-width:\s*3\s*(?:;|$)/, /\bstroke-linecap:\s*round\s*(?:;|$)/, /\bstroke-linejoin:\s*round\s*(?:;|$)/]) {
    assert.match(icon, rule, 'Decorative arrows have consistent dimensions and a visible stroke');
  }
  const arrow = declarations(css, '.flow-arrow');
  assert.match(arrow, /\bcolor:\s*var\(--ink\)\s*(?:;|$)/);
  assert.doesNotMatch(arrow, /\bfont(?:-[\w-]+)?\s*:/, 'SVG visibility does not depend on font glyph weight');
  for (const rule of [/\bposition:\s*absolute\s*(?:;|$)/, /\bright:\s*-1\.05rem\s*(?:;|$)/, /\btop:\s*50%\s*(?:;|$)/, /\btransform:\s*translateY\(-50%\)\s*(?:;|$)/]) {
    assert.match(arrow, rule, 'Workflow arrows retain their existing position');
  }
  const mobile = [...css.matchAll(/@media\s*\(max-width:\s*650px\)\s*\{/g)]
    .map(match => blockAfter(css.slice(match.index), /^@media\s*\(max-width:\s*650px\)\s*\{/))
    .find(block => /\.flow-arrow\s*\{/.test(block));
  assert.ok(mobile, 'Workflow arrows retain their mobile positioning rule');
  assert.match(declarations(mobile, '.flow-arrow'), /\bright:\s*-\.95rem\s*(?:;|$)/);
  assert.doesNotMatch(css, /\.featured-card\s+\.text-link\s*>\s*\[aria-hidden=["']true["']\]/, 'Obsolete font-weight override is removed');
  for (const selector of ['.text-link', '.featured-body .text-link', '.featured-flow li', '.flow-step']) {
    assert.doesNotMatch(declarations(css, selector), /\bfont-weight\s*:/, `${selector}: adjacent text retains its existing weight`);
  }
});

test('compact featured cards preserve complete content and keep their size changes locally scoped', async () => {
  const css = await source('styles.css');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selectors: match[1].trim().split(',').map(selector => selector.trim()), body: match[2] }));
  const chipRules = rules.filter(rule => rule.selectors.some(selector => selector.includes('.chips')));
  for (const rule of chipRules) {
    const caseToolsMarginReset = rule.selectors.length === 2 && rule.selectors.includes('.case-tools h2') && rule.selectors.includes('.case-tools .chips') && /^margin:\s*0;?$/.test(rule.body.trim());
    assert.ok(caseToolsMarginReset || rule.selectors.every(selector => ['.chips', '.chips li'].includes(selector) || /^\.featured-/.test(selector)), 'Compact chip sizing stays scoped to featured cards; case tools may reset only their own margin');
  }
  assert.match(declarations(css, '.chips'), /\bgap:\s*\.5rem\s*(?:;|$)/);
  const globalChips = declarations(css, '.chips li');
  assert.match(globalChips, /\bfont-size:\s*\.88rem\s*(?:;|$)/);
  assert.match(globalChips, /\bpadding:\s*\.3rem\s+\.6rem\s*(?:;|$)/);
  assert.ok(chipRules.some(rule => rule.selectors.includes('.featured-body .chips li')), 'Featured chip compactness has its own selector');
  assert.match(declarations(css, '.featured-result strong'), /\bdisplay:\s*inline\s*(?:;|$)/);
  assert.match(declarations(css, '.text-link'), /\bmin-height:\s*44px\s*(?:;|$)/);
  const featuredRules = rules.filter(rule => rule.selectors.some(selector => /^\.(?:featured-|flow-)/.test(selector)));
  for (const rule of featuredRules) {
    if (rule.selectors.length === 1 && rule.selectors[0] === '.featured-card .project-arrow') continue; // Icons have explicit dimensions; card content stays flexible.
    assert.doesNotMatch(rule.body, /(?:^|;)\s*(?:height|max-height|block-size|max-block-size)\s*:|(?:-webkit-)?line-clamp\s*:|text-overflow\s*:\s*ellipsis/i, 'Cards do not use fixed height or text truncation to appear smaller');
    const targetMinHeight = rule.body.match(/(?:^|;)\s*min-height\s*:\s*([^;]+)/)?.[1];
    if (rule.selectors.some(selector => selector.endsWith('.text-link')) && targetMinHeight) {
      assert.equal(targetMinHeight.trim(), '44px', 'Case-study link overrides retain a 44px click target');
    }
  }
  for (const path of ['index.html', 'dist/index.html']) {
    const cards = [...(await source(path)).matchAll(/<article class="featured-card">([\s\S]*?)<\/article>/g)];
    assert.equal(cards.length, featuredWork.length);
    for (const [index, card] of cards.entries()) {
      const item = featuredWork[index];
      const project = projects.find(project => project.id === item.id);
      for (const value of [item.role, project.title, project.summary, project.metric, project.metricLabel, ...project.tools.slice(0, 3)]) {
        assert.ok(card[1].includes(esc(value)), `${path}: ${item.id} retains ${value}`);
      }
      const title = card[1].match(/<h3><a href="([^"]+)">([^<]+)<\/a><\/h3>/);
      assert.equal(title?.[1], `./${item.id}/index.html`);
      assert.equal(title?.[2], esc(project.title));
      assert.match(card[1], /<a class="text-link"[^>]*>Read case study/);
      assert.equal((card[1].match(new RegExp(`href="\\./${item.id}/index\\.html"`, 'g')) || []).length, 2, `${path}: title and case-study links remain`);
    }
  }
});

test('shared expanded app layout is 25 percent larger while regular embeds retain their dimensions', async () => {
  const css = await source('styles.css');
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selectors: match[1].trim().split(',').map(selector => selector.trim()), body: match[2] }));
  const exactRules = selector => rules.filter(rule => rule.selectors.includes(selector)).map(rule => rule.body);
  const pixels = (body, property) => Number(body.match(new RegExp(`(?:^|;)\\s*${property}:\\s*([\\d.]+)px\\s*(?:;|$)`))?.[1]);
  const base = declarations(css, '.embedded-app');
  const expanded = declarations(css, '.embedded-app--expanded');
  assert.equal(pixels(base, 'max-width'), 1040, 'Default embed width remains 1040px');
  assert.match(base, /\bmargin:\s*2rem\s+auto\s*(?:;|$)/, 'Default embed margins remain unchanged');
  assert.match(expanded, /\bwidth:\s*min\(1300px,\s*calc\(100vw\s*-\s*3rem\)\)\s*(?:;|$)/, 'Expanded embed grows to 1300px but fits inside the desktop viewport');
  const expandedMaximum = Number(expanded.match(/\bwidth:\s*min\(([\d.]+)px,/)?.[1]);
  assert.equal(expandedMaximum / pixels(base, 'max-width'), 1.25, 'Desktop maximum width increases by exactly 25 percent');
  for (const rule of [/\bmax-width:\s*none\s*(?:;|$)/, /\bposition:\s*relative\s*(?:;|$)/, /\bleft:\s*50%\s*(?:;|$)/, /\btransform:\s*translateX\(-50%\)\s*(?:;|$)/, /\bmargin-inline:\s*0\s*(?:;|$)/]) {
    assert.match(expanded, rule, 'Only the expanded embed is centered beyond its parent content width');
  }
  const baseHeights = exactRules('.embed-host iframe').map(body => pixels(body, 'height')).filter(Number.isFinite);
  const expandedHeights = exactRules('.embedded-app--expanded .embed-host iframe').map(body => pixels(body, 'height')).filter(Number.isFinite);
  assert.deepEqual(baseHeights, [620, 500], 'Default desktop and mobile iframe heights remain unchanged');
  assert.deepEqual(expandedHeights, [775, 625], 'Expanded heights are scoped to the opted-in embed');
  assert.deepEqual(expandedHeights.map((height, index) => height / baseHeights[index]), [1.25, 1.25], 'Both responsive iframe heights increase by exactly 25 percent');
  const mobileBlocks = [...css.matchAll(/@media\s*\(max-width:\s*650px\)\s*\{/g)].map(match => blockAfter(css.slice(match.index), /^@media\s*\(max-width:\s*650px\)\s*\{/));
  const expandedMobile = mobileBlocks.find(block => /\.embedded-app--expanded\s*\{/.test(block));
  assert.ok(expandedMobile, 'Expanded viewport sizing has a mobile override');
  assert.match(declarations(expandedMobile, '.embedded-app--expanded'), /\bwidth:\s*calc\(100vw\s*-\s*2rem\)\s*(?:;|$)/, 'Mobile embed keeps viewport gutters instead of overflowing');
  assert.equal(pixels(declarations(expandedMobile, '.embedded-app--expanded .embed-host iframe'), 'height'), 625);
  assert.equal(css, await source('dist/styles.css'));
});

test('all project images use transparent unframed containers and natural image heights', async () => {
  const css = await source('styles.css');
  for (const selector of ['.screenshot-grid a', '.evidence-figure>a', '.diagram-scroll']) {
    const frame = declarations(css, selector);
    for (const [property, value] of [['background', 'transparent'], ['border', '0'], ['border-radius', '0']]) {
      assert.match(frame, new RegExp(`(?:^|;)\\s*${property}:\\s*${value}\\s*(?:;|$)`), `${selector}: no white surround, border or rounded clipping`);
    }
    if (selector !== '.diagram-scroll') {
      assert.match(frame, /(?:^|;)\s*display:\s*block\s*(?:;|$)/);
      assert.match(frame, /(?:^|;)\s*padding:\s*0\s*(?:;|$)/);
      assert.match(frame, /(?:^|;)\s*cursor:\s*zoom-in\s*(?:;|$)/, `${selector}: keep the full-size viewer affordance`);
    }
  }
  assert.match(declarations(css, '.screenshot-grid a'), /(?:^|;)\s*height:\s*auto\s*(?:;|$)/, 'Gallery frames follow their image instead of a fixed-height box');
  for (const selector of ['.screenshot-grid img', '.evidence-figure img']) {
    const image = declarations(css, selector);
    assert.match(image, /(?:^|;)\s*width:\s*100%\s*(?:;|$)/, `${selector}: fill available width`);
    assert.match(image, /(?:^|;)\s*height:\s*auto\s*(?:;|$)/, `${selector}: retain source aspect ratio`);
    assert.match(image, /(?:^|;)\s*object-fit:\s*contain\s*(?:;|$)/, `${selector}: never crop the source image`);
    assert.doesNotMatch(image, /(?:^|;)\s*max-height\s*:/, `${selector}: avoid a height cap that creates letterboxing`);
  }
  // Examine every applicable rule, including hover, theme and responsive overrides.
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = rule[1].split(',').map(selector => selector.trim());
    const frameRule = selectors.some(selector => /(?:^|\s)(?:\.screenshot-grid\s+a|\.evidence-figure\s*>\s*a|\.diagram-scroll)(?::[\w-]+)?$/.test(selector));
    const imageRule = selectors.some(selector => /(?:^|\s)(?:\.screenshot-grid\s+img|\.evidence-figure\s+img|\.diagram-scroll\s*>\s*img)$/.test(selector));
    if (!frameRule && !imageRule) continue;
    for (const property of rule[2].matchAll(/(?:^|;)\s*([\w-]+)\s*:\s*([^;]+)/g)) {
      const [, name, rawValue] = property;
      const value = rawValue.trim();
      if (/^background(?:-color)?$/.test(name)) assert.match(value, /^(?:transparent|none)$/, `${rule[1]}: overrides cannot restore image backgrounds`);
      if (frameRule && /^(?:padding(?:-[\w-]+)?|border(?:-(?:width|radius|color))?)$/.test(name)) assert.match(value, /^(?:0|none|transparent)$/, `${rule[1]}: overrides cannot restore a visible frame`);
      if (/^(?:height|max-height)$/.test(name)) assert.match(value, /^(?:auto|none)$/, `${rule[1]}: desktop and responsive rules retain natural heights`);
      if (name === 'object-fit') assert.equal(value, 'contain', `${rule[1]}: source images must not be cropped`);
    }
  }
  assert.doesNotMatch(css, /#gallery-building-footprint-extraction/, 'The standard applies globally rather than to one project');
  const mobile = [...css.matchAll(/@media\s*\(max-width:\s*650px\)\s*\{/g)]
    .map(match => blockAfter(css.slice(match.index), /^@media\s*\(max-width:\s*650px\)\s*\{/))
    .find(block => /\.diagram-scroll\s*\{/.test(block));
  assert.ok(mobile, 'Wide diagrams still have a mobile scrolling rule');
  assert.match(declarations(mobile, '.diagram-scroll'), /(?:^|;)\s*overflow-x:\s*auto\s*(?:;|$)/);
  assert.match(declarations(mobile, '.diagram-scroll>img'), /(?:^|;)\s*min-width:\s*620px\s*(?:;|$)/, 'Diagram labels stay legible on small screens');
  assert.equal(css, await source('dist/styles.css'));
});

test('footer background stays a small pre-cropped band that renders like the original', async () => {
  const image = await readFile(new URL('../assets/gis-background.webp', import.meta.url));
  assert.ok(image.length < 150 * 1024, 'Every page downloads the footer image, so it stays small');
  assert.equal(image.toString('latin1', 0, 4), 'RIFF');
  assert.equal(image.toString('latin1', 8, 16), 'WEBPVP8 ');
  const [width, height] = [image.readUInt16LE(26) & 0x3fff, image.readUInt16LE(28) & 0x3fff];
  assert.deepEqual([width, height], [1440, 720], 'Band of the 1440x2160 original that remains visible at 65% with cover');
  const css = await source('styles.css');
  // Cover sizing keeps these rows identical to the original while footer height is at most half its width.
  const footerRules = [...css.matchAll(/\.site-footer\{([^}]*)\}/g)].map(match => match[1]).filter(rule => rule.includes('gis-background.webp'));
  assert.ok(footerRules.length > 0);
  for (const rule of footerRules) assert.match(rule, /url\('\.\/assets\/gis-background\.webp'\)\s+center\s+65%\/cover/);
  assert.equal(css, await source('dist/styles.css'));
});
