const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'acnh-diary-mobile/src/data/content/catalog/catalog.json');
const cacheRoot = path.join(root, 'dataset/images/offline_cache');
const appAssetRoot = path.join(root, 'acnh-diary-mobile/src/data/assets');
const manifestPaths = [
  path.join(root, 'dataset/manifests/offline_asset_manifests/catalog_asset_paths.json'),
  path.join(root, 'dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json'),
];

function cacheKey(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function findCachedFile(url) {
  const key = cacheKey(url);
  for (const extension of ['.png', '.jpg', '.jpeg']) {
    const candidate = path.join(cacheRoot, `${key}${extension}`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const missing = catalog.items.filter((item) => item.imageUrl && !item.assetType && !item.assetId);
const manifests = manifestPaths.map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')));
const existingKeys = new Set(manifests[0].assets.map((asset) => `${asset.catalog_type}/${asset.item_id}/${asset.variation_id ?? ''}`));
const added = [];

for (const item of missing) {
  const source = findCachedFile(item.imageUrl);
  if (!source) throw new Error(`Missing cache file for ${item.catalogType}/${item.id}: ${item.imageUrl}`);
  const relative = path.join('assets', 'catalog', item.catalogType, 'items', `${item.id}${path.extname(source).toLowerCase()}`);
  const destination = path.join(root, 'acnh-diary-mobile/src/data', relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);

  const key = `${item.catalogType}/${item.id}/`;
  if (!existingKeys.has(key)) {
    const entry = {
      asset_section: 'catalog',
      catalog_type: item.catalogType,
      item_id: item.id,
      variation_id: null,
      asset_variant: null,
      source_manifest: 'catalog_remote_images.csv',
      source_url: item.imageUrl,
      cache_file: path.basename(source),
      local_path: relative,
    };
    added.push(entry);
    existingKeys.add(key);
  }
}

for (const manifest of manifests) {
  manifest.assets.push(...added);
  manifest.summary.cache_file_count = fs.readdirSync(cacheRoot).filter((file) => /\.(png|jpe?g)$/i.test(file)).length;
  manifest.summary.materialized_asset_count += added.length;
  for (const entry of added) {
    manifest.summary.catalog_type_counts[entry.catalog_type] =
      (manifest.summary.catalog_type_counts[entry.catalog_type] || 0) + 1;
  }
  fs.writeFileSync(
    manifestPaths[manifests.indexOf(manifest)],
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

console.log(`Materialized ${added.length} missing catalog assets into the app project.`);
