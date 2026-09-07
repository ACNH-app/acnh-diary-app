const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('../acnh-diary-mobile/node_modules/typescript');
const file = path.resolve(__dirname, '../acnh-diary-mobile/src/data/nook-shopping.ts');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
}).outputText;
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = module.paths;
loaded._compile(compiled, file);
const { getNookShoppingEvents } = loaded.exports;
const { items } = require('../acnh-diary-mobile/src/data/content/catalog/catalog.json');
const { events } = require('../acnh-diary-mobile/src/data/content/catalog/nook-shopping-events.json');
const { years } = require('../acnh-diary-mobile/src/data/content/catalog/nook-shopping-years.json');
const products = items.filter(item => item.source?.includes('너굴 쇼핑') && item.sourceNotes?.includes('계절 한정'));
const get = (date, hemisphere = 'north') => getNookShoppingEvents(new Date(`${date}T00:00:00Z`), hemisphere, products);
const ids = date => get(date).map(event => event.id);
const names = date => get(date).flatMap(event => event.items.map(item => item.nameEn));
assert.equal(new Set(events.flatMap(event => event.items)).size, 92);
assert.equal(products.length, 92);
for (const event of events) for (const name of event.items) {
  assert.equal(products.filter(item => item.nameEn === name).length, 1, `Unique catalog match: ${name}`);
}
assert.deepEqual(ids('2026-09-07'), ['grape']);
assert.deepEqual(ids('2026-09-15'), ['grape']);
assert.deepEqual(ids('2026-09-16'), ['grape', 'moon']);
assert.deepEqual(ids('2026-09-25'), ['grape', 'moon']);
assert.deepEqual(ids('2026-09-26'), ['grape']);
assert.deepEqual(ids('2026-10-01'), []);
assert.deepEqual(get('2026-09-07')[0].items.map(item => item.nameKo), ['포도 수확 바구니']);
assert.equal(get('2026-09-07')[0].items[0].buyPrice, 800);
assert.ok(ids('2025-10-06').includes('moon'));
assert.ok(!ids('2025-10-07').includes('moon'));
assert.ok(ids('2026-02-15').includes('lunar-new-year'));
assert.ok(!ids('2026-02-23').includes('lunar-new-year'));
assert.ok(ids('2026-01-26').includes('carnival'));
assert.ok(!ids('2026-01-25').includes('carnival'));
assert.ok(ids('2026-02-17').includes('carnival'));
assert.ok(!ids('2026-02-18').includes('carnival'));
assert.ok(ids('2026-05-16').includes('cheese'));
assert.ok(!ids('2026-05-26').includes('cheese'));
assert.ok(ids('2026-07-11').includes('marine'));
assert.ok(!ids('2026-07-21').includes('marine'));
assert.ok(get('2026-06-15', 'north').some(e => e.id === 'summer'));
assert.ok(get('2026-06-15', 'south').some(e => e.id === 'winter'));
assert.ok(get('2026-12-15', 'south').some(e => e.id === 'summer'));
assert.ok(names('2026-01-05').includes('zodiac horse figurine'));
assert.ok(!names('2026-01-06').includes('zodiac horse figurine'));
assert.ok(names('2026-12-22').includes('zodiac sheep figurine'));
assert.ok(names('2030-12-22').includes('zodiac pig figurine'));
assert.ok(names('2030-12-22').includes('zodiac boar figurine'));
assert.ok(names('2020-12-22').includes('2021 celebratory arch'));
assert.ok(!names('2026-12-22').some(name => /celebratory arch/.test(name)));
assert.deepEqual(getNookShoppingEvents(new Date('invalid'), 'north', products), []);
for (const [year, windows] of Object.entries(years)) for (const [rule, window] of Object.entries(windows)) {
  assert.equal(window.length, 2);
  assert.ok(window[0] <= window[1], `${year} ${rule}`);
  for (const code of window) {
    const date = new Date(Date.UTC(Number(year), Math.floor(code / 100) - 1, code % 100));
    assert.equal((date.getUTCMonth() + 1) * 100 + date.getUTCDate(), code);
  }
}
for (const year of [2024, 2025, 2026]) {
  const seen = new Set();
  for (let date = new Date(Date.UTC(year, 0, 1)); date.getUTCFullYear() === year; date.setUTCDate(date.getUTCDate() + 1)) {
    const active = getNookShoppingEvents(date, 'north', products);
    assert.equal(new Set(active.flatMap(e => e.items.map(i => i.id))).size, active.reduce((n, e) => n + e.items.length, 0));
    active.forEach(event => seen.add(event.id));
  }
  assert.equal(seen.size, events.length, `All event groups reachable in ${year}`);
}
const assets = fs.readFileSync(path.resolve(path.dirname(file), 'nook-shopping-assets.ts'), 'utf8');
const assetPaths = [...assets.matchAll(/require\('(.+?)'\)/g)].map(match => match[1]);
assert.equal(assetPaths.length, 92);
assetPaths.forEach(asset => assert.ok(fs.existsSync(path.resolve(path.dirname(file), asset)), asset));
console.log('PASS: 92 products/assets, 61 years, moving dates, boundaries, hemisphere, year rollover, empty days');
