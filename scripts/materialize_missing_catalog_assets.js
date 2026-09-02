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
const plantItemIds = new Set([
  '01e0b8d5595a50d3',
  '04a58853f4bc17d9',
  '11d3141ed7f7b02d',
  '123fd798d0ad2df8',
  '1898790fc6a00a83',
  '2624ee149b04811d',
  '29601c609aab2a19',
  '3589137455ecfb16',
  '37ec7718ad45eaab',
  '389d03903e6042d1',
  '38a41a168c0de895',
  '47f553be35d2a20c',
  '499db758addab72c',
  '4a9a553f06ff28c8',
  '56a53ea7bd1e9725',
  '56f9ac1a9c89c5fa',
  '5aeb5c2dd6eb89de',
  '5f0d14d868d0404d',
  '60cd48a71fe8d864',
  '63f28e99bb1cbf41',
  '68b2b2ac64862817',
  '693df8a8a5f75aac',
  '70b303ab72ef61c8',
  '722326bf11c641be',
  '8b32062539dae175',
  '8e66d208b0ad50be',
  '89b026ba459582b1',
  '95472f791c8ff646',
  'a42202e12d1c234c',
  'a632ffb300c178ca',
  'bdd78affd8afd644',
  'c1f5b37427e7e3ec',
  'c36cef096c9ee741',
  'c3dbc8a96268bb90',
  'ca59d0ac8a02d64f',
  'cef913414ed21129',
  'd0bb45df9e94958b',
  'd8ef65efc4e332f9',
  'e338697b148e07fe',
  'eb917611314f1eaf',
  'ebc27fe57d15b1ba',
  'f66d3a132d2b556a',
  'fe148dfab1b3ebb9',
]);

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

function itemAssetRelativePath(item, extension) {
  if (item.catalogType === 'items' && plantItemIds.has(item.id)) {
    return path.join('assets', 'plants', 'items', `${item.id}${extension}`);
  }
  return path.join('assets', 'catalog', item.catalogType, 'items', `${item.id}${extension}`);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const missing = catalog.items.filter((item) => item.imageUrl && !item.assetType && !item.assetId);
const manifests = manifestPaths.map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')));
const existingKeys = new Set(manifests[0].assets.map((asset) => `${asset.catalog_type}/${asset.item_id}/${asset.variation_id ?? ''}`));
const added = [];

for (const item of missing) {
  const source = findCachedFile(item.imageUrl);
  if (!source) throw new Error(`Missing cache file for ${item.catalogType}/${item.id}: ${item.imageUrl}`);
  const relative = itemAssetRelativePath(item, path.extname(source).toLowerCase());
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
