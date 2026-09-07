const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('../acnh-diary-mobile/node_modules/typescript');
const root = path.resolve(__dirname, '../acnh-diary-mobile/src');
function loadTs(file) {
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.require = name => name.startsWith('@/') ? loadTs(path.join(root, name.slice(2) + '.ts')) : require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, file);
  return loaded.exports;
}
const db = loadTs(path.join(root, 'db/database.web.ts'));
db.setVillagerStatus('island-a', 'gor01', 'islandResident', true);
db.setVillagerStatus('island-b', 'squ21', 'islandResident', true);
db.setVillagerStatus('island-ab', 'elp09', 'islandResident', true);
db.setVillagerStatus('island-a', 'squ21', 'wishlist', true);
const a = db.getVillagerStatesForIsland('island-a');
assert.deepEqual(Object.keys(a).sort(), ['gor01', 'squ21']);
assert.equal(a.gor01.islandResident, true);
assert.equal(a.squ21.wishlist, true);
assert.equal(a.squ21.islandResident, false);
assert.deepEqual(Object.keys(db.getVillagerStatesForIsland('island-b')), ['squ21']);
assert.deepEqual(db.getVillagerStatesForIsland('missing'), {});
db.setVillagerStatus('island-a', 'gor01', 'islandResident', false);
db.setVillagerStatus('island-a', 'gor01', 'movedOut', true);
assert.equal(db.getVillagerStatesForIsland('island-a').gor01.islandResident, false);
assert.equal(db.getVillagerStatesForIsland('island-b').squ21.islandResident, true);
console.log('PASS: island-specific residents, normalized IDs, wishlist exclusion, residency removal');
