#!/usr/bin/env python3
"""Generate static Metro requires for encyclopedia images only."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json"
OUTPUT = ROOT / "acnh-diary-mobile/src/data/encyclopedia-assets.ts"


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    entries = [
        entry
        for entry in data["assets"]
        if entry.get("asset_section") == "encyclopedia" and not entry.get("asset_variant")
    ]
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const encyclopediaAssets: Record<string, ImageSourcePropType> = {",
    ]
    keys: set[str] = set()
    for entry in entries:
        key = f"{entry['catalog_type']}/{entry['item_id']}"
        if key in keys:
            raise SystemExit(f"Duplicate encyclopedia asset key: {key}")
        keys.add(key)
        lines.append(f"  {json.dumps(key)}: require('./{entry['local_path']}'),")
    lines.extend(
        [
            "};",
            "",
            "export function encyclopediaAssetKey(category: string, itemId: string): string {",
            "  return `${category}/${itemId}`;",
            "}",
            "",
            "export function getEncyclopediaAsset(",
            "  category: string,",
            "  itemId: string,",
            "): ImageSourcePropType | undefined {",
            "  return encyclopediaAssets[encyclopediaAssetKey(category, itemId)];",
            "}",
            "",
        ]
    )
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"generated={len(entries)} output={OUTPUT}")


if __name__ == "__main__":
    main()
