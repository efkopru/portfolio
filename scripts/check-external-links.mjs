import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request } from 'node:https';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';
import { siteProjects, unlistedProjectIds } from '../content/site-structure.mjs';

// This checker reads explicitly published project links only. It never visits
// form actions, submits a form, or sends cookies, credentials, or project data.
export function collectProjectLinks(projects = siteProjects) {
  const targets = new Map();
  for (const project of projects) {
    if (unlistedProjectIds.has(project.id)) continue;
    for (const link of [...(project.links || []), ...(project.embed ? [project.embed] : [])]) {
      if (!link.url) continue;
      let url;
      try { url = new URL(link.url); } catch { url = null; }
      if (url) url.hash = '';
      const key = url?.href || link.url;
      const target = targets.get(key) || { url: key, projects: [] };
      if (!target.projects.includes(project.id)) target.projects.push(project.id);
      targets.set(key, target);
    }
  }
  return [...targets.values()];
}

export function isPublicAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (version === 6) {
    // Permit global unicast only, excluding documentation and transition ranges.
    const first = Number.parseInt(address.split(':')[0], 16);
    const second = Number.parseInt(address.split(':')[1] || '0', 16);
    return first >= 0x2000 && first <= 0x3fff &&
      !(first === 0x2001 && [0, 0xdb8, 0x10, 0x20].includes(second)) && first !== 0x2002;
  }
  return false;
}

export function validatePublicUrl(input) {
  const url = new URL(input);
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (url.protocol !== 'https:') throw new Error('Only HTTPS project links are allowed');
  if (url.username || url.password) throw new Error('Credential-bearing URLs are not allowed');
  if (url.port && url.port !== '443') throw new Error('Only the standard HTTPS port is allowed');
  if (host === 'formsubmit.co' || host.endsWith('.formsubmit.co')) throw new Error('Form services are excluded');
  if (isIP(host)) {
    if (!isPublicAddress(host)) throw new Error('Non-public IP addresses are excluded');
  } else if (!host.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(host)) {
    throw new Error('Non-public hostnames are excluded');
  }
  url.hash = '';
  return url;
}

function withAbort(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolvePromise, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolvePromise, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

export function requestPublicUrl(url, options, addresses, requestImpl = request) {
  // Pin this connection to the already-validated DNS answers. A second DNS
  // lookup in a generic fetch client could otherwise permit DNS rebinding.
  return new Promise((resolveResponse, reject) => {
    const pending = requestImpl(url, {
      method: options.method, headers: options.headers, signal: options.signal,
      lookup(_hostname, lookupOptions, callback) {
        const validated = addresses.map(({ address, family }) => ({ address, family: family || isIP(address) }));
        if (lookupOptions?.all) callback(null, validated);
        else callback(null, validated[0].address, validated[0].family);
      }
    }, response => {
      try {
        const hasBody = ![204, 205, 304].includes(response.statusCode);
        if (!hasBody) response.resume();
        resolveResponse(new Response(hasBody ? Readable.toWeb(response) : null, {
          status: response.statusCode, headers: response.headers
        }));
      } catch (error) {
        response.destroy();
        reject(error);
      }
    });
    pending.once('error', reject);
    pending.end();
  });
}

async function sampleBody(response, signal, limit = 8192) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (length < limit) {
      const { done, value } = await withAbort(reader.read(), signal);
      if (done) break;
      const chunk = value.slice(0, limit - length);
      chunks.push(chunk);
      length += chunk.length;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function checkProjectLink(target, {
  fetchImpl, lookupImpl = lookup, timeoutMs = 8000, maxRedirects = 4
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('timeoutMs must be between 1 and 30000');
  if (!Number.isInteger(maxRedirects) || maxRedirects < 0 || maxRedirects > 5) throw new Error('maxRedirects must be between 0 and 5');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);
  let current = target.url;
  const result = (status, detail, httpStatus) => ({ ...target, finalUrl: current, status, detail, ...(httpStatus ? { httpStatus } : {}) });
  try {
    for (let redirects = 0; redirects <= maxRedirects; redirects++) {
      let url;
      try { url = validatePublicUrl(current); }
      catch (error) { return result('blocked', error.message); }
      const host = url.hostname.replace(/^\[|\]$/g, '');
      const addresses = isIP(host) ? [{ address: host }] : await withAbort(lookupImpl(host, { all: true, verbatim: true }), controller.signal);
      if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) return result('blocked', 'DNS includes a non-public address');
      const requestOptions = {
        method: 'GET', redirect: 'manual', credentials: 'omit', signal: controller.signal,
        headers: { Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1', 'Accept-Encoding': 'identity', Range: 'bytes=0-8191', 'User-Agent': 'EkPortfolioLinkCheck/1.0' }
      };
      const response = await withAbort(fetchImpl ? fetchImpl(url.href, requestOptions) : requestPublicUrl(url.href, requestOptions, addresses), controller.signal);
      if (response.status >= 300 && response.status < 400) {
        response.body?.cancel().catch(() => {});
        const location = response.headers.get('location');
        if (!location || redirects === maxRedirects) return result('manual', 'Missing redirect target or redirect limit reached', response.status);
        current = new URL(location, url).href;
        continue;
      }
      if (response.status === 404 || response.status === 410) {
        response.body?.cancel().catch(() => {});
        return result('broken', 'Page not found or removed', response.status);
      }
      if (!response.ok) {
        response.body?.cancel().catch(() => {});
        return result('manual', 'HTTP response needs browser review; not verified reachable', response.status);
      }
      const body = await sampleBody(response, controller.signal);
      if (/captcha|verify (?:that )?you are (?:a )?human|just a moment|access denied|checking your browser|sign in to (?:continue|your account)|login required/i.test(body) || response.headers.get('cf-mitigated') === 'challenge') {
        return result('manual', 'Possible sign-in or anti-bot response; inspect in a browser', response.status);
      }
      return result('reachable', 'HTTP response received; application behavior still needs browser testing', response.status);
    }
    return result('manual', 'Redirect limit reached');
  } catch (error) {
    return result('manual', controller.signal.aborted ? 'Request timed out; inspect in a browser' : `Network check inconclusive: ${error.message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function checkProjectLinks(targets, { concurrency = 3, ...options } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 5) throw new Error('concurrency must be between 1 and 5');
  const results = new Array(targets.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, async () => {
    while (next < targets.length) {
      const index = next++;
      results[index] = await checkProjectLink(targets[index], options);
    }
  }));
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv.includes('--run')) {
    console.log('No network requests made. Run node scripts/check-external-links.mjs --run to check public project links. Manual-review and broken results exit nonzero.');
  } else {
    const results = await checkProjectLinks(collectProjectLinks());
    for (const result of results) console.log(`${result.status.toUpperCase()} ${result.url}\n  ${result.detail}${result.httpStatus ? ` (HTTP ${result.httpStatus})` : ''}`);
    console.log(`${results.filter(result => result.status === 'reachable').length}/${results.length} HTTP-reachable. This does not verify embedded application behavior.`);
    if (results.some(result => result.status !== 'reachable')) process.exitCode = 1;
  }
}
