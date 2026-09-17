import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const themeColors = {
  classic: '#e0e9f0',
  midnight: '#111c2b'
};
const themes = Object.keys(themeColors);
const removedThemes = ['evergreen', 'sandstone', 'coastal'];
const storageKey = 'ekopru-theme';
const source = name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');

function environment({ saved = null, blockedRead = false, blockedAccess = false, blockedWrite = false } = {}) {
  const reads = [];
  const writes = [];
  const listeners = new Map();
  const documentElement = { dataset: {}, style: {}, classList: { add() {} } };
  const toolbar = { hidden: true, removeAttribute(name) { if (name === 'hidden') this.hidden = false; } };
  const select = {
    value: 'classic',
    addEventListener(name, callback) {
      const callbacks = listeners.get(name) || [];
      callbacks.push(callback);
      listeners.set(name, callbacks);
    },
    closest: selector => selector === '.theme-toolbar' ? toolbar : null
  };
  const meta = {
    content: 'initial-theme-color',
    setAttribute(name, value) { this[name] = value; },
    getAttribute(name) { return this[name]; }
  };
  const querySelector = selector => {
    if (selector === '[data-theme-select]') return select;
    if (selector === '.theme-toolbar' || selector === '[data-theme-toolbar]') return toolbar;
    if (/^meta\[name=['"]?theme-color['"]?\]$/.test(selector)) return meta;
    return null;
  };
  const context = {
    document: {
      documentElement,
      body: { dataset: { root: './' } },
      querySelector,
      querySelectorAll: selector => {
        const result = querySelector(selector);
        return result ? [result] : [];
      },
      addEventListener() {}
    },
    location: { hash: '', replace() {} },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    URL
  };
  const storage = {
    getItem(key) {
      reads.push(key);
      if (blockedRead) throw new Error('Storage reads blocked');
      return saved;
    },
    setItem(key, value) {
      if (blockedWrite) throw new Error('Storage writes blocked');
      writes.push([key, value]);
    },
    removeItem(key) { writes.push([key, null]); }
  };
  Object.defineProperty(context, 'localStorage', {
    get() {
      if (blockedAccess) throw new Error('Storage access blocked');
      return storage;
    }
  });
  context.window = context;
  return {
    context, documentElement, toolbar, select, meta, reads, writes,
    run(code, filename) { runInNewContext(code, context, { filename, timeout: 1000 }); },
    change(value) {
      select.value = value;
      const callbacks = listeners.get('change') || [];
      assert.ok(callbacks.length, 'Theme selector must handle change events');
      for (const callback of callbacks) callback.call(select, { target: select, currentTarget: select });
    }
  };
}

test('theme initializer restores only allowed preferences without writing storage', async () => {
  const initializer = await source('theme.js');
  for (const saved of themes) {
    const page = environment({ saved });
    page.run(initializer, 'theme.js');
    assert.equal(page.documentElement.dataset.theme, saved);
    assert.ok(page.reads.length > 0);
    assert.ok(page.reads.every(key => key === storageKey));
    assert.deepEqual(page.writes, [], 'Restoring a preference must not write it again');
  }
});

test('theme initializer defaults to Classic for absent, invalid, or unavailable storage', async () => {
  const initializer = await source('theme.js');
  const cases = [
    ...[null, '', 'unknown', 'MIDNIGHT', ' classic ', ' midnight ', '__proto__', 'constructor'].map(saved => ({ saved })),
    { saved: 'midnight', blockedRead: true },
    { saved: 'midnight', blockedAccess: true }
  ];
  for (const options of cases) {
    const page = environment(options);
    assert.doesNotThrow(() => page.run(initializer, 'theme.js'), JSON.stringify(options));
    assert.equal(page.documentElement.dataset.theme, 'classic', JSON.stringify(options));
    assert.deepEqual(page.writes, [], 'Defaulting must not create or repair stored preferences');
  }
});

test('removed saved themes fall back to Classic without writing storage and can switch to Midnight', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const saved of removedThemes) {
    const page = environment({ saved });
    page.run(initializer, 'theme.js');
    assert.equal(page.documentElement.dataset.theme, 'classic', `${saved}: fall back before first paint`);
    assert.deepEqual(page.writes, [], `${saved}: initialization must not repair stored preferences`);
    page.run(script, 'script.js');
    assert.equal(page.documentElement.dataset.theme, 'classic', `${saved}: runtime preserves the fallback`);
    assert.equal(page.select.value, 'classic');
    assert.equal(page.meta.content, themeColors.classic);
    assert.equal(page.toolbar.hidden, false);
    assert.deepEqual(page.writes, [], `${saved}: loading controls must not repair stored preferences`);
    page.change('midnight');
    assert.equal(page.documentElement.dataset.theme, 'midnight');
    assert.equal(page.select.value, 'midnight');
    assert.equal(page.meta.content, themeColors.midnight);
    assert.deepEqual(page.writes, [[storageKey, 'midnight']], `${saved}: persist only the explicit new choice`);
  }
});

test('theme controls restore selection and persist only explicit changes', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const saved of themes) {
    const page = environment({ saved });
    page.run(initializer, 'theme.js');
    page.run(script, 'script.js');
    assert.equal(page.select.value, saved);
    assert.equal(page.toolbar.hidden, false, 'JavaScript reveals the theme control');
    assert.deepEqual(page.writes, [], 'Loading the page must not write a preference');
    assert.equal(page.meta.content, themeColors[saved], 'Browser theme color restores the saved selection');
    for (const theme of themes) {
      page.change(theme);
      assert.equal(page.documentElement.dataset.theme, theme);
      assert.equal(page.select.value, theme);
      assert.deepEqual(page.writes.at(-1), [storageKey, theme]);
      assert.equal(page.meta.content, themeColors[theme], 'Browser theme color follows the selection');
    }
    assert.equal(page.writes.length, themes.length, 'One preference write per explicit selection');
  }
});

test('theme selection still works when preference storage is blocked', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const options of [{ blockedWrite: true }, { blockedAccess: true }]) {
    const page = environment(options);
    assert.doesNotThrow(() => {
      page.run(initializer, 'theme.js');
      page.run(script, 'script.js');
      page.change('midnight');
    });
    assert.equal(page.documentElement.dataset.theme, 'midnight');
    assert.equal(page.select.value, 'midnight');
    assert.equal(page.toolbar.hidden, false);
    assert.equal(page.meta.content, themeColors.midnight);
    assert.deepEqual(page.writes, []);
  }
});

test('theme controls safely fall back when given an unsupported selection', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const invalid of [...removedThemes, 'unknown', 'MIDNIGHT', ' midnight ', '__proto__', 'constructor']) {
    const page = environment({ saved: 'midnight' });
    page.run(initializer, 'theme.js');
    page.run(script, 'script.js');
    page.change(invalid);
    assert.equal(page.documentElement.dataset.theme, 'classic');
    assert.equal(page.select.value, 'classic');
    assert.equal(page.meta.content, themeColors.classic);
    assert.deepEqual(page.writes, [[storageKey, 'classic']]);
  }
});

function luminance(color) {
  assert.match(color, /^#(?:[\da-f]{3}|[\da-f]{6})$/i, 'Contrast checks require an opaque hex color');
  const hex = color.length === 4 ? [...color.slice(1)].map(value => value.repeat(2)).join('') : color.slice(1);
  const [r, g, b] = hex.match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('removed themes have no CSS palettes', async () => {
  const css = (await source('styles.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/\[data-theme\s*=\s*["']?([\w-]+)["']?\s*\]/g)]
    .map(([, name]) => name);
  for (const theme of removedThemes) {
    assert.ok(!selectors.includes(theme), `${theme}: removed themes must have no remaining CSS rules`);
  }
  assert.ok(selectors.every(theme => themes.includes(theme)), 'Only supported themes may have CSS selectors');
});

test('Midnight supplies accessible text, controls, and focus on every content surface', async () => {
  const css = await source('styles.css');
  const rule = css.match(/:root\[data-theme=["']midnight["']\]\s*\{([^}]+)\}/);
  assert.ok(rule, 'Midnight must have its own palette');
  const tokens = new Map([...rule[1].matchAll(/(--[\w-]+)\s*:\s*([^;\s}]+)/g)]
    .map(([, name, value]) => [name, value]));
  assert.equal(tokens.get('--bg'), themeColors.midnight, 'CSS and browser theme color agree');
  assert.equal(tokens.get('--logo-bg'), 'transparent', 'Preserve the original logo without a colored backdrop');
  const checkContrast = (foreground, background, threshold) => {
    assert.ok(tokens.has(foreground) && tokens.has(background), `Palette supplies ${foreground} and ${background}`);
    const values = [luminance(tokens.get(foreground)), luminance(tokens.get(background))].sort((a, b) => b - a);
    const ratio = (values[0] + 0.05) / (values[1] + 0.05);
    assert.ok(ratio >= threshold, `${foreground} on ${background}: ${ratio.toFixed(2)} must be at least ${threshold}`);
  };
  for (const background of ['--bg', '--surface', '--surface-alt']) {
    for (const foreground of ['--ink', '--muted', '--heading', '--accent']) checkContrast(foreground, background, 4.5);
    for (const foreground of ['--control-border', '--focus']) checkContrast(foreground, background, 3);
  }
  checkContrast('--button-ink', '--button-bg', 4.5);
});

function attributes(tag) {
  const body = tag.replace(/^<[\w:-]+\b/, '').replace(/\/?>$/, '');
  return new Map([...body.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)]
    .map(([, name, doubleQuoted, singleQuoted, unquoted]) => [name.toLowerCase(), doubleQuoted ?? singleQuoted ?? unquoted ?? '']));
}

test('Midnight recolors only the original brand image on a transparent backdrop', async () => {
  const css = (await source('styles.css')).replace(/\/\*[\s\S]*?\*\//g, '');
  const palette = css.match(/:root\[data-theme=["']midnight["']\]\s*\{([^}]+)\}/);
  assert.ok(palette, 'Midnight must define its palette');
  assert.match(palette[1], /(?:^|;)\s*--logo-bg\s*:\s*transparent\s*(?:;|$)/,
    'Midnight must not add a light background behind the transparent logo');
  assert.match(css, /\.brand\s+img\s*\{[^}]*\bbackground\s*:\s*var\(--logo-bg\)/,
    'The brand image must use the theme-specific backdrop');

  const filteredRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , declarations]) => /(?:^|;)\s*(?:-webkit-)?filter\s*:/.test(declarations));
  assert.equal(filteredRules.length, 1, 'Recoloring must not filter other themes, page content, or screenshots');
  const [, selector, declarations] = filteredRules[0];
  assert.match(selector.trim(), /^:root\[data-theme=["']midnight["']\]\s+\.brand\s+img$/,
    'The filter must target only the Midnight brand image, never a parent or broad image selector');
  assert.match(declarations, /(?:^|;)\s*filter\s*:\s*invert\(1\)\s+hue-rotate\(180deg\)\s+brightness\(1\.5\)\s*(?:;|$)/,
    'Preserve the logo details and alpha while adapting its original colors');
});

test('every generated page preserves the original accessible home logo and its dimensions', async () => {
  const manifest = JSON.parse(await source('dist/build-manifest.json'));
  assert.ok(manifest.pages.length > 0);
  const logoPath = 'assets/efk-logo.avif';
  assert.deepEqual(await readFile(new URL(`../dist/${logoPath}`, import.meta.url)),
    await readFile(new URL(`../${logoPath}`, import.meta.url)), 'Publish the unchanged original logo asset');
  for (const path of manifest.pages) {
    const prefix = path.includes('/') ? '../' : './';
    for (const location of [path, `dist/${path}`]) {
      const html = await source(location);
      const brands = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)]
        .filter(([anchor]) => (attributes(anchor.match(/^<a\b[^>]*>/i)[0]).get('class') || '').split(/\s+/).includes('brand'));
      assert.equal(brands.length, 1, `${location}: exactly one brand home link`);
      const brand = brands[0][0];
      const link = attributes(brand.match(/^<a\b[^>]*>/i)[0]);
      assert.equal(link.get('href'), `${prefix}index.html`, `${location}: preserve the home destination`);
      assert.equal(link.get('aria-label'), 'Esad Kopru home', `${location}: preserve the accessible home link name`);
      const images = [...brand.matchAll(/<img\b[^>]*>/gi)];
      assert.equal(images.length, 1, `${location}: keep a single original logo image`);
      const image = attributes(images[0][0]);
      assert.equal(image.get('src'), `${prefix}${logoPath}`, `${location}: preserve the original source`);
      assert.equal(image.get('width'), '101', `${location}: preserve the logo width`);
      assert.equal(image.get('height'), '48', `${location}: preserve the logo height`);
      assert.equal(image.get('alt'), 'EFK Portfolio', `${location}: preserve the logo alternative text`);
    }
  }
});

test('every generated page includes current versioned assets, an early initializer, and a labeled theme selector', async () => {
  const manifest = JSON.parse(await source('dist/build-manifest.json'));
  assert.ok(manifest.pages.length > 0);
  const versions = new Map();
  for (const asset of ['theme.js', 'styles.css', 'script.js']) {
    const text = await source(asset);
    assert.equal(await source(`dist/${asset}`), text, `Publish the current ${asset} asset`);
    versions.set(asset, createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12));
  }
  for (const path of manifest.pages) {
    const html = await source(`dist/${path}`);
    assert.equal(await source(path), html, `${path}: root and published pages contain the same assets and theme choices`);
    const prefix = path.includes('/') ? '../' : './';
    const tags = [...html.matchAll(/<script\b[^>]*>|<link\b[^>]*>/gi)]
      .map(match => ({ position: match.index, tag: match[0], attrs: attributes(match[0]) }));
    const localAsset = (attribute, asset) => tags.filter(({ attrs }) => attrs.get(attribute)?.split(/[?#]/)[0] === `${prefix}${asset}`);
    const versionedUrl = asset => `${prefix}${asset}?v=${versions.get(asset)}`;
    const initializers = localAsset('src', 'theme.js');
    assert.equal(initializers.length, 1, `${path}: one local theme initializer`);
    const initializer = initializers[0];
    assert.equal(initializer.attrs.get('src'), versionedUrl('theme.js'), `${path}: initializer URL matches its current source hash`);
    assert.ok(!initializer.attrs.has('async') && !initializer.attrs.has('defer'), `${path}: initialize before first paint`);
    assert.notEqual(initializer.attrs.get('type'), 'module', `${path}: initializer must not defer as a module`);
    const stylesheets = localAsset('href', 'styles.css').filter(({ attrs }) => attrs.get('rel') === 'stylesheet');
    assert.equal(stylesheets.length, 1, `${path}: one local stylesheet`);
    const stylesheet = stylesheets[0];
    assert.equal(stylesheet.attrs.get('href'), versionedUrl('styles.css'), `${path}: stylesheet URL matches its current source hash`);
    assert.ok(initializer.position < stylesheet.position, `${path}: initializer precedes styles`);
    assert.ok(initializer.position < html.indexOf('</head>'), `${path}: initialize in the document head`);
    const mainScripts = localAsset('src', 'script.js');
    assert.equal(mainScripts.length, 1, `${path}: one local main script`);
    const mainScript = mainScripts[0];
    assert.equal(mainScript.attrs.get('src'), versionedUrl('script.js'), `${path}: main script URL matches its current source hash`);
    assert.ok(mainScript.attrs.has('defer') && !mainScript.attrs.has('async'), `${path}: main script waits for the document`);

    const selects = [...html.matchAll(/<select\b[^>]*>([\s\S]*?)<\/select>/gi)]
      .filter(match => attributes(match[0].match(/^<select\b[^>]*>/i)[0]).has('data-theme-select'));
    assert.equal(selects.length, 1, `${path}: one theme selector`);
    const select = selects[0];
    const selectId = attributes(select[0].match(/^<select\b[^>]*>/i)[0]).get('id');
    assert.ok(selectId, `${path}: theme selector has a label target`);
    const labels = [...html.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)];
    assert.ok(labels.some(([, attrs, text]) => attributes(`<label${attrs}>`).get('for') === selectId && /theme/i.test(text)), `${path}: visible associated theme label`);
    const options = [...select[1].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
      .map(([, attrs, text]) => [attributes(`<option${attrs}>`).get('value'), text.replace(/<[^>]*>/g, '').trim()]);
    assert.deepEqual(options, themes.map(theme => [theme, theme[0].toUpperCase() + theme.slice(1)]), `${path}: supported choices`);
    const toolbar = [...html.matchAll(/<[a-z][\w:-]*\b[^>]*>/gi)]
      .map(match => attributes(match[0]))
      .find(attrs => (attrs.get('class') || '').split(/\s+/).includes('theme-toolbar'));
    assert.ok(toolbar?.has('hidden'), `${path}: hide the nonfunctional selector until JavaScript runs`);
  }
});
