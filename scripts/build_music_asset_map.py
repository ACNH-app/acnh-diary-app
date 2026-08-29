#!/usr/bin/env python3
"""Generate static Metro asset requires for bundled music images."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "dataset/app-ready/content/catalog/music/music_image_manifest.json"
ASSET_DIR = ROOT / "dataset/app-ready/assets/catalog/music/items"
OUTPUT = ROOT / "acnh-diary-mobile/src/data/music-assets.ts"


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const musicImageAssets: Record<string, ImageSourcePropType> = {",
    ]

    for music_id in sorted(manifest, key=lambda value: int(value)):
        asset = ASSET_DIR / f"{music_id}.png"
        if not asset.exists():
            raise SystemExit(f"Missing local music image: {asset}")
        lines.append(
            f"  '{music_id}': require('./assets/catalog/music/items/{music_id}.png'),"
        )

    lines.extend(["};", ""])
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
