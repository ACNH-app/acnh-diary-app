#!/usr/bin/env python3
"""Classify hashed offline-cache images using the existing URL manifests."""

from __future__ import annotations

import csv
import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "dataset/images/offline_cache"
MANIFEST_DIR = ROOT / "dataset/manifests/offline_asset_manifests"
CATALOG_SOURCE = ROOT / "dataset/seed/supabase_seed/content_db/catalog_items.json"
OUTPUTS = (
    MANIFEST_DIR / "offline_cache.classified.json",
    ROOT / "dataset/app-ready/manifests/offline_asset_manifests/offline_cache.classified.json",
)


def read_rows(filename: str) -> list[dict[str, str]]:
    with (MANIFEST_DIR / filename).open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


def add_match(
    matches: dict[str, list[dict[str, object]]],
    url: str,
    details: dict[str, object],
) -> None:
    cache_key = hashlib.sha256(url.encode("utf-8")).hexdigest()
    matches[cache_key].append({**details, "source_url": url})


def load_catalog_names() -> dict[str, str]:
    with CATALOG_SOURCE.open(encoding="utf-8") as file:
        rows = json.load(file)
    names = {}
    for row in rows:
        item = json.loads(row.get("item_json") or "{}")
        name = row.get("name_en") or item.get("name_en")
        if name:
            names[row["item_id"]] = name
    return names


def classify() -> dict[str, object]:
    matches: dict[str, list[dict[str, object]]] = defaultdict(list)

    villager_fields = {
        "icon_url": "icon",
        "image_url": "full",
        "photo_url": "photo_texture",
        "house_exterior_url": "house_exterior",
        "house_interior_url": "house_interior",
    }
    for row in read_rows("villager_remote_images.csv"):
        for field, asset_type in villager_fields.items():
            url = row.get(field, "")
            if url:
                add_match(
                    matches,
                    url,
                    {
                        "domain": "villager",
                        "asset_type": asset_type,
                        "entity_id": row["villager_id"],
                        "source_manifest": "villager_remote_images.csv",
                    },
                )

    catalog_names = load_catalog_names()
    for filename, variation in (
        ("catalog_remote_images.csv", False),
        ("catalog_variation_remote_images.csv", True),
    ):
        for row in read_rows(filename):
            url = row.get("image_url", "")
            if not url:
                continue
            catalog_name = catalog_names.get(row.get("item_id", ""))
            asset_type = "catalog_image"
            if row.get("catalog_type") == "photos":
                if catalog_name and "'s photo" in catalog_name.lower():
                    asset_type = "framed_photo"
                elif catalog_name and "poster" in catalog_name.lower():
                    asset_type = "poster"
                else:
                    asset_type = "photo_other"
            details: dict[str, object] = {
                "domain": "catalog_variation" if variation else "catalog",
                "asset_type": asset_type,
                "catalog_type": row.get("catalog_type"),
                "entity_id": row.get("item_id"),
                "source_manifest": filename,
            }
            if catalog_name:
                details["entity_name_en"] = catalog_name
            if variation:
                details["variation_id"] = row.get("variation_id")
            add_match(matches, url, details)

    files = {
        path.stem: path
        for path in CACHE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in {".png", ".jpg", ".jpeg"}
    }
    entries = []
    domain_counts = Counter()
    asset_type_counts = Counter()
    villager_asset_counts: dict[str, set[str]] = defaultdict(set)
    for cache_key, path in sorted(files.items()):
        file_matches = matches.get(cache_key, [])
        for match in file_matches:
            domain_counts[match["domain"]] += 1
            asset_type_counts[match["asset_type"]] += 1
            if match["domain"] == "villager":
                villager_asset_counts[match["asset_type"]].add(match["entity_id"])
        entries.append(
            {
                "file": path.name,
                "cache_key": cache_key,
                "extension": path.suffix.lower().lstrip("."),
                "bytes": path.stat().st_size,
                "matches": file_matches,
            }
        )

    unmapped = sorted(cache_key for cache_key in files if cache_key not in matches)
    summary = {
        "cache_file_count": len(files),
        "mapped_file_count": len(files) - len(unmapped),
        "unmapped_file_count": len(unmapped),
        "match_count": sum(len(entry["matches"]) for entry in entries),
        "file_extensions": dict(Counter(path.suffix.lower().lstrip(".") for path in files.values())),
        "match_counts_by_domain": dict(domain_counts),
        "match_counts_by_asset_type": dict(asset_type_counts),
        "villager_counts_by_asset_type": {
            asset_type: len(ids) for asset_type, ids in sorted(villager_asset_counts.items())
        },
    }
    return {
        "version": 1,
        "hash_algorithm": "sha256",
        "cache_root": "images/offline_cache",
        "source_manifests": [
            "villager_remote_images.csv",
            "catalog_remote_images.csv",
            "catalog_variation_remote_images.csv",
        ],
        "summary": summary,
        "unmapped_files": unmapped,
        "files": entries,
    }


def main() -> None:
    if not CACHE_DIR.exists():
        raise SystemExit(f"Cache directory does not exist: {CACHE_DIR}")
    result = classify()
    for output in OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(result, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    summary = result["summary"]
    print(
        "classified="
        f"{summary['mapped_file_count']}/{summary['cache_file_count']} "
        f"unmapped={summary['unmapped_file_count']} "
        f"matches={summary['match_count']}"
    )
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    if summary["unmapped_file_count"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
