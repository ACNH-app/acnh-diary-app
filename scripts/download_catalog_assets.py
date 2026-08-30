#!/usr/bin/env python3
"""Download missing encyclopedia and catalog images into the offline cache."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import subprocess
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / "dataset/images/offline_cache"
APP_ASSET_MANIFEST = ROOT / "dataset/app-ready/manifests/offline_asset_manifests/catalog_asset_paths.json"
APP_ASSET_ROOT = ROOT / "acnh-diary-mobile/src/data"
MANIFEST_DIR = ROOT / "dataset/manifests/offline_asset_manifests"
REPORT_OUTPUTS = (
    MANIFEST_DIR / "catalog_download_report.json",
    ROOT / "dataset/app-ready/manifests/offline_asset_manifests/catalog_download_report.json",
)
MANIFESTS = (
    ("catalog_remote_images.csv", False),
    ("catalog_variation_remote_images.csv", True),
    ("encyclopedia_detail_images.csv", False),
)
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg")
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
JPEG_SIGNATURE = b"\xff\xd8\xff"


def is_supported_image(path: Path) -> bool:
    try:
        with path.open("rb") as file:
            header = file.read(8)
            return header.startswith(PNG_SIGNATURE) or header.startswith(JPEG_SIGNATURE)
    except OSError:
        return False


def extension_for_url(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    return ".jpg" if suffix in {".jpg", ".jpeg"} else ".png"


def cache_key(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()


def cached_path(url: str) -> Path | None:
    key = cache_key(url)
    for extension in IMAGE_EXTENSIONS:
        candidate = CACHE_DIR / f"{key}{extension}"
        if is_supported_image(candidate):
            return candidate
    return None


def app_asset_urls() -> set[str]:
    if not APP_ASSET_MANIFEST.exists():
        return set()
    try:
        manifest = json.loads(APP_ASSET_MANIFEST.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    return {
        entry["source_url"]
        for entry in manifest.get("assets", [])
        if entry.get("source_url")
        and (APP_ASSET_ROOT / str(entry.get("local_path", ""))).is_file()
    }


def read_jobs() -> list[dict[str, str | None]]:
    jobs: dict[str, dict[str, str | None]] = {}
    bundled_urls = app_asset_urls()
    for filename, variation in MANIFESTS:
        with (MANIFEST_DIR / filename).open(encoding="utf-8", newline="") as file:
            for row in csv.DictReader(file):
                url = row.get("image_url", "")
                if not url or cached_path(url) is not None or url in bundled_urls:
                    continue
                key = cache_key(url)
                if key not in jobs:
                    jobs[key] = {
                        "cache_key": key,
                        "catalog_type": row.get("catalog_type", "unknown"),
                        "item_id": row.get("item_id", ""),
                        "variation_id": row.get("variation_id") if variation else None,
                        "asset_variant": row.get("asset_variant"),
                        "source_url": url,
                    }
    return list(jobs.values())


def manifest_unique_url_count() -> int:
    urls: set[str] = set()
    for filename, _ in MANIFESTS:
        with (MANIFEST_DIR / filename).open(encoding="utf-8", newline="") as file:
            for row in csv.DictReader(file):
                url = row.get("image_url", "")
                if url:
                    urls.add(url)
    return len(urls)


def download(job: dict[str, str | None]) -> str:
    url = str(job["source_url"])
    target = CACHE_DIR / f"{job['cache_key']}{extension_for_url(url)}"
    if is_supported_image(target) or cached_path(url) is not None:
        return "skipped"

    last_error: Exception | None = None
    for attempt in range(3):
        temporary = CACHE_DIR / f"{job['cache_key']}.{attempt}.part"
        try:
            result = subprocess.run(
                [
                    "curl",
                    "-L",
                    "--fail",
                    "--silent",
                    "--show-error",
                    "--retry",
                    "3",
                    "--connect-timeout",
                    "15",
                    "--max-time",
                    "120",
                    "-A",
                    "ACNH-Diary-Mobile/1.0",
                    url,
                    "-o",
                    str(temporary),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or f"curl exited {result.returncode}")
            if not is_supported_image(temporary):
                raise ValueError(f"Response is not a supported image: {url}")
            temporary.replace(target)
            return "downloaded"
        except Exception as error:  # noqa: BLE001 - retry individual remote assets
            last_error = error
            temporary.unlink(missing_ok=True)
            if attempt < 2:
                time.sleep(1 + attempt)

    raise RuntimeError(str(last_error))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=8, help="Concurrent downloads (default: 8).")
    args = parser.parse_args()
    if args.workers < 1:
        raise SystemExit("--workers must be at least 1")
    if not CACHE_DIR.exists():
        raise SystemExit(f"Cache directory does not exist: {CACHE_DIR}")

    jobs = read_jobs()
    counts = Counter()
    failures: list[dict[str, str | None]] = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_jobs = {executor.submit(download, job): job for job in jobs}
        for future in as_completed(future_jobs):
            job = future_jobs[future]
            try:
                result = future.result()
                counts[(str(job["catalog_type"]), result)] += 1
            except Exception as error:  # noqa: BLE001 - report all failed assets together
                failures.append({**job, "error": str(error)})
                counts[(str(job["catalog_type"]), "failed")] += 1

    remaining_jobs = read_jobs()
    cache_image_count = sum(
        1
        for path in CACHE_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS and is_supported_image(path)
    )
    report = {
        "version": 1,
        "cache_root": "images/offline_cache",
        "manifest_unique_url_count": manifest_unique_url_count(),
        "cache_image_count": cache_image_count,
        "remaining_unique_missing_count": len(remaining_jobs),
        "complete": not remaining_jobs,
        "requested_unique_missing_count": len(jobs),
        "downloaded_count": sum(value for (catalog_type, result), value in counts.items() if result == "downloaded"),
        "skipped_count": sum(value for (catalog_type, result), value in counts.items() if result == "skipped"),
        "failed_count": len(failures),
        "counts_by_catalog_type": {
            catalog_type: {
                result: counts[(catalog_type, result)]
                for result in ("downloaded", "skipped", "failed")
                if counts[(catalog_type, result)]
            }
            for catalog_type in sorted({str(job["catalog_type"]) for job in jobs})
        },
        "failures": sorted(failures, key=lambda item: str(item["source_url"])),
    }
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    for output in REPORT_OUTPUTS:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")

    print(json.dumps({key: value for key, value in report.items() if key != "failures"}, ensure_ascii=False, sort_keys=True))
    if failures:
        print(f"failure_report={REPORT_OUTPUTS[0]}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
