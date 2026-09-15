import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run(['scripts/build.mjs']);
run(['scripts/check.mjs']);
run(['scripts/build.mjs', '--preview']);
run(['scripts/check.mjs', 'dist-preview']);
// A reserved origin makes this a validation artifact, never a deploy command.
run(['scripts/build.mjs', '--candidate'], { ...process.env, SITE_URL: 'https://portfolio-validation.example' });
run(['scripts/check.mjs', 'dist-candidate']);
run(['--test', 'tests/*.test.mjs']);
