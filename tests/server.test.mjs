import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

test('full-size screenshots are served as images instead of downloads', async t => {
  const server = spawn(process.execPath, ['scripts/serve.mjs', 'dist'], { cwd: fileURLToPath(new URL('../', import.meta.url)), env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => server.kill());
  const origin = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Preview server did not start')), 10000);
    server.once('error', reject);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/Local: (http:\/\/127\.0\.0\.1:\d+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview server exited: ${code}`)); });
  });
  for (const [path, mime] of [['spatial-analysis-01.png', 'image/png'], ['spatial-analysis-06.jpg', 'image/jpeg'], ['spatial-analysis-01-preview.webp', 'image/webp']]) {
    const response = await fetch(`${origin}/assets/screenshots/${path}`, { method: 'HEAD' });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), mime);
    assert.equal(response.headers.get('content-disposition'), null);
  }
  const exited = once(server, 'exit');
  server.kill();
  await exited;
});
