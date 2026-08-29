#!/usr/bin/env python3
"""Prepare the offline image assets used for each villager."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/content/villagers/villagers.normalized.json"
ASSET_DIR = ROOT / "dataset/app-ready/assets/villagers"
CACHE_DIR = ROOT / "dataset/images/offline_cache"
IMAGE_FIELDS = {
    "icon": "icon_url",
    "full": "image_url",
    "poster": "poster_url",
    "framed_photo": "framed_photo_url",
    "house_exterior": "house_exterior_url",
    "house_interior": "house_interior_url",
}
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


def cached_image(url: str) -> Path | None:
    cache_key = hashlib.sha256(url.encode("utf-8")).hexdigest()
    for extension in (".png", ".jpg", ".jpeg"):
        candidate = CACHE_DIR / f"{cache_key}{extension}"
        if is_supported_image(candidate):
            return candidate
    return None


def prepare_local_image(target: Path, url: str) -> str | None:
    if is_supported_image(target):
        return "skipped"
    source = cached_image(url)
    if source is None:
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    return "cached"


def download(target: Path, url: str) -> str:
    target.parent.mkdir(parents=True, exist_ok=True)
    if is_supported_image(target):
        return "skipped"

    last_error: Exception | None = None
    for attempt in range(3):
        temporary = target.with_name(f"{target.name}.{attempt}.part")
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

    raise RuntimeError(f"Failed to download {url}: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--allow-network",
        action="store_true",
        help="Download missing assets from their remote URLs.",
    )
    args = parser.parse_args()
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    jobs = [
        (row["id"], image_type, row[field])
        for row in rows
        for image_type, field in IMAGE_FIELDS.items()
    ]
    failures: list[str] = []
    counts = {"downloaded": 0, "skipped": 0, "cached": 0}
    missing = []
    for villager_id, image_type, url in jobs:
        target = ASSET_DIR / image_type / f"{villager_id}{extension_for_url(url)}"
        result = prepare_local_image(target, url)
        if result:
            counts[result] += 1
        else:
            missing.append((villager_id, image_type, url))
    if missing and not args.allow_network:
        print(
            f"network disabled; missing={len(missing)}. "
            "Review the dataset/cache first, then rerun with --allow-network."
        )
        raise SystemExit(2)

    with ThreadPoolExecutor(max_workers=6) as executor:
        future_jobs = {
            executor.submit(
                download,
                ASSET_DIR / image_type / f"{villager_id}{extension_for_url(url)}",
                url,
            ): (villager_id, image_type, url)
            for villager_id, image_type, url in missing
        }
        for future in as_completed(future_jobs):
            villager_id, image_type, url = future_jobs[future]
            try:
                counts[future.result()] += 1
            except Exception as error:  # noqa: BLE001 - report all failed assets together
                failures.append(f"{villager_id}/{image_type}: {url} ({error})")

    print(f"downloaded={counts['downloaded']} skipped={counts['skipped']}")
    if failures:
        print("failures:")
        print("\n".join(sorted(failures)))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
