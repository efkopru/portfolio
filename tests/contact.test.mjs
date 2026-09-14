import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profile } from '../content/portfolio.mjs';

test('contact form supports same-page delivery only to the configured FormSubmit recipient', async () => {
  const html = await readFile(new URL('../dist/contact/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('<p class="detail-lead">I welcome any comments or feedback and would be happy to discuss your project requirements.</p>'));
  assert.ok(!html.includes('For geospatial data science, data engineering, and software engineering roles or project work.'));
  const form = html.match(/<form\b[^]*?<\/form>/)?.[0];
  assert.ok(form);
  assert.ok(form.includes(`action="https://formsubmit.co/${profile.email}" method="POST"`));
  assert.match(form, /\bdata-contact-form(?:\s|>)/);
  assert.ok(form.includes(`data-contact-endpoint="https://formsubmit.co/ajax/${profile.email}"`));
  assert.doesNotMatch(html, /\bcontact-privacy\b/, 'Remove the privacy note and its accessibility reference together');
  assert.doesNotMatch(html, /Your email, subject, and message are sent through FormSubmit/);
  assert.doesNotMatch(html, /Submission results appear here without leaving this page/);
  assert.doesNotMatch(html, /<a\b[^>]*\bhref="[^"]*\/privacy(?:\/|\.html)[^"]*"/i, 'Keep privacy links off the contact page');
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
});

test('contact pages omit direct email, public work, and location sections', async () => {
  for (const path of ['../contact/index.html', '../dist/contact/index.html']) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    const main = html.match(/<main\b[^]*?<\/main>/)?.[0];
    assert.ok(main, `${path}: retain the Contact content region`);
    assert.doesNotMatch(main, /\bcontact-(?:fallback|block)\b/, `${path}: remove the former supplemental sections`);
    assert.doesNotMatch(main, /You can also email|Based in Dallas, Texas\./i);
    assert.doesNotMatch(main, /<h[1-6]\b[^>]*>\s*Public work\s*<\/h[1-6]>/i);
    assert.doesNotMatch(main, /<a\b[^>]*\bhref="(?:mailto:|https?:\/\/(?:www\.)?github\.com\/efkopru(?:[/?#"]))/i,
      `${path}: keep removed direct email and GitHub links out of the visible Contact content`);
    assert.doesNotMatch(main, /email link below/i, `${path}: do not refer to a removed fallback link`);
  }
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

test('published footers omit privacy notes while the direct privacy page remains available', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/build-manifest.json', import.meta.url), 'utf8'));
  assert.ok(manifest.pages.includes('privacy/index.html'), 'Retain the existing direct route');
  for (const path of manifest.pages) {
    const html = await readFile(new URL(`../dist/${path}`, import.meta.url), 'utf8');
    const footer = html.match(/<footer\b[^]*?<\/footer>/)?.[0];
    assert.ok(footer, `${path}: retain the site footer`);
    assert.doesNotMatch(footer, /privacy/i, `${path}: remove visible privacy links and notes`);
  }
});

test('contact success popup is accessible, initially closed, and independent of form submission', async () => {
  const html = await readFile(new URL('../dist/contact/index.html', import.meta.url), 'utf8');
  const form = html.match(/<form\b[^]*?<\/form>/)?.[0];
  const dialog = html.match(/<dialog\b[^]*?<\/dialog>/)?.[0];
  assert.ok(dialog, 'Render a native dialog for the success confirmation');
  const startTag = dialog.match(/^<dialog\b[^>]*>/)[0];
  assert.match(startTag, /\bclass="[^"]*\bcontact-success\b[^"]*"/);
  assert.match(startTag, /\bdata-contact-success(?:\s|>)/);
  assert.match(startTag, /\baria-labelledby="contact-success-title"/);
  assert.match(startTag, /\baria-describedby="contact-success-description"/);
  assert.doesNotMatch(startTag, /\sopen(?:\s|=|>)/, 'Only a confirmed submission may open the modal');
  assert.match(dialog, /<h2\b[^>]*\bid="contact-success-title"[^>]*>Message sent<\/h2>/);
  assert.match(dialog, /<p\b[^>]*\bid="contact-success-description"[^>]*>Thank you\. Your message has been submitted successfully\.<\/p>/);
  assert.doesNotMatch(dialog, /refresh|send another message/i, 'The confirmation does not instruct visitors to bypass the send lock');
  assert.match(dialog, /<button\b(?=[^>]*\btype="button")(?=[^>]*\bdata-contact-success-close(?:\s|>))(?=[^>]*\bautofocus(?:\s|>))[^>]*>Close<\/button>/);
  assert.ok(!form.includes('data-contact-success'), 'The confirmation cannot resubmit or sit inside the busy form');
  const submit = form.match(/<button\b[^>]*\bdata-contact-submit[^>]*>/)?.[0];
  assert.ok(submit);
  assert.doesNotMatch(submit, /\sdisabled(?:\s|=|>)/, 'A fresh page starts with an available submit control');
});
