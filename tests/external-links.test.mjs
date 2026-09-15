import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import {
  collectProjectLinks, isPublicAddress, validatePublicUrl, requestPublicUrl, checkProjectLink, checkProjectLinks
} from '../scripts/check-external-links.mjs';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const page = (body = '<title>Public project</title>', options = {}) => new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...options });
const target = { url: 'https://projects.example.org/work/', projects: ['public-project'] };

test('external checks deduplicate only project links and embeds and exclude unlisted projects', () => {
  const links = collectProjectLinks([
    { id: 'one', links: [{ url: 'https://github.com/efkopru/example#readme' }], embed: { url: 'https://maps.example.org/' }, action: 'https://formsubmit.co/private' },
    { id: 'two', links: [{ url: 'https://github.com/efkopru/example' }] },
    { id: 'lead-service-line-ocr', links: [{ url: 'https://excluded.example.org/' }] },
    { id: 'empty' }
  ]);
  assert.deepEqual(links, [
    { url: 'https://github.com/efkopru/example', projects: ['one', 'two'] },
    { url: 'https://maps.example.org/', projects: ['one'] }
  ]);
});

test('external checker refuses private/reserved IPs, credentials, non-HTTPS, nonstandard ports, and FormSubmit', () => {
  for (const address of ['127.0.0.1', '10.2.3.4', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '192.0.2.1', '198.18.1.1', '203.0.113.1', '224.0.0.1', '::1', 'fe80::1', 'fc00::1', '::ffff:127.0.0.1', '2001:db8::1', '2001::1', '2001:0000:1234::1', '2002:7f00:1::']) {
    assert.equal(isPublicAddress(address), false, address);
  }
  for (const address of ['93.184.216.34', '8.8.8.8', '2606:4700:4700::1111']) assert.equal(isPublicAddress(address), true, address);
  for (const url of [
    'http://projects.example.org/', 'https://user:password@projects.example.org/',
    'https://projects.example.org:444/', 'https://localhost/', 'https://service.internal/',
    'https://127.1/', 'https://[::1]/', 'https://2130706433/',
    'https://formsubmit.co/person@example.org', 'https://www.formsubmit.co/ajax/person@example.org'
  ]) assert.throws(() => validatePublicUrl(url), undefined, url);
  assert.equal(validatePublicUrl(`${target.url}#readme`).href, target.url);
});

test('checker imports and CLI without --run perform no network work', () => {
  const result = spawnSync(process.execPath, ['scripts/check-external-links.mjs'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 5000
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /No network requests made/);
});

test('reachable checks use bounded read-only GET without following redirects automatically', async () => {
  const calls = [];
  const result = await checkProjectLink(target, {
    lookupImpl: publicLookup,
    fetchImpl: async (url, options) => { calls.push({ url, options }); return page(); }
  });
  assert.equal(result.status, 'reachable');
  assert.equal(result.httpStatus, 200);
  assert.equal(calls.length, 1);
  const { options } = calls[0];
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'manual');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.body, undefined);
  assert.equal(options.headers.Range, 'bytes=0-8191');
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers.Cookie, undefined);
});

test('HTTPS transport pins the connection to checked DNS addresses without a second lookup', async () => {
  const addresses = [{ address: '93.184.216.34', family: 4 }];
  for (const status of [200, 204]) {
    const response = await requestPublicUrl(target.url, { method: 'GET', headers: {}, signal: new AbortController().signal }, addresses, (url, options, callback) => {
      assert.equal(url, target.url);
      assert.equal(options.method, 'GET');
      options.lookup('projects.example.org', { all: true }, (error, pinned) => { assert.equal(error, null); assert.deepEqual(pinned, addresses); });
      options.lookup('projects.example.org', {}, (error, pinned, family) => { assert.equal(error, null); assert.equal(pinned, addresses[0].address); assert.equal(family, 4); });
      const pending = new EventEmitter();
      pending.end = () => {
        const stream = Readable.from(status === 204 ? [] : [Buffer.from('<title>Public project</title>')]);
        stream.statusCode = status;
        stream.headers = { 'content-type': 'text/html' };
        callback(stream);
      };
      return pending;
    });
    assert.equal(response.status, status);
    assert.equal(await response.text(), status === 204 ? '' : '<title>Public project</title>');
  }
});

test('HTTP auth, bot challenges, rate limits, and outages require manual review and are not green', async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    const result = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => page('Unverified', { status }) });
    assert.equal(result.status, 'manual', `HTTP ${status}`);
    assert.equal(result.httpStatus, status);
  }
  for (const body of ['<title>Just a moment</title>', 'Verify you are human', 'Login required', 'Access denied']) {
    const result = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => page(body) });
    assert.equal(result.status, 'manual', body);
  }
  const challenge = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => page('', { headers: { 'cf-mitigated': 'challenge' } }) });
  assert.equal(challenge.status, 'manual');
});

test('404 and 410 are broken links, not successful or merely manual responses', async () => {
  for (const status of [404, 410]) {
    const result = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => page('Missing', { status }) });
    assert.equal(result.status, 'broken');
    assert.equal(result.httpStatus, status);
  }
});

test('DNS safety is checked before requesting both original and redirected URLs', async () => {
  let requests = 0;
  const privateDns = await checkProjectLink(target, {
    lookupImpl: async () => [{ address: '93.184.216.34' }, { address: '10.0.0.1' }],
    fetchImpl: async () => { requests++; return page(); }
  });
  assert.equal(privateDns.status, 'blocked');
  assert.equal(requests, 0);
  for (const location of ['https://127.0.0.1/', 'https://formsubmit.co/user@example.org', 'https://secret:token@projects.example.org/', 'http://projects.example.org/']) {
    requests = 0;
    const result = await checkProjectLink(target, {
      lookupImpl: publicLookup,
      fetchImpl: async () => { requests++; return page('', { status: 302, headers: { location } }); }
    });
    assert.equal(result.status, 'blocked', location);
    assert.equal(requests, 1, 'Never request an unsafe redirect destination');
  }
  requests = 0;
  const result = await checkProjectLink(target, {
    lookupImpl: async host => [{ address: host === 'projects.example.org' ? '93.184.216.34' : '192.168.1.1' }],
    fetchImpl: async () => { requests++; return page('', { status: 302, headers: { location: 'https://redirect.example.org/' } }); }
  });
  assert.equal(result.status, 'blocked');
  assert.equal(requests, 1);
});

test('public redirects are followed within the cap and preserve the original report target', async () => {
  const calls = [];
  const result = await checkProjectLink(target, {
    lookupImpl: publicLookup,
    fetchImpl: async url => {
      calls.push(url);
      return calls.length === 1 ? page('', { status: 301, headers: { location: '/new/' } }) : page();
    }
  });
  assert.equal(result.url, target.url);
  assert.equal(result.finalUrl, 'https://projects.example.org/new/');
  assert.equal(result.status, 'reachable');
  assert.equal(calls.length, 2);
  let loops = 0;
  const looping = await checkProjectLink(target, {
    lookupImpl: publicLookup,
    fetchImpl: async () => { loops++; return page('', { status: 302, headers: { location: '/loop/' } }); }
  });
  assert.equal(looping.status, 'manual');
  assert.equal(loops, 5);
});

test('timeouts bound DNS and fetch work, and failures are reported as inconclusive', async () => {
  const stalled = () => new Promise(() => {});
  for (const options of [{ lookupImpl: stalled }, { lookupImpl: publicLookup, fetchImpl: stalled }]) {
    const result = await checkProjectLink(target, { ...options, timeoutMs: 15 });
    assert.equal(result.status, 'manual');
    assert.match(result.detail, /timed out/);
  }
  const failed = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => { throw new Error('Connection reset'); } });
  assert.equal(failed.status, 'manual');
  assert.match(failed.detail, /inconclusive/);
});

test('checker cancels response bodies after the bounded sample and times out stalled streams', async () => {
  let cancelled = false;
  let reads = 0;
  const body = new ReadableStream({
    pull(controller) { reads++; controller.enqueue(new TextEncoder().encode('a'.repeat(8192))); },
    cancel() { cancelled = true; }
  });
  const result = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => new Response(body) });
  assert.equal(result.status, 'reachable');
  assert.equal(cancelled, true);
  assert.ok(reads <= 2, 'Do not buffer an unbounded remote page');
  const stalled = new ReadableStream({ pull() { return new Promise(() => {}); } });
  const timeout = await checkProjectLink(target, { lookupImpl: publicLookup, fetchImpl: async () => new Response(stalled), timeoutMs: 15 });
  assert.equal(timeout.status, 'manual');
  assert.match(timeout.detail, /timed out/);
});

test('batch checking bounds concurrency and preserves report order', async () => {
  let active = 0;
  let peak = 0;
  const targets = Array.from({ length: 8 }, (_, index) => ({ url: `https://projects.example.org/${index}/`, projects: [`project-${index}`] }));
  const results = await checkProjectLinks(targets, {
    concurrency: 2, lookupImpl: publicLookup,
    fetchImpl: async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return page();
    }
  });
  assert.equal(peak, 2);
  assert.deepEqual(results.map(result => result.url), targets.map(item => item.url));
  assert.ok(results.every(result => result.status === 'reachable'));
  await assert.rejects(checkProjectLinks(targets, { concurrency: 10 }), /concurrency/);
});
