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
```

After changing the source dataset, copy the required `content/` and `assets/`
files here before creating an app build.
