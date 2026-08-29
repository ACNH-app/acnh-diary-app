# ACNH Dataset

This folder is a data-only snapshot assembled from the project so the JSON, image, manifest, and seed assets can be browsed without digging through app code.

## Layout

- `json/sources/acnhapi/`: original ACNHAPI JSON source files
- `json/sources/norviah-animal-crossing/`: original Norviah JSON source files
- `json/maps/`: Korean name/category/personality/species mapping JSON files
- `json/metadata/`: additional JSON metadata and snapshots
- `images/music/`: music cover images
- `images/villagers/`: villager local image dump
- `images/offline_cache/`: cached offline remote images
- `manifests/offline_asset_manifests/`: CSV manifests for offline image collection
- `seed/supabase_seed/`: exported app/content seed JSON files
- `seed/upload_status/`: Supabase asset upload progress JSON files

## Notes

- The original files in `data/`, `static/assets/`, `villagers/`, and `tmp/` were left in place.
- This folder is a reorganized copy for dataset work, not a new runtime source of truth.
