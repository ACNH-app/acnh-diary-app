const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'acnh-diary-mobile/src/data/content/catalog/catalog.json');
const manifestPath = path.join(root, 'dataset/manifests/offline_asset_manifests/catalog_remote_images.csv');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const existing = fs.readFileSync(manifestPath, 'utf8').trimEnd().split(/\r?\n/);
const existingKeys = new Set(existing.slice(1).map((line) => line.split(',', 3).slice(0, 2).join('/')));
const missing = catalog.items.filter((item) =>
  item.imageUrl && !item.assetType && !existingKeys.has(`${item.catalogType}/${item.id}`),
);

for (const item of missing) {
  existing.push(`${item.catalogType},${item.id},${item.imageUrl}`);
}

fs.writeFileSync(manifestPath, `${existing.join('\n')}\n`);
console.log(`Added ${missing.length} catalog asset manifest rows.`);
