import { spawn } from 'node:child_process';

/**
 * Menjalankan API dan front-end berdampingan.
 *
 * Ditulis sendiri alih-alih menambah `concurrently`: yang dibutuhkan hanya
 * dua proses anak dan satu penutupan bersama, dan proyek ini sejak awal
 * menahan diri dari dependensi yang tidak benar-benar perlu.
 */

const tasks = [
  { name: 'api', color: '\x1b[36m', args: ['run', 'dev', '--workspace', 'backend'] },
  { name: 'web', color: '\x1b[35m', args: ['run', 'dev', '--workspace', 'frontend'] },
];

const children = [];
let shuttingDown = false;

for (const task of tasks) {
  const child = spawn('npm', task.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  const prefix = `${task.color}[${task.name}]\x1b[0m `;
  const forward = (stream, target) => {
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) target.write(prefix + line + '\n');
    });
  };

  forward(child.stdout, process.stdout);
  forward(child.stderr, process.stderr);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    console.error(`${prefix}berhenti dengan kode ${code}. Menutup proses lainnya.`);
    shutdown(code ?? 1);
  });

  children.push(child);
}

function shutdown(code) {
  shuttingDown = true;
  for (const child of children) child.kill('SIGTERM');
  process.exit(code);
}

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => shutdown(0));

console.log('\nAPI  → http://127.0.0.1:4000/api');
console.log('Web  → http://localhost:5173\n');
