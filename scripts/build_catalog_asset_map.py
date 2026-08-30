#!/usr/bin/env python3
"""Generate a static Metro asset map for materialized encyclopedia/catalog images."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json"
OUTPUT = ROOT / "acnh-diary-mobile/src/data/catalog-assets.ts"


def asset_key(entry: dict) -> str:
    parts = [entry["catalog_type"], entry["item_id"]]
    if entry.get("variation_id") is not None:
        parts.append(str(entry["variation_id"]))
    return "/".join(parts)


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    entries = [entry for entry in data["assets"] if entry.get("asset_section") == "catalog"]
    keys: set[str] = set()
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const catalogAssets: Record<string, ImageSourcePropType> = {",
    ]
    for entry in entries:
        key = asset_key(entry)
        if key in keys:
            raise SystemExit(f"Duplicate catalog asset key: {key}")
        keys.add(key)
        local_path = entry["local_path"]
        lines.append(f"  {json.dumps(key)}: require('./{local_path}'),")
    lines.extend(
        [
            "};",
            "",
            "export function catalogAssetKey(",
            "  catalogType: string,",
            "  itemId: string,",
            "  variationId?: string | number | null,",
            "): string {",
            "  return variationId == null",
            "    ? `${catalogType}/${itemId}`",
            "    : `${catalogType}/${itemId}/${variationId}`;",
            "}",
            "",
            "export function getCatalogAsset(",
            "  catalogType: string,",
            "  itemId: string,",
            "  variationId?: string | number | null,",
            "): ImageSourcePropType | undefined {",
            "  return catalogAssets[catalogAssetKey(catalogType, itemId, variationId)];",
            "}",
            "",
        ]
    )
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"generated={len(entries)} output={OUTPUT}")


if __name__ == "__main__":
    main()
