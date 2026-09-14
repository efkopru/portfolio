import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const themes = ['classic', 'midnight', 'evergreen'];
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
    ...[null, '', 'unknown', 'MIDNIGHT', ' evergreen ', '__proto__', 'constructor'].map(saved => ({ saved })),
    { saved: 'midnight', blockedRead: true },
    { saved: 'evergreen', blockedAccess: true }
  ];
  for (const options of cases) {
    const page = environment(options);
    assert.doesNotThrow(() => page.run(initializer, 'theme.js'), JSON.stringify(options));
    assert.equal(page.documentElement.dataset.theme, 'classic', JSON.stringify(options));
    assert.deepEqual(page.writes, [], 'Defaulting must not create or repair stored preferences');
  }
});

test('theme controls restore selection and persist only explicit changes', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  const page = environment({ saved: 'midnight' });
  page.run(initializer, 'theme.js');
  page.run(script, 'script.js');
  assert.equal(page.select.value, 'midnight');
  assert.equal(page.toolbar.hidden, false, 'JavaScript reveals the theme control');
  assert.deepEqual(page.writes, [], 'Loading the page must not write a preference');
  assert.notEqual(page.meta.content, 'initial-theme-color');
  for (const theme of ['evergreen', 'classic', 'midnight']) {
    const previousColor = page.meta.content;
    page.change(theme);
    assert.equal(page.documentElement.dataset.theme, theme);
    assert.deepEqual(page.writes.at(-1), [storageKey, theme]);
    assert.notEqual(page.meta.content, previousColor, 'Browser theme color follows the selection');
  }
  assert.equal(page.writes.length, 3, 'One preference write per explicit selection');
});

test('theme selection still works when preference storage is blocked', async () => {
  const [initializer, script] = await Promise.all([source('theme.js'), source('script.js')]);
  for (const options of [{ blockedWrite: true }, { blockedAccess: true }]) {
    const page = environment(options);
    assert.doesNotThrow(() => {
      page.run(initializer, 'theme.js');
      page.run(script, 'script.js');
      page.change('evergreen');
    });
    assert.equal(page.documentElement.dataset.theme, 'evergreen');
    assert.equal(page.select.value, 'evergreen');
    assert.equal(page.toolbar.hidden, false);
    assert.notEqual(page.meta.content, 'initial-theme-color');
    assert.deepEqual(page.writes, []);
  }
});

function attributes(tag) {
  const body = tag.replace(/^<[\w:-]+\b/, '').replace(/\/?>$/, '');
  return new Map([...body.matchAll(/([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)]
    .map(([, name, doubleQuoted, singleQuoted, unquoted]) => [name.toLowerCase(), doubleQuoted ?? singleQuoted ?? unquoted ?? '']));
}

test('every generated page includes an early local initializer and a labeled theme selector', async () => {
  const manifest = JSON.parse(await source('dist/build-manifest.json'));
  assert.ok(manifest.pages.length > 0);
  assert.equal(await source('dist/theme.js'), await source('theme.js'), 'Publish the current initializer asset');
  for (const path of manifest.pages) {
    const html = await source(`dist/${path}`);
    const prefix = path.includes('/') ? '../' : './';
    const tags = [...html.matchAll(/<script\b[^>]*>|<link\b[^>]*>/gi)]
      .map(match => ({ position: match.index, tag: match[0], attrs: attributes(match[0]) }));
    const initializers = tags.filter(({ attrs }) => attrs.get('src') === `${prefix}theme.js`);
    assert.equal(initializers.length, 1, `${path}: one local theme initializer`);
    const initializer = initializers[0];
    assert.ok(!initializer.attrs.has('async') && !initializer.attrs.has('defer'), `${path}: initialize before first paint`);
    assert.notEqual(initializer.attrs.get('type'), 'module', `${path}: initializer must not defer as a module`);
    const stylesheet = tags.find(({ attrs }) => attrs.get('rel') === 'stylesheet' && attrs.get('href') === `${prefix}styles.css`);
    assert.ok(stylesheet && initializer.position < stylesheet.position, `${path}: initializer precedes styles`);
    assert.ok(initializer.position < html.indexOf('</head>'), `${path}: initialize in the document head`);

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
