# Bundled Game Data

This directory contains the files bundled into the mobile app.

- Source of truth: `../../../dataset/app-ready/`
- Bundled villager data: `content/villagers/villagers.json`
- Source villager data: `dataset/app-ready/content/villagers/villagers.normalized.json`
- Villager images: `assets/villagers/{icon,full,poster,framed_photo,house_exterior,house_interior}/`
- Legacy resident dump: `assets/villagers/legacy/` (not used by the app)
- Encyclopedia images: `assets/encyclopedia/{art,bugs,fish,fossils,sea}/`
- Encyclopedia detail images: `assets/encyclopedia/{bugs,fish,sea}/tank/` and `assets/encyclopedia/art/{real,fake}/`
- Encyclopedia data: `content/encyclopedia/{bugs,fish,sea,fossils,art}.json`
- Catalog images: `assets/catalog/{furniture,interior,clothing,music,items,tools,special_items,gyroids,photos,recipes,reactions}/`
- Plant item images: `assets/plants/items/`
- Catalog data: `content/catalog/catalog.json` (7,443 base items)
- Catalog variations: `content/catalog/catalog-variations.json` (24,897 display-only variants)
- House music images: `assets/catalog/music/items/`
- Static encyclopedia asset map: `encyclopedia-assets.ts`
- Static encyclopedia detail asset map: `encyclopedia-detail-assets.ts`
- Encyclopedia Korean detail labels: `encyclopedia-labels.ts`
- Static catalog asset map: `catalog-assets.ts`
- Static Metro asset maps: `villager-assets.ts`, `music-assets.ts`
- User-owned state belongs in SQLite, not in these files.

Regenerate the source dataset from the repository root:

```bash
python3 scripts/build_villager_app_dataset.py
python3 scripts/build_encyclopedia_app_dataset.py
python3 scripts/build_encyclopedia_detail_manifest.py
python3 scripts/download_catalog_assets.py --workers 8
python3 scripts/classify_offline_cache.py
python3 scripts/materialize_catalog_assets.py
python3 scripts/build_catalog_asset_map.py
python3 scripts/build_encyclopedia_asset_map.py
python3 scripts/build_encyclopedia_detail_asset_map.py
python3 scripts/download_villager_assets.py
# Only after reviewing missing assets:
python3 scripts/download_villager_assets.py --allow-network
node scripts/build_mobile_catalog_data.js
```

After changing the source dataset, copy the required `content/` and `assets/`
files here before creating an app build.

`catalog.json` contains one record per base item. `id` is the fixed content ID
used by SQLite collection records and `assetType`/`assetId` identify a Metro
static asset. `catalog-variations.json` contains visual variants only; the MVP
stores ownership on the base item and can add variant-level records later.

To add only catalog images that are missing from the app asset map, run these
commands from the repository root. This flow downloads only the missing URLs
and does not recreate the full root cache or `dataset/app-ready/assets` copy.

```bash
node scripts/complete_catalog_asset_manifest.js
node scripts/download_missing_catalog_assets.js
node scripts/materialize_missing_catalog_assets.js
python3 scripts/build_catalog_asset_map.py
node scripts/build_mobile_catalog_data.js
```
