#!/usr/bin/env python3
"""Build the manifest for encyclopedia detail-only images."""

from __future__ import annotations

import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/seed/supabase_seed/content_db/catalog_items.json"
OUTPUTS = (
    ROOT / "dataset/manifests/offline_asset_manifests/encyclopedia_detail_images.csv",
    ROOT / "dataset/app-ready/manifests/offline_asset_manifests/encyclopedia_detail_images.csv",
)
CATEGORIES = {"bugs", "fish", "sea", "art"}


def main() -> None:
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    manifest: list[dict[str, str]] = []
    for row in rows:
        category = row.get("catalog_type")
        if category not in CATEGORIES:
            continue
        details = json.loads(row.get("raw_json") or "{}")
        item_id = row["item_id"]
        if category in {"bugs", "fish", "sea"}:
            urls = [("tank", details.get("render_url"))]
        else:
            real_info = details.get("real_info") or {}
            fake_info = details.get("fake_info") or {}
            urls = [
                ("real", real_info.get("image_url")),
                ("fake", fake_info.get("image_url")),
            ]
        for asset_variant, image_url in urls:
            if image_url:
                manifest.append(
                    {
                        "catalog_type": category,
                        "item_id": item_id,
                        "asset_variant": asset_variant,
                        "image_url": image_url,
                    }
                )

    manifest.sort(key=lambda row: (row["catalog_type"], row["item_id"], row["asset_variant"]))
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        with output.open("w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(
                file,
                fieldnames=["catalog_type", "item_id", "asset_variant", "image_url"],
            )
            writer.writeheader()
            writer.writerows(manifest)
    print(f"generated={len(manifest)}")


if __name__ == "__main__":
    main()
