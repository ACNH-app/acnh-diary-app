#!/usr/bin/env python3
"""Generate static Metro asset requires for the bundled villager images."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "acnh-diary-mobile/src/data/content/villagers/villagers.json"
OUTPUT = ROOT / "acnh-diary-mobile/src/data/villager-assets.ts"
IMAGE_TYPES = (
    "icon",
    "full",
    "poster",
    "framed_photo",
    "house_exterior",
    "house_interior",
)


def main() -> None:
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or len(rows) != 417:
        raise SystemExit(f"Expected 417 villager rows, got {len(rows)}")

    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "import type { VillagerImageType } from './villager-types';",
        "",
        "export type VillagerImageAssets = Record<VillagerImageType, ImageSourcePropType>;",
        "",
        "export const villagerImageAssets: Record<string, VillagerImageAssets> = {",
    ]
    for row in rows:
        lines.append(f"  {row['id']}: {{")
        for image_type in IMAGE_TYPES:
            asset = row["images"][image_type]
            local_path = asset.get("local_path")
            if not local_path:
                raise SystemExit(f"Missing local path for {row['id']}/{image_type}")
            lines.append(f"    {image_type}: require('./{local_path}'),")
        lines.append("  },")
    lines.extend(["};", ""])
    OUTPUT.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
