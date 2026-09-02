#!/usr/bin/env python3
"""Materialize cached encyclopedia and catalog images into stable app paths."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import shutil
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "dataset/images/offline_cache"
MANIFEST_DIR = ROOT / "dataset/manifests/offline_asset_manifests"
OUTPUT_ROOTS = (
    ROOT / "dataset/app-ready/assets",
    ROOT / "acnh-diary-mobile/src/data/assets",
)
INDEX_OUTPUTS = (
    MANIFEST_DIR / "catalog_asset_paths.json",
    ROOT / "dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json",
)
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg")
ENCYCLOPEDIA_TYPES = frozenset({"art", "bugs", "fish", "fossils", "sea"})
PLANT_ITEM_IDS = frozenset(
    {
        "01e0b8d5595a50d3",
        "04a58853f4bc17d9",
        "11d3141ed7f7b02d",
        "123fd798d0ad2df8",
        "1898790fc6a00a83",
        "2624ee149b04811d",
        "29601c609aab2a19",
        "3589137455ecfb16",
        "37ec7718ad45eaab",
        "389d03903e6042d1",
        "38a41a168c0de895",
        "47f553be35d2a20c",
        "499db758addab72c",
        "4a9a553f06ff28c8",
        "56a53ea7bd1e9725",
        "56f9ac1a9c89c5fa",
        "5aeb5c2dd6eb89de",
        "5f0d14d868d0404d",
        "60cd48a71fe8d864",
        "63f28e99bb1cbf41",
        "68b2b2ac64862817",
        "693df8a8a5f75aac",
        "70b303ab72ef61c8",
        "722326bf11c641be",
        "8b32062539dae175",
        "8e66d208b0ad50be",
        "89b026ba459582b1",
        "95472f791c8ff646",
        "a42202e12d1c234c",
        "a632ffb300c178ca",
        "bdd78affd8afd644",
        "c1f5b37427e7e3ec",
        "c36cef096c9ee741",
        "c3dbc8a96268bb90",
        "ca59d0ac8a02d64f",
        "cef913414ed21129",
        "d0bb45df9e94958b",
        "d8ef65efc4e332f9",
        "e338697b148e07fe",
        "eb917611314f1eaf",
        "ebc27fe57d15b1ba",
        "f66d3a132d2b556a",
        "fe148dfab1b3ebb9",
    }
)


def read_rows(filename: str) -> list[dict[str, str]]:
    with (MANIFEST_DIR / filename).open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


def safe_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", value)


def cached_files() -> dict[str, Path]:
    return {
        path.stem: path
        for path in CACHE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    }


def cache_file(files: dict[str, Path], url: str) -> Path | None:
    key = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return files.get(key)


def asset_section(catalog_type: str) -> str:
    return "encyclopedia" if catalog_type in ENCYCLOPEDIA_TYPES else "catalog"


def target_path(row: dict[str, str], variation: bool, extension: str) -> Path:
    catalog_type = safe_part(row["catalog_type"])
    item_id = safe_part(row["item_id"])
    section = asset_section(row["catalog_type"])
    if row["catalog_type"] == "items" and row["item_id"] in PLANT_ITEM_IDS and not variation:
        return Path("plants") / "items" / f"{item_id}{extension}"
    if variation:
        variation_id = safe_part(row["variation_id"])
        return (
            Path(section)
            / catalog_type
            / "variations"
            / item_id
            / f"{item_id}__{variation_id}{extension}"
        )
    return Path(section) / catalog_type / "items" / f"{item_id}{extension}"


def main() -> None:
    if not CACHE_DIR.exists():
        raise SystemExit(f"Cache directory does not exist: {CACHE_DIR}")

    files = cached_files()
    entries: list[dict[str, object]] = []
    missing = Counter()
    seen_targets: dict[Path, str] = {}
    counts = Counter()
    for filename, variation in (
        ("catalog_remote_images.csv", False),
        ("catalog_variation_remote_images.csv", True),
        ("encyclopedia_detail_images.csv", False),
    ):
        for row in read_rows(filename):
            url = row.get("image_url", "")
            if not url:
                continue
            source = cache_file(files, url)
            if source is None:
                missing[row["catalog_type"]] += 1
                continue
            if row.get("asset_variant"):
                relative = (
                    Path("encyclopedia")
                    / safe_part(row["catalog_type"])
                    / safe_part(row["asset_variant"])
                    / f"{safe_part(row['item_id'])}{source.suffix.lower()}"
                )
            else:
                relative = target_path(row, variation, source.suffix.lower())
            previous_url = seen_targets.get(relative)
            if previous_url and previous_url != url:
                raise SystemExit(f"Target collision: {relative}")
            seen_targets[relative] = url
            counts[row["catalog_type"]] += 1
            entries.append(
                {
                    "asset_section": asset_section(row["catalog_type"]),
                    "catalog_type": row["catalog_type"],
                    "item_id": row["item_id"],
                    "variation_id": row.get("variation_id") if variation else None,
                    "asset_variant": row.get("asset_variant"),
                    "source_manifest": filename,
                    "source_url": url,
                    "cache_file": source.name,
                    "local_path": (Path("assets") / relative).as_posix(),
                }
            )
            for output_root in OUTPUT_ROOTS:
                destination = output_root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                if not destination.exists() or destination.stat().st_size != source.stat().st_size:
                    shutil.copy2(source, destination)

    result = {
        "version": 1,
        "source_cache": "images/offline_cache",
        "asset_root": "assets",
        "encyclopedia_types": sorted(ENCYCLOPEDIA_TYPES),
        "source_manifests": [
            "catalog_remote_images.csv",
            "catalog_variation_remote_images.csv",
            "encyclopedia_detail_images.csv",
        ],
        "summary": {
            "cache_file_count": len(files),
            "materialized_asset_count": len(entries),
            "missing_cache_asset_count": sum(missing.values()),
            "catalog_type_counts": dict(sorted(counts.items())),
            "missing_by_catalog_type": dict(sorted(missing.items())),
        },
        "assets": entries,
    }
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    for output in INDEX_OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")

    print(json.dumps(result["summary"], ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
