# App-Ready ACNH Dataset

This folder reorganizes the project data for app development.

## Start Here

- Villager screens: `content/villagers/` (417 entries)
- Encyclopedia screens: `content/encyclopedia/` (bugs, fish, sea, fossils, art)
- Museum source archives: `content/museum/`
- Furniture and catalog screens: `content/catalog/`
- Shared localization and helper data: `content/localization/`
- Image assets: `assets/`
- Offline image collection manifests: `manifests/offline_asset_manifests/`
- Imported/exported seed data: `seed/`
- App data spec: `APP_DATA_SPEC.md`

## Recommended Use

- Use the files in `content/` as the primary app-facing source.
- Use `assets/villagers/` for local villager portraits, `assets/encyclopedia/` for museum/creature images, and `assets/offline_cache/` for cached remote images.
- Use `assets/encyclopedia/{art,bugs,fish,fossils,sea}/` for encyclopedia images.
- Use `assets/encyclopedia/{bugs,fish,sea}/tank/` for tank display images and `assets/encyclopedia/art/{real,fake}/` for artwork comparison images.
- Use `assets/catalog/{furniture,interior,clothing,music,items,tools,special_items,gyroids,photos,recipes,reactions}/` for catalog images. Base items use `items/{item_id}` and variations use `variations/{item_id}/{item_id}__{variation_id}`.
- Keep `manifests/` and `seed/` as support data for migration, preprocessing, or offline packaging rather than direct UI rendering.

## Section Guide

- `content/villagers/`: 417-entry normalized villager data, filter options, summary, 391-entry ACNHAPI source archive, and helper maps
- `content/encyclopedia/`: app-ready normalized data for bugs (80), fish (80), sea creatures (40), fossils (73), and art (43)
- `content/museum/`: source archives and helper name maps for museum data
- `content/catalog/furniture/`: furniture-like catalog sources from ACNHAPI
- `content/catalog/interior/`: wallpaper, floors, rugs, ceiling decor, wall-mounted, and interior structures
- `content/catalog/special-items/`: fencing, construction, miscellaneous, tools/items/photo/poster helper maps
- `content/catalog/clothing/`: normalized clothing item data, variation data, filter options, summary, and Korean helper maps
- `content/catalog/music/`: track lists, extra track data, image manifest, and Korean names
- `content/catalog/recipes/`: DIY recipe source data and Korean name map
- `content/catalog/reactions/`: reaction source data and translations
- `content/localization/`: app-wide helper JSON such as event naming, display allowlists, and text snapshot data

## Notes

- JSON files here are copied and renamed for easier app consumption.
- Asset folders here now contain the moved original image directories, so this folder can be treated as the main app-facing dataset root.
- `assets/villagers/{icon,full,poster,framed_photo,house_exterior,house_interior}/` contains six local image types for all 417 normalized villagers; the remote image manifest remains available as a fallback/source record.
- `assets/villagers/legacy/` keeps the older 256px resident image dump outside the app asset paths.
- `assets/encyclopedia/{art,bugs,fish,fossils,sea}/` contains cached images for the encyclopedia tabs.
- `assets/catalog/{furniture,interior,clothing,music,items,tools,special_items,gyroids,photos,recipes,reactions}/` contains cached images for the catalog tabs; music album art is under `music/items/`.
- `manifests/offline_asset_manifests/offline_cache.classified.json` maps each hashed offline-cache file to its resident or encyclopedia/catalog source URL.
- `manifests/offline_asset_manifests/catalog_asset_paths.json` maps cached encyclopedia/catalog rows to stable app asset paths.
- `manifests/offline_asset_manifests/catalog_download_report.json` records the result of downloading missing encyclopedia/catalog images.
- `manifests/offline_asset_manifests/encyclopedia_detail_images.csv` maps tank and genuine/forgery detail images to their source URLs.
- Resident house wallpaper, flooring, music, and house image URLs are available in the normalized data. Activity times and resident house furniture lists are not present in the current dataset, so those fields remain empty until a source is added.
- Clothing data is currently normalized from `seed/supabase_seed/content_db/` export JSON because no root-level `content.db` file is present in this workspace.
