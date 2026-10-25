import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const root = new URL('../', import.meta.url);
const dictionary = JSON.parse(fs.readFileSync(new URL('zh-TW.json', root), 'utf8'));
const extra = JSON.parse(fs.readFileSync(new URL('zh-TW.extra.json', root), 'utf8'));
const slots = s => [...s.matchAll(/\{(\d+)\}/g)].map(m => +m[1]).sort().join(',');
for (const [key, value] of Object.entries(dictionary)) {
  assert.equal(typeof value, 'string', key);
  assert.ok(value.trim(), key);
}
let extras = 0;
for (const [key, value] of Object.entries(extra)) {
  if (key.startsWith('_')) continue;
  const count = (key.match(/[#*]/g) ?? []).length;
  assert.equal(slots(value), [...Array(count).keys()].join(','), key);
  extras++;
}
if (process.argv[2]) {
  const ko = (await import(pathToFileURL(process.argv[2]).href)).default;
  for (const [key, value] of Object.entries(ko)) {
    assert.ok(dictionary[key], `Missing translation: ${key}`);
    const count = (key.match(/[#*]/g) ?? []).length;
    assert.ok(slots(dictionary[key]) === slots(value) || slots(dictionary[key]) === [...Array(count).keys()].join(','), key);
  }
  console.log(`PASS: all ${Object.keys(ko).length} game dictionary entries covered.`);
}
console.log(`PASS: ${Object.keys(dictionary).length} translations and ${extras} supplemental entries.`);
