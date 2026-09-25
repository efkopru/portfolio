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

function environment({ saved = null, blockedRead = false, blockedAccess = false, blockedWrite = false, missingControl = false, missingState = false } = {}) {
  const reads = [];
  const writes = [];
  const listeners = new Map();
  const documentElement = { dataset: {}, style: {}, classList: { add() {} } };
  const toolbar = { hidden: true, removeAttribute(name) { if (name === 'hidden') this.hidden = false; } };
  const state = { textContent: 'Off' };
  const controlAttributes = new Map([['aria-checked', 'false']]);
  const toggle = {
    setAttribute(name, value) { controlAttributes.set(name, String(value)); },
    getAttribute(name) { return controlAttributes.get(name) ?? null; },
    querySelector(selector) { return selector === '[data-theme-state]' && !missingState ? state : null; },
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
    if (selector === '[data-theme-toggle]') return missingControl ? null : toggle;
    if (selector === '[data-theme-state]') return missingState ? null : state;
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
    context, documentElement, toolbar, toggle, state, meta, reads, writes, listeners,
    run(code, filename) { runInNewContext(code, context, { filename, timeout: 1000 }); },
    click() {
      const callbacks = listeners.get('click') || [];
      assert.ok(callbacks.length, 'The theme switch must handle click events');
      for (const callback of callbacks) callback.call(toggle, { target: toggle, currentTarget: toggle });
    }
  };
}

function assertTheme(page, theme) {
  assert.equal(page.documentElement.dataset.theme, theme);
  assert.equal(page.toggle.getAttribute('aria-checked'), String(theme === 'midnight'));
  assert.equal(page.state.textContent, theme === 'midnight' ? 'On' : 'Off');
  assert.equal(page.meta.content, themeColors[theme]);
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
    assertTheme(page, 'classic');
    assert.equal(page.toolbar.hidden, false);
    assert.deepEqual(page.writes, [], `${saved}: loading controls must not repair stored preferences`);
    page.click();
    assertTheme(page, 'midnight');
    assert.deepEqual(page.writes, [[storageKey, 'midnight']], `${saved}: persist only the explicit new choice`);
  }
});

test('theme switch restores both preferences and persists exactly one change per repeated click', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const saved of themes) {
    const page = environment({ saved });
    page.run(initializer, 'theme.js');
    page.run(script, 'script.js');
    assertTheme(page, saved);
    assert.equal(page.toolbar.hidden, false, 'JavaScript reveals the theme control');
    assert.deepEqual(page.writes, [], 'Loading the page must not write a preference');
    let expected = saved;
    const expectedWrites = [];
    for (let click = 0; click < 6; click++) {
      expected = expected === 'midnight' ? 'classic' : 'midnight';
      page.click();
      assertTheme(page, expected);
      expectedWrites.push([storageKey, expected]);
      assert.deepEqual(page.writes, expectedWrites, 'Write only the theme preference once per explicit click');
    }
    assert.equal(page.listeners.get('click')?.length, 1, 'Register one click handler');
    assert.ok(!page.listeners.has('keydown') && !page.listeners.has('keyup'), 'Native button activation handles keyboard input without duplicate toggles');
  }
});

test('theme switch still works when preference storage access, reads, or writes are blocked', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const options of [{ blockedWrite: true }, { blockedAccess: true }, { blockedRead: true, saved: 'midnight' }]) {
    const page = environment(options);
    assert.doesNotThrow(() => {
      page.run(initializer, 'theme.js');
      page.run(script, 'script.js');
      assertTheme(page, 'classic');
      assert.deepEqual(page.writes, [], 'Loading a blocked preference does not write it');
      page.click();
    });
    assertTheme(page, 'midnight');
    assert.equal(page.toolbar.hidden, false);
    page.click();
    assertTheme(page, 'classic');
    assert.deepEqual(page.writes, options.blockedRead ? [[storageKey, 'midnight'], [storageKey, 'classic']] : []);
  }
});

test('theme switch safely normalizes an absent or invalid root theme without writing a preference', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const invalid of [undefined, '', ...removedThemes, 'unknown', 'MIDNIGHT', ' midnight ', '__proto__', 'constructor']) {
    const page = environment({ saved: 'midnight' });
    page.run(initializer, 'theme.js');
    page.documentElement.dataset.theme = invalid;
    page.run(script, 'script.js');
    assertTheme(page, 'classic');
    assert.deepEqual(page.writes, [], 'Invalid markup must not rewrite the stored preference');
    page.click();
    assertTheme(page, 'midnight');
    assert.deepEqual(page.writes, [[storageKey, 'midnight']]);
  }
});

test('missing theme control leaves the initializer preference intact and its toolbar hidden', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  const page = environment({ saved: 'midnight', missingControl: true });
  assert.doesNotThrow(() => {
    page.run(initializer, 'theme.js');
    page.run(script, 'script.js');
  });
  assert.equal(page.documentElement.dataset.theme, 'midnight');
  assert.equal(page.toolbar.hidden, true);
  assert.deepEqual(page.writes, []);
  assert.equal(page.listeners.size, 0);
});

test('missing decorative state label does not prevent accessible theme switching', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  const page = environment({ missingState: true });
  assert.doesNotThrow(() => {
    page.run(initializer, 'theme.js');
    page.run(script, 'script.js');
    page.click();
  });
  assert.equal(page.documentElement.dataset.theme, 'midnight');
  assert.equal(page.toggle.getAttribute('aria-checked'), 'true');
  assert.equal(page.meta.content, themeColors.midnight);
  assert.equal(page.toolbar.hidden, false);
  assert.deepEqual(page.writes, [[storageKey, 'midnight']]);
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

test('every generated page includes current versioned assets, an early initializer, and an accessible dark-mode switch', async () => {
  const manifest = JSON.parse(await source('dist/build-manifest.json'));
  assert.ok(manifest.pages.length > 0);
  const versions = new Map();
  for (const asset of ['theme.js', 'styles.css', 'script.js']) {
    const text = await source(asset);
    assert.equal(await source(`dist/${asset}`), text, `Publish the current ${asset} asset`);
    versions.set(asset, createHash('sha256').update(text.replaceAll('\r\n', '\n'), 'utf8').digest('hex').slice(0, 12));
  }
  for (const path of manifest.pages) {
    const html = await source(`dist/${path}`);
    assert.equal(await source(path), html, `${path}: root and published pages contain the same assets and theme switch`);
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

    assert.doesNotMatch(html, /data-theme-select|id=["']theme-select["']/i, `${path}: remove the old theme dropdown`);
    const switches = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)]
      .filter(match => attributes(match[0].match(/^<button\b[^>]*>/i)[0]).has('data-theme-toggle'));
    assert.equal(switches.length, 1, `${path}: one theme switch`);
    const control = attributes(switches[0][0].match(/^<button\b[^>]*>/i)[0]);
    const content = switches[0][1];
    assert.equal(control.get('type'), 'button', `${path}: theme changes never submit a form`);
    assert.equal(control.get('role'), 'switch', `${path}: expose on/off semantics`);
    assert.equal(control.get('aria-checked'), 'false', `${path}: Classic starts with dark mode off`);
    assert.ok((control.get('class') || '').split(/\s+/).includes('theme-toggle'), `${path}: use the styled switch control`);
    assert.ok(!control.has('aria-label') && !control.has('aria-labelledby'), `${path}: the visible Dark mode text names the switch`);
    const spans = [...content.matchAll(/<span\b([^>]*)>([^<>]*)<\/span>/gi)];
    const label = spans.find(([, , text]) => text.trim() === 'Dark mode');
    assert.ok(label, `${path}: stable visible Dark mode label`);
    assert.notEqual(attributes(`<span${label[1]}>`).get('aria-hidden'), 'true', `${path}: expose the visible switch name`);
    const state = spans.filter(([, attrs]) => attributes(`<span${attrs}>`).has('data-theme-state'));
    assert.equal(state.length, 1, `${path}: one visible on/off state`);
    assert.equal(state[0][2].trim(), 'Off', `${path}: Classic starts with the Off label`);
    assert.equal(attributes(`<span${state[0][1]}>`).get('aria-hidden'), 'true', `${path}: state text must not change the switch accessible name`);
    assert.ok([...content.matchAll(/<span\b[^>]*>/gi)].some(([tag]) => {
      const attrs = attributes(tag);
      return attrs.get('aria-hidden') === 'true' && !attrs.has('data-theme-state');
    }), `${path}: decorative switch track is hidden from assistive technology`);
    const toolbar = [...html.matchAll(/<[a-z][\w:-]*\b[^>]*>/gi)]
      .map(match => attributes(match[0]))
      .find(attrs => (attrs.get('class') || '').split(/\s+/).includes('theme-toolbar'));
    assert.ok(toolbar?.has('hidden'), `${path}: hide the nonfunctional switch until JavaScript runs`);
    assert.ok(toolbar?.has('data-theme-toolbar'), `${path}: JavaScript can reveal the switch toolbar`);
  }
});
