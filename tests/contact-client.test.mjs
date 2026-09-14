import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { profile } from '../content/portfolio.mjs';

const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
const endpoint = `https://formsubmit.co/ajax/${profile.email}`;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function page({
  valid = true,
  dialog = 'supported',
  initialSubmitDisabled = false,
  request = async () => ({ ok: true, json: async () => ({ success: true }) })
} = {}) {
  const listeners = new Map();
  const attributes = new Map();
  const timers = new Map();
  const requests = [];
  const navigation = [];
  const storage = [];
  let nextTimer = 0;
  let resetCount = 0;
  let validationCount = 0;
  let preventedCount = 0;
  const fields = [
    { name: 'email', type: 'email', value: 'visitor@example.test', defaultValue: '', readOnly: false, disabled: false },
    { name: '_subject', type: 'text', value: 'Portfolio question', defaultValue: '', readOnly: false, disabled: false },
    { name: 'message', type: 'textarea', value: 'A message that must survive a failed submission.', defaultValue: '', readOnly: false, disabled: false }
  ];
  const hidden = [
    { name: '_honey', type: 'text', value: '', defaultValue: '', readOnly: false, disabled: false },
    { name: '_url', type: 'hidden', value: 'https://www.ekopru.com/contact/', defaultValue: 'https://www.ekopru.com/contact/', disabled: false }
  ];
  const button = {
    disabled: initialSubmitDisabled, textContent: 'Send message', dataset: {},
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; }
  };
  const status = {
    textContent: '', hidden: false, dataset: {},
    focus() { this.focused = true; },
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { delete this[name]; },
    set innerHTML(_) { assert.fail('Contact status must not interpret provider HTML'); },
    classList: { add() {}, remove() {}, toggle() {} }
  };
  const dialogListeners = new Map();
  const closeListeners = new Map();
  const closeButton = {
    focused: false,
    addEventListener(name, listener) { closeListeners.set(name, listener); },
    focus() { this.focused = true; }
  };
  const popup = dialog === 'missing' ? null : {
    open: false, showCount: 0, closeCount: 0,
    querySelector(selector) { return selector === '[data-contact-success-close]' ? closeButton : null; },
    addEventListener(name, listener) { dialogListeners.set(name, listener); },
    showModal() {
      this.showCount++;
      if (dialog === 'throwing') throw new Error('Dialog could not be opened');
      this.open = true;
      closeButton.focus();
    },
    close() {
      if (!this.open) return;
      this.open = false;
      this.closeCount++;
      dialogListeners.get('close')?.call(this, { target: this });
    }
  };
  if (dialog === 'unsupported') popup.showModal = undefined;
  const form = {
    dataset: { contactEndpoint: endpoint },
    elements: [...fields, ...hidden, button],
    addEventListener(name, listener) { listeners.set(name, listener); },
    querySelector(selector) {
      if (selector.includes('data-contact-submit') || selector.includes('type="submit"')) return button;
      if (selector.includes('data-contact-status')) return status;
      return null;
    },
    querySelectorAll() { return fields; },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    removeAttribute(name) { attributes.delete(name); },
    reportValidity() { validationCount++; return valid; },
    checkValidity() { return valid; },
    reset() {
      resetCount++;
      for (const field of [...fields, ...hidden]) field.value = field.defaultValue;
    },
    submit() { navigation.push('native form.submit'); },
    requestSubmit() { navigation.push('native form.requestSubmit'); }
  };
  const location = {
    hash: '',
    assign(value) { navigation.push(['assign', value]); },
    replace(value) { navigation.push(['replace', value]); },
    get href() { return 'https://portfolio.example.test/contact/'; },
    set href(value) { navigation.push(['href', value]); }
  };
  class FormDataSnapshot {
    constructor(source) {
      assert.equal(source, form, 'Only this contact form is serialized');
      this.values = new Map([...fields, ...hidden].filter(field => !field.disabled).map(field => [field.name, field.value]));
    }
    get(name) { return this.values.get(name) ?? null; }
    set(name, value) { this.values.set(name, value); }
    append(name, value) { this.values.set(name, value); }
    entries() { return this.values.entries(); }
    [Symbol.iterator]() { return this.entries(); }
  }
  const querySelector = selector => {
    if (selector === '[data-contact-form]') return form;
    if (selector === '[data-contact-status]' || selector === '#contact-status') return status;
    if (selector === '[data-contact-submit]') return button;
    if (selector === '[data-contact-success]') return popup;
    return null;
  };
  const context = {
    document: {
      documentElement: { dataset: {}, classList: { add() {} } },
      body: { dataset: { root: '../' } },
      querySelector,
      querySelectorAll: selector => selector === '[data-contact-form]' ? [form] : [],
      addEventListener() {}
    },
    location,
    FormData: FormDataSnapshot,
    AbortController,
    URL,
    fetch(url, options) {
      requests.push({ url, options });
      return request(url, options);
    },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    open(...args) { navigation.push(['open', ...args]); },
    localStorage: {
      getItem(key) { storage.push(['get', key]); return null; },
      setItem(...args) { storage.push(['set', ...args]); },
      removeItem(key) { storage.push(['remove', key]); }
    }
  };
  context.sessionStorage = context.localStorage;
  context.window = context;
  runInNewContext(script, context, { filename: 'script.js', timeout: 1000 });
  assert.equal(typeof listeners.get('submit'), 'function', 'Contact submission must have a same-page handler');
  return {
    form, fields, button, status, popup, closeButton, attributes, requests, timers, navigation, storage, context,
    get resetCount() { return resetCount; },
    get validationCount() { return validationCount; },
    get preventedCount() { return preventedCount; },
    submit() {
      return Promise.resolve(listeners.get('submit').call(form, {
        currentTarget: form, target: form,
        preventDefault() { preventedCount++; }
      }));
    },
    closePopup() {
      assert.equal(typeof closeListeners.get('click'), 'function', 'Wire the popup close control');
      closeListeners.get('click').call(closeButton, { target: closeButton });
    },
    escapePopup() {
      // Native dialog Escape dismisses the modal, then dispatches its close event.
      assert.equal(popup.open, true);
      let prevented = false;
      dialogListeners.get('cancel')?.call(popup, { preventDefault() { prevented = true; } });
      if (!prevented) popup.close();
    },
    expire() {
      const timer = [...timers.entries()].find(([, value]) => value.delay === 20_000);
      assert.ok(timer, 'Bound each submission by a 20-second timeout');
      timers.delete(timer[0]);
      timer[1].callback();
    }
  };
}

function assertIdle(formPage, expectedReadOnly = [false, false, false]) {
  assert.equal(formPage.button.disabled, false, 'Restore the submit control');
  assert.equal(formPage.button.textContent, 'Send message', 'Restore the normal button label');
  assert.notEqual(formPage.attributes.get('aria-busy'), 'true', 'Clear the busy state');
  assert.deepEqual(formPage.fields.map(field => field.readOnly), expectedReadOnly, 'Restore each input state');
  assert.ok(formPage.fields.every(field => !field.disabled), 'Leave inputs enabled');
  assert.equal(formPage.timers.size, 0, 'Clear the timeout after settlement');
  assert.deepEqual(formPage.navigation, [], 'Never navigate to a provider confirmation or open another window');
  assert.deepEqual(formPage.storage, [], 'Never persist or read contact data in browser storage');
}

function assertSent(formPage) {
  assert.equal(formPage.button.disabled, true, 'Keep sending disabled until the document is refreshed');
  assert.equal(formPage.button.textContent, 'Message sent');
  assert.notEqual(formPage.attributes.get('aria-busy'), 'true', 'A confirmed submission is no longer busy');
  assert.ok(formPage.fields.every(field => field.readOnly && !field.disabled), 'Keep the completed form read-only');
  assert.equal(formPage.status.dataset.state, 'success');
  assert.equal(formPage.status.textContent, 'Message sent.');
  assert.doesNotMatch(formPage.status.textContent, /refresh|send another message/i, 'Do not display instructions for bypassing the send lock');
  assert.equal(formPage.timers.size, 0);
  assert.deepEqual(formPage.navigation, [], 'The success popup must stay on the current page');
  assert.deepEqual(formPage.storage, [], 'The send lock is document-scoped, not persisted');
}

for (const success of [true, 'true']) {
  test(`contact stays on the page and resets only after provider success ${JSON.stringify(success)}`, async () => {
    const response = deferred();
    const formPage = page({ request: () => response.promise });
    const submission = formPage.submit();
    assert.equal(formPage.preventedCount, 1, 'Cancel the native external form submission');
    assert.equal(formPage.requests.length, 1);
    assert.equal(formPage.attributes.get('aria-busy'), 'true');
    assert.equal(formPage.button.disabled, true);
    assert.match(formPage.button.textContent, /sending/i);
    assert.ok(formPage.fields.every(field => field.readOnly && !field.disabled), 'Lock inputs without excluding them from FormData');
    assert.equal(formPage.resetCount, 0);
    const { url, options } = formPage.requests[0];
    assert.equal(url, endpoint);
    assert.equal(options.method.toUpperCase(), 'POST');
    assert.equal(options.credentials, 'omit', 'Do not send provider cookies');
    assert.equal(options.headers.Accept ?? options.headers.accept, 'application/json');
    assert.ok(options.signal instanceof AbortSignal, 'Requests must be abortable');
    assert.equal(options.body.get('email'), 'visitor@example.test');
    assert.equal(options.body.get('_subject'), 'Portfolio question');
    assert.match(options.body.get('message'), /must survive/);
    assert.equal(options.body.get('_honey'), '');
    assert.equal(options.body.get('_url'), 'https://www.ekopru.com/contact/');
    response.resolve({ ok: true, json: async () => ({ success, message: '<img src=x onerror=alert(1)>' }) });
    await submission;
    assert.equal(formPage.resetCount, 1);
    assert.ok(formPage.fields.every(field => field.value === ''));
    assert.match(formPage.status.textContent, /submitted|sent|received/i);
    assert.equal(formPage.status.dataset.state, 'success');
    assert.equal(formPage.popup.open, true, 'Show confirmation in a modal popup');
    assert.equal(formPage.popup.showCount, 1);
    assert.equal(formPage.closeButton.focused, true, 'The modal close control receives focus');
    assert.ok(!formPage.status.textContent.includes('<img'), 'Use a local acknowledgement, not provider output');
    assertSent(formPage);
  });
}

const failures = [
  ['explicit rejection', async () => ({ ok: true, json: async () => ({ success: false }) })],
  ['string rejection', async () => ({ ok: true, json: async () => ({ success: 'false' }) })],
  ['missing success', async () => ({ ok: true, json: async () => ({ message: 'Not confirmed' }) })],
  ['truthy non-boolean success', async () => ({ ok: true, json: async () => ({ success: 1 }) })],
  ['null JSON', async () => ({ ok: true, json: async () => null })],
  ['malformed JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })],
  ['non-success HTTP status', async () => ({ ok: false, status: 500, json: async () => ({ success: true }) })],
  ['network error', async () => { throw new TypeError('Failed to fetch'); }],
  ['aborted request', async () => { const error = new Error('Aborted'); error.name = 'AbortError'; throw error; }]
];

for (const [label, request] of failures) {
  test(`contact preserves the message and permits recovery after ${label}`, async () => {
    const formPage = page({ request });
    const original = formPage.fields.map(field => field.value);
    await formPage.submit();
    assert.equal(formPage.preventedCount, 1);
    assert.equal(formPage.requests.length, 1, 'Never retry an uncertain delivery automatically');
    assert.equal(formPage.resetCount, 0);
    assert.deepEqual(formPage.fields.map(field => field.value), original);
    assert.match(formPage.status.textContent, /could not|couldn't|unable|not confirm|unconfirmed|failed|try again/i);
    assert.equal(formPage.status.dataset.state, 'error');
    assert.equal(formPage.popup.showCount, 0, 'Never show success for an unconfirmed delivery');
    assertIdle(formPage);
  });
}

test('contact ignores duplicate submissions while the current request is pending', async () => {
  const response = deferred();
  const formPage = page({ request: () => response.promise });
  const first = formPage.submit();
  await formPage.submit();
  assert.equal(formPage.preventedCount, 2, 'Also cancel duplicate native submissions');
  assert.equal(formPage.requests.length, 1);
  response.resolve({ ok: true, json: async () => ({ success: true }) });
  await first;
  assert.equal(formPage.resetCount, 1);
  assertSent(formPage);
});

test('contact sends nothing when browser validation fails', async () => {
  const formPage = page({ valid: false });
  const original = formPage.fields.map(field => field.value);
  await formPage.submit();
  assert.equal(formPage.preventedCount, 1);
  assert.equal(formPage.validationCount, 1, 'Show native field validation');
  assert.equal(formPage.requests.length, 0);
  assert.equal(formPage.resetCount, 0);
  assert.deepEqual(formPage.fields.map(field => field.value), original);
  assertIdle(formPage);
});

test('contact aborts timed-out requests without navigating, clearing, or retrying', async () => {
  const formPage = page({ request: (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('Timed out');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  }) });
  const original = formPage.fields.map(field => field.value);
  const submission = formPage.submit();
  formPage.expire();
  await submission;
  assert.equal(formPage.requests[0].options.signal.aborted, true);
  assert.equal(formPage.requests.length, 1);
  assert.equal(formPage.resetCount, 0);
  assert.deepEqual(formPage.fields.map(field => field.value), original);
  assert.ok(formPage.status.textContent.trim(), 'Explain that delivery is unconfirmed');
  assertIdle(formPage);
});

test('contact allows another explicit submission after a failed attempt', async () => {
  let attempt = 0;
  const formPage = page({ request: async () => ({ ok: true, json: async () => ({ success: ++attempt === 2 }) }) });
  await formPage.submit();
  assert.equal(formPage.resetCount, 0);
  assertIdle(formPage);
  await formPage.submit();
  assert.equal(formPage.requests.length, 2);
  assert.equal(formPage.resetCount, 1);
  assert.equal(formPage.popup.showCount, 1, 'Only the confirmed retry opens the popup');
  assertSent(formPage);
});

for (const unavailable of ['fetch', 'FormData', 'AbortController']) {
  test(`contact preserves the message when ${unavailable} is unavailable`, async () => {
    const formPage = page();
    formPage.context[unavailable] = undefined;
    const original = formPage.fields.map(field => field.value);
    await formPage.submit();
    assert.equal(formPage.requests.length, 0);
    assert.equal(formPage.resetCount, 0);
    assert.deepEqual(formPage.fields.map(field => field.value), original);
    assert.equal(formPage.status.dataset.state, 'error');
    assertIdle(formPage);
  });
}

test('contact restores preexisting read-only fields after failure', async () => {
  const formPage = page({ request: async () => ({ ok: true, json: async () => ({ success: false }) }) });
  formPage.fields[1].readOnly = true;
  await formPage.submit();
  assert.equal(formPage.resetCount, 0);
  assertIdle(formPage, [false, true, false]);
});

for (const dismiss of ['closePopup', 'escapePopup']) {
  test(`contact ${dismiss} dismisses confirmation without unlocking another submission`, async () => {
    const formPage = page();
    assert.equal(formPage.popup.open, false, 'Do not open a popup before submission');
    assert.equal(formPage.popup.showCount, 0);
    await formPage.submit();
    assert.equal(formPage.popup.open, true);
    formPage[dismiss]();
    assert.equal(formPage.popup.open, false);
    assert.equal(formPage.popup.closeCount, 1);
    assert.equal(formPage.status.focused, true, 'Return focus to the success status, not the disabled submit control');
    const validationCount = formPage.validationCount;
    await formPage.submit();
    await formPage.submit();
    assert.equal(formPage.requests.length, 1, 'Enter and synthetic submit events cannot bypass the completed-send guard');
    assert.equal(formPage.resetCount, 1, 'Repeated events do not clear form state again');
    assert.equal(formPage.validationCount, validationCount, 'Check the completed-send guard before browser validation');
    assert.equal(formPage.popup.showCount, 1, 'Do not reopen the success popup on duplicate events');
    assertSent(formPage);
  });
}

test('contact blocks duplicate submissions even while the success popup is still open', async () => {
  const formPage = page();
  await formPage.submit();
  await formPage.submit();
  assert.equal(formPage.requests.length, 1);
  assert.equal(formPage.resetCount, 1);
  assert.equal(formPage.popup.showCount, 1);
  assert.equal(formPage.popup.open, true);
  assertSent(formPage);
});

test('a refreshed contact page starts unlocked even if the browser restores a disabled submit control', async () => {
  const beforeRefresh = page();
  await beforeRefresh.submit();
  assertSent(beforeRefresh);
  const afterRefresh = page({ initialSubmitDisabled: true });
  assertIdle(afterRefresh);
  assert.equal(afterRefresh.popup.open, false);
  assert.equal(afterRefresh.status.textContent, '');
  await afterRefresh.submit();
  assert.equal(afterRefresh.requests.length, 1, 'A new document permits a new explicit message');
  assertSent(afterRefresh);
});

for (const dialog of ['missing', 'unsupported', 'throwing']) {
  test(`contact remains successfully locked with a ${dialog} confirmation dialog`, async () => {
    const formPage = page({ dialog });
    await formPage.submit();
    assert.equal(formPage.resetCount, 1);
    assert.equal(formPage.status.focused, true, 'Use the inline status when a modal cannot open');
    assert.equal(formPage.popup?.open ?? false, false);
    await formPage.submit();
    assert.equal(formPage.requests.length, 1, 'Dialog presentation failure must not enable a duplicate send');
    assertSent(formPage);
  });
}
