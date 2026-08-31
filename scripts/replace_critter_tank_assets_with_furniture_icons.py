#!/usr/bin/env python3
"""Replace creature tank render assets with New Horizons furniture icons."""

from __future__ import annotations

import csv
import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
API_URL = "https://nookipedia.com/w/api.php"
USER_AGENT = "ACNH-Diary-Mobile/1.0 (asset maintenance)"

DATA_ROOTS = (
    ROOT / "acnh-diary-mobile/src/data/content/encyclopedia",
    ROOT / "dataset/app-ready/content/encyclopedia",
)
MANIFEST_OUTPUTS = (
    ROOT / "dataset/manifests/offline_asset_manifests/encyclopedia_detail_images.csv",
    ROOT / "dataset/app-ready/manifests/offline_asset_manifests/encyclopedia_detail_images.csv",
)
ASSET_ROOTS = (
    ROOT / "acnh-diary-mobile/src/data/assets/encyclopedia",
    ROOT / "dataset/app-ready/assets/encyclopedia",
)


@dataclass(frozen=True)
class CategoryConfig:
    key: str
    title: str


CATEGORIES = (
    CategoryConfig("bugs", "Category:New Horizons bug furniture icons"),
    CategoryConfig("fish", "Category:New Horizons fish tank icons"),
    CategoryConfig("sea", "Category:New Horizons sea creature furniture icons"),
)


def request_json(params: dict[str, str]) -> dict:
    url = f"{API_URL}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def category_titles(category_title: str) -> list[str]:
    titles: list[str] = []
    params = {
        "action": "query",
        "format": "json",
        "list": "categorymembers",
        "cmtitle": category_title,
        "cmtype": "file",
        "cmlimit": "500",
    }
    while True:
        data = request_json(params)
        titles.extend(member["title"] for member in data["query"]["categorymembers"])
        continuation = data.get("continue")
        if not continuation:
            return titles
        params.update(continuation)


def title_key(title: str) -> str:
    name = title.removeprefix("File:")
    name = re.sub(r"\s+NH\s+Furniture\s+Icon\.png$", "", name, flags=re.IGNORECASE)
    return normalize(name)


def image_urls(titles: list[str]) -> dict[str, str]:
    urls: dict[str, str] = {}
    for start in range(0, len(titles), 50):
        chunk = titles[start : start + 50]
        data = request_json(
            {
                "action": "query",
                "format": "json",
                "prop": "imageinfo",
                "iiprop": "url",
                "titles": "|".join(chunk),
            }
        )
        for page in data["query"]["pages"].values():
            title = page.get("title")
            info = page.get("imageinfo") or []
            if title and info:
                urls[title_key(title)] = info[0]["url"]
        time.sleep(0.1)
    return urls


def download(url: str, target: Path) -> None:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:
        content = response.read()
    if not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"not a PNG image: {url}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)


def update_manifest(new_urls: dict[tuple[str, str], str]) -> None:
    for manifest_path in MANIFEST_OUTPUTS:
        rows = list(csv.DictReader(manifest_path.open(encoding="utf-8", newline="")))
        for row in rows:
            key = (row.get("catalog_type") or "", row.get("item_id") or "")
            if row.get("asset_variant") == "tank" and key in new_urls:
                row["image_url"] = new_urls[key]
        with manifest_path.open("w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(
                file,
                fieldnames=["catalog_type", "item_id", "asset_variant", "image_url"],
                lineterminator="\n",
            )
            writer.writeheader()
            writer.writerows(rows)


def update_category(config: CategoryConfig) -> dict[tuple[str, str], str]:
    items = json.loads((DATA_ROOTS[0] / f"{config.key}.json").read_text(encoding="utf-8"))
    urls_by_name = image_urls(category_titles(config.title))
    urls_by_id: dict[tuple[str, str], str] = {}
    missing: list[str] = []

    for item in items:
        url = urls_by_name.get(normalize(item["nameEn"]))
        if not url:
            missing.append(item["nameEn"])
            continue
        item_id = item["id"]
        urls_by_id[(config.key, item_id)] = url
        item["tankImage"] = {
            "url": url,
            "localPath": f"assets/encyclopedia/{config.key}/tank/{item_id}.png",
        }
        for asset_root in ASSET_ROOTS:
            download(url, asset_root / config.key / "tank" / f"{item_id}.png")

    if missing:
        raise SystemExit(f"Missing {config.key} furniture icon mappings: {', '.join(missing)}")

    encoded = json.dumps(items, ensure_ascii=False, indent=2) + "\n"
    for data_root in DATA_ROOTS:
        (data_root / f"{config.key}.json").write_text(encoded, encoding="utf-8")
    print(f"{config.key}={len(urls_by_id)}")
    return urls_by_id


def main() -> None:
    urls: dict[tuple[str, str], str] = {}
    for config in CATEGORIES:
        urls.update(update_category(config))
    update_manifest(urls)


if __name__ == "__main__":
    main()
