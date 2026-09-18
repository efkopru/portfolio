import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { companions } from '../content/evidence.mjs';

// Each suite gets its own interpreter so the examples' demo modules cannot collide.
const root = fileURLToPath(new URL('../', import.meta.url));
const candidates = process.env.PYTHON
  ? [[process.env.PYTHON, []]]
  : [['python', []], ['python3', []], ['py', ['-3']]];
const interpreter = candidates.find(([command, prefix]) => {
  const probe = spawnSync(command, [...prefix, '-c', 'import sqlite3, sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)'], { timeout: 10000, windowsHide: true, stdio: 'ignore' });
  return !probe.error && probe.status === 0;
});
if (!interpreter) {
  console.error('Python 3.10+ with sqlite3 is required. Set PYTHON to the full interpreter path or install Python on PATH. Do not put command-line arguments in PYTHON.');
  process.exit(1);
}
const [command, prefix] = interpreter;
let failed = false;
for (const companion of companions) {
  console.log(`Testing ${companion.id}`);
  const result = spawnSync(command, [...prefix, '-m', 'unittest', 'discover', '-s', `examples/${companion.id}`, '-p', 'test_*.py', '-v'], { cwd: root, windowsHide: true, stdio: 'inherit', timeout: 120000 });
  if (result.error || result.status !== 0) {
    failed = true;
    console.error(`${companion.id}: ${result.error?.message || `test process exited ${result.status ?? result.signal}`}`);
  }
}
process.exitCode = failed ? 1 : 0;
