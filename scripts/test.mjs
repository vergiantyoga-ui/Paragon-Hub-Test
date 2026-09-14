import { execFileSync } from 'node:child_process';

/** Menjalankan pemeriksaan backend lalu front-end. */
const suites = [
  ['API, basis data, dan otorisasi', ['test', '--workspace', 'backend']],
  ['Front-end: transisi status, mesin, render', ['test', '--workspace', 'frontend']],
];

try {
  for (const [label, args] of suites) {
    console.log(`\n════ ${label} ════`);
    execFileSync('npm', ['run', ...args], { stdio: 'inherit' });
  }
  console.log('\nSeluruh pemeriksaan lolos.\n');
} catch {
  console.error('\nAda pemeriksaan yang gagal.\n');
  process.exit(1);
}
