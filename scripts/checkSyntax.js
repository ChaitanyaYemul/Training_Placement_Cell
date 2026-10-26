import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

// JSX is parsed by ESLint and Vite; Node checks server, CLI, and plain JS modules.
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      [
        'node_modules',
        '.git',
        'dist',
        'test-results',
        'playwright-report',
      ].includes(entry.name)
    )
      continue;
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await check(path);
    else if (entry.name.endsWith('.js')) {
      const result = spawnSync(process.execPath, ['--check', path], {
        stdio: 'inherit',
      });
      if (result.status !== 0) process.exitCode = 1;
    }
  }
}
await check('.');
