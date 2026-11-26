import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isPuzzleDate, parsePuzzle } from '../lib/puzzles/parse.ts';

const directory = new URL('../puzzles/', import.meta.url);
const files = await readdir(directory, { withFileTypes: true });
let checked = 0;
let failures = 0;
for (const file of files) {
  if (file.name === 'README.md') continue;
  try {
    const match = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(file.name);
    if (!file.isFile() || !match || !isPuzzleDate(match[1])) {
      throw new Error('filename must be a real YYYY-MM-DD.json date');
    }
    const data = JSON.parse(await readFile(new URL(file.name, directory), 'utf8'));
    parsePuzzle(data, match[1]);
    checked++;
  } catch (error) {
    console.error(`${fileURLToPath(directory)}${file.name}: ${error.message}`);
    failures++;
  }
}
if (!checked && !failures) {
  console.error('No puzzle files found');
  failures++;
}
console.log(`Validated ${checked} puzzle file(s); ${failures} failure(s).`);
if (failures) process.exitCode = 1;
