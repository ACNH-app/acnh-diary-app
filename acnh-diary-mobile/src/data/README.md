# Bundled Game Data

This directory contains the files bundled into the mobile app.

- Source of truth: `../../../dataset/app-ready/`
- Bundled villager data: `content/villagers/villagers.json`
- Source villager data: `dataset/app-ready/content/villagers/villagers.normalized.json`
- Villager images: `assets/villagers/{icon,full,poster,framed_photo}/`
- User-owned state belongs in SQLite, not in these files.

Regenerate the source dataset from the repository root:

```bash
python3 scripts/build_villager_app_dataset.py
python3 scripts/download_villager_assets.py
```

After changing the source dataset, copy the required `content/` and `assets/`
files here before creating an app build.
