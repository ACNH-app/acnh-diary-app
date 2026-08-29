# App-Ready ACNH Dataset

This folder reorganizes the project data for app development.

## Start Here

- Villager screens: `content/villagers/`
- Museum screens: `content/museum/`
- Furniture and catalog screens: `content/catalog/`
- Shared localization and helper data: `content/localization/`
- Image assets: `assets/`
- Offline image collection manifests: `manifests/offline_asset_manifests/`
- Imported/exported seed data: `seed/`
- App data spec: `APP_DATA_SPEC.md`

## Recommended Use

- Use the files in `content/` as the primary app-facing source.
- Use `assets/music/` for album art, `assets/villagers/` for local villager portraits, and `assets/offline_cache/` for cached remote images.
- Keep `manifests/` and `seed/` as support data for migration, preprocessing, or offline packaging rather than direct UI rendering.

## Section Guide

- `content/villagers/`: normalized villager data, filter options, summary, raw source, and helper maps
- `content/museum/`: bugs, fish, sea creatures, fossils, and art naming helpers
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
- Clothing data is currently normalized from `seed/supabase_seed/content_db/` export JSON because no root-level `content.db` file is present in this workspace.
