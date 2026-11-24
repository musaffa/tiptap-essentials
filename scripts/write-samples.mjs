// Writes each sample to the directory named, a file each, with the version of
// the library they are from beside them: a project storing bodies keeps a copy
// to check it keeps what the editor writes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as samples from '../dist/samples.js';

const [directory] = process.argv.slice(2);

if (!directory) {
  console.error('Usage: npm run write-samples -- <dir>');
  process.exit(1);
}

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

mkdirSync(directory, { recursive: true });
for (const [name, markup] of Object.entries(samples)) {
  writeFileSync(join(directory, `${name}.html`), `${markup}\n`);
}
writeFileSync(join(directory, 'VERSION'), `${version}\n`);
