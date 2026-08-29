#!/usr/bin/env python3
"""Download the four offline image assets used for each villager."""

from __future__ import annotations

import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/content/villagers/villagers.normalized.json"
ASSET_DIR = ROOT / "dataset/app-ready/assets/villagers"
IMAGE_FIELDS = {
    "icon": "icon_url",
    "full": "image_url",
    "poster": "poster_url",
    "framed_photo": "framed_photo_url",
}
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def is_png(path: Path) -> bool:
    try:
        with path.open("rb") as file:
            return file.read(8) == PNG_SIGNATURE
    except OSError:
        return False


def download(target: Path, url: str) -> str:
    target.parent.mkdir(parents=True, exist_ok=True)
    if is_png(target):
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
            if not is_png(temporary):
                raise ValueError(f"Response is not a PNG: {url}")
            temporary.replace(target)
            return "downloaded"
        except Exception as error:  # noqa: BLE001 - retry individual remote assets
            last_error = error
            temporary.unlink(missing_ok=True)
            if attempt < 2:
                time.sleep(1 + attempt)

    raise RuntimeError(f"Failed to download {url}: {last_error}")


def main() -> None:
    rows = json.loads(SOURCE.read_text(encoding="utf-8"))
    jobs = [
        (row["id"], image_type, row[field])
        for row in rows
        for image_type, field in IMAGE_FIELDS.items()
    ]
    failures: list[str] = []
    counts = {"downloaded": 0, "skipped": 0}

    with ThreadPoolExecutor(max_workers=6) as executor:
        future_jobs = {
            executor.submit(
                download,
                ASSET_DIR / image_type / f"{villager_id}.png",
                url,
            ): (villager_id, image_type, url)
            for villager_id, image_type, url in jobs
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
