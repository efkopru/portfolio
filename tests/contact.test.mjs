import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profile } from '../content/portfolio.mjs';

test('contact form supports same-page delivery only to the configured FormSubmit recipient', async () => {
  const html = await readFile(new URL('../dist/contact/index.html', import.meta.url), 'utf8');
  const form = html.match(/<form\b[^]*?<\/form>/)?.[0];
  assert.ok(form);
  assert.ok(form.includes(`action="https://formsubmit.co/${profile.email}" method="POST"`));
  assert.match(form, /\bdata-contact-form(?:\s|>)/);
  assert.ok(form.includes(`data-contact-endpoint="https://formsubmit.co/ajax/${profile.email}"`));
  assert.ok(form.includes('aria-describedby="contact-privacy"'));
  for (const [id, name, label] of [['contact-email', 'email', 'Your email'], ['contact-subject', '_subject', 'Subject'], ['contact-message', 'message', 'Message']]) {
    assert.ok(form.includes(`<label for="${id}">${label}</label>`));
    assert.match(form, new RegExp(`<(?:input|textarea) id="${id}" name="${name}"[^>]* required`));
  }
  assert.ok(form.includes('type="email" autocomplete="email"'));
  assert.ok(form.includes('name="_honey"'));
  assert.ok(!form.includes('name="_captcha"'), 'Keep provider spam protection enabled');
  assert.ok(!form.includes('name="_next"'), 'AJAX confirms submission in place without a redirect');
  const origin = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8')).origin;
  assert.ok(form.includes(`name="_url" value="${origin}/contact/"`));
  assert.match(form, /<button\b(?=[^>]*\btype="submit")(?=[^>]*\bdata-contact-submit)[^>]*>Send message<\/button>/);
  const status = html.match(/<[^>]+\bid="contact-status"[^>]*>\s*<\/[^>]+>/)?.[0];
  assert.ok(status, 'Provide an initially empty status region');
  assert.match(status, /\bdata-contact-status(?:\s|>)/);
  assert.match(status, /\brole="status"/);
  assert.match(status, /\baria-live="polite"/);
  assert.match(status, /\baria-atomic="true"/);
  assert.match(status, /\btabindex="-1"/, 'Completion status supports programmatic focus');
  assert.ok(!form.includes('id="contact-status"'), 'Announcements stay outside the busy form');
  assert.ok(html.includes(`href="mailto:${profile.email}"`), 'Keep direct email fallback');
});

test('contact delivery permission and privacy disclosure match the form', async () => {
  const headers = await readFile(new URL('../dist/_headers', import.meta.url), 'utf8');
  assert.match(headers, /form-action https:\/\/formsubmit\.co;/);
  assert.match(headers, /connect-src https:\/\/formsubmit\.co;/);
  const privacy = await readFile(new URL('../dist/privacy/index.html', import.meta.url), 'utf8');
  assert.ok(privacy.includes('email address, subject, and message to FormSubmit'));
  assert.ok(privacy.includes('https://formsubmit.co/privacy.pdf'));
  assert.ok(!privacy.includes('No contact form collects or submits'));
});
