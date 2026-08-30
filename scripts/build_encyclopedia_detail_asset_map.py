#!/usr/bin/env python3
"""Generate the static Metro map for encyclopedia detail images."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json"
OUTPUT = ROOT / "acnh-diary-mobile/src/data/encyclopedia-detail-assets.ts"


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    entries = [entry for entry in data["assets"] if entry.get("asset_variant")]
    keys: set[str] = set()
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const encyclopediaDetailAssets: Record<string, ImageSourcePropType> = {",
    ]
    for entry in entries:
        key = f"{entry['catalog_type']}/{entry['item_id']}/{entry['asset_variant']}"
        if key in keys:
            raise SystemExit(f"Duplicate encyclopedia detail asset key: {key}")
        keys.add(key)
        lines.append(f"  {json.dumps(key)}: require('./{entry['local_path']}'),")
    lines.extend(
        [
            "};",
            "",
            "export function getEncyclopediaDetailAsset(",
            "  category: string,",
            "  itemId: string,",
            "  variant: string,",
            "): ImageSourcePropType | undefined {",
            "  return encyclopediaDetailAssets[`${category}/${itemId}/${variant}`];",
            "}",
            "",
        ]
    )
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"generated={len(entries)} output={OUTPUT}")


if __name__ == "__main__":
    main()
