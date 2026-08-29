#!/usr/bin/env python3
"""Build the 417-entry villager dataset used by the mobile app."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/seed/supabase_seed/content_db/villagers.json"
ACNHAPI_SOURCE = ROOT / "dataset/app-ready/content/villagers/villagers.acnhapi.json"
SAYING_MAP_SOURCE = ROOT / "dataset/app-ready/content/villagers/villager_saying_map_ko.json"
CATALOG_SOURCE = ROOT / "dataset/app-ready/seed/supabase_seed/content_db/catalog_items.json"
OUTPUT_DIR = ROOT / "dataset/app-ready/content/villagers"
LOCAL_ASSET_DIR = ROOT / "dataset/app-ready/assets/villagers"
RAW_REQUIRED_FIELDS = ("debut", "phrase", "prev_phrases", "title_color")
IMAGE_TYPES = ("icon", "full", "poster", "framed_photo")


def load_json(path: Path):
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, value) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(value, file, ensure_ascii=False, indent=2)
        file.write("\n")


def parse_birthday(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return None, None

    match = re.fullmatch(r"([A-Za-z]+)\s+(\d{1,2})", value.strip())
    if not match:
        return None, None

    months = {
        "January": 1,
        "February": 2,
        "March": 3,
        "April": 4,
        "May": 5,
        "June": 6,
        "July": 7,
        "August": 8,
        "September": 9,
        "October": 10,
        "November": 11,
        "December": 12,
    }
    return months.get(match.group(1)), int(match.group(2))


def unique_tokens(*values: str | None) -> list[str]:
    tokens: list[str] = []
    for value in values:
        if value and value not in tokens:
            tokens.append(value)
    return tokens


def ordinal_day(day: int | None) -> str | None:
    if day is None:
        return None
    if 10 < day % 100 < 14:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix}"


def normalize_color(value: str | None) -> str | None:
    if not value:
        return None
    return value if value.startswith("#") else f"#{value}"


def locale_map(values: object, fallback: dict[str, str | None]) -> dict[str, str]:
    result = {key: value for key, value in fallback.items() if value}
    if isinstance(values, dict):
        result.update({str(key): str(value) for key, value in values.items() if value})
    return result


def image_asset(villager_id: str, image_type: str, url: str | None) -> dict:
    local_image = LOCAL_ASSET_DIR / image_type / f"{villager_id}.png"
    return {
        "url": url,
        "local_path": (
            f"assets/villagers/{image_type}/{villager_id}.png"
            if local_image.exists()
            else None
        ),
        "has_local_image": local_image.exists(),
    }


def normalize(
    row: dict,
    acnhapi_row: dict | None,
    saying_map: dict,
    catalog_image_urls: dict[str, dict[str, str]],
) -> dict:
    villager_id = row["villager_id"]
    birthday = row.get("birthday")
    birth_month, birth_day = parse_birthday(birthday)
    raw_row = json.loads(row.get("raw_json") or "{}")
    catch_translations = (acnhapi_row or {}).get("catch-translations") or {}
    saying_ko = saying_map.get(row["name_ko"]) or row.get("saying_ko")
    bubble_color = (acnhapi_row or {}).get("bubble-color") or raw_row.get("title_color")
    text_color = (acnhapi_row or {}).get("text-color") or raw_row.get("text_color")
    name_locales = locale_map(
        (acnhapi_row or {}).get("name"),
        {"name-KRko": row.get("name_ko"), "name-USen": row.get("name_en")},
    )
    catchphrase_locales = locale_map(
        (acnhapi_row or {}).get("catch-translations"),
        {
            "catch-KRko": row.get("catchphrase_ko"),
            "catch-USen": row.get("catchphrase"),
        },
    )
    catalog_images = catalog_image_urls[row["name_en"]]
    icon_asset = image_asset(villager_id, "icon", row.get("icon_url"))
    full_asset = image_asset(villager_id, "full", row.get("image_url"))
    poster_asset = image_asset(villager_id, "poster", catalog_images["poster"])
    framed_photo_asset = image_asset(
        villager_id,
        "framed_photo",
        catalog_images["framed_photo"],
    )

    return {
        "id": villager_id,
        "key": villager_id,
        "file_name": villager_id,
        "name_ko": row["name_ko"],
        "name_en": row["name_en"],
        "species": row["species"],
        "species_ko": row["species_ko"],
        "personality": row["personality"],
        "personality_ko": row["personality_ko"],
        "gender": row["gender"],
        "subtype": row["sub_personality"],
        "hobby": row["hobby"],
        "sign": row.get("sign"),
        "birthday": birthday,
        "birthday_string": (acnhapi_row or {}).get("birthday-string")
        or (f"{birthday.split()[0]} {ordinal_day(birth_day)}" if birthday and birth_day else birthday),
        "birth_month": birth_month,
        "birth_day": birth_day,
        "birth_month_key": f"{birth_month:02d}" if birth_month else None,
        "catch_phrase_en": row.get("catchphrase"),
        "catch_phrase_ko": catch_translations.get("catch-KRko") or row.get("catchphrase_ko"),
        "name_locales": name_locales,
        "catchphrase_locales": catchphrase_locales,
        "saying_en": (acnhapi_row or {}).get("saying") or raw_row.get("saying") or row.get("saying"),
        "saying_ko": saying_ko,
        "debut": raw_row.get("debut"),
        "phrase": raw_row.get("phrase"),
        "previous_phrases": raw_row.get("prev_phrases", []),
        "islander": raw_row.get("islander"),
        "appearances": raw_row.get("appearances", []),
        "favorite_colors": raw_row.get("favorite_colors", []),
        "favorite_styles": raw_row.get("favorite_styles", []),
        "default_clothing": raw_row.get("default_clothing"),
        "default_clothing_variation": raw_row.get("default_clothing_variation"),
        "default_umbrella": raw_row.get("default_umbrella"),
        "house_wallpaper": raw_row.get("house_wallpaper"),
        "house_flooring": raw_row.get("house_flooring"),
        "house_music": raw_row.get("house_music"),
        "house_music_ko": raw_row.get("house_music_ko"),
        "house_music_note": raw_row.get("house_music_note"),
        "images": {
            "icon": icon_asset,
            "full": full_asset,
            "poster": poster_asset,
            "framed_photo": framed_photo_asset,
        },
        "icon_url": row.get("icon_url"),
        "image_url": row.get("image_url"),
        "photo_url": row.get("photo_url"),
        "poster_url": catalog_images["poster"],
        "framed_photo_url": catalog_images["framed_photo"],
        "house_exterior_url": row.get("house_exterior_url"),
        "house_interior_url": row.get("house_interior_url"),
        "local_image_path": full_asset["local_path"],
        "has_local_image": full_asset["has_local_image"],
        "icon_local_image_path": icon_asset["local_path"],
        "full_image_local_path": full_asset["local_path"],
        "poster_local_image_path": poster_asset["local_path"],
        "framed_photo_local_image_path": framed_photo_asset["local_path"],
        "bubble_color": normalize_color(bubble_color),
        "text_color": normalize_color(text_color),
        "title_color": normalize_color(raw_row.get("title_color")),
        "search_tokens": unique_tokens(
            row.get("name_ko"),
            row.get("name_en"),
            row.get("species"),
            row.get("species_ko"),
            row.get("personality"),
            row.get("personality_ko"),
            row.get("gender"),
            row.get("hobby"),
            birthday,
            row.get("catchphrase"),
            row.get("catchphrase_ko"),
            saying_ko,
        ),
    }


def options(rows: list[dict], field: str) -> list[dict]:
    counts = Counter(row[field] for row in rows if row.get(field))
    return [{"key": key, "count": counts[key]} for key in sorted(counts)]


def load_catalog_image_urls(villager_names: set[str]) -> dict[str, dict[str, str]]:
    image_urls: dict[str, dict[str, str]] = {name: {} for name in villager_names}
    for row in load_json(CATALOG_SOURCE):
        if row.get("catalog_type") != "photos":
            continue
        item = json.loads(row.get("item_json") or "{}")
        item_name = item.get("name_en") or ""
        for image_type, suffix in (("poster", "poster"), ("framed_photo", "photo")):
            for villager_name in villager_names:
                if item_name == f"{villager_name}'s {suffix}":
                    if item.get("image_url"):
                        image_urls[villager_name][image_type] = item["image_url"]
                    break

    missing = {
        name: sorted(set(IMAGE_TYPES[2:]) - set(values))
        for name, values in image_urls.items()
        if not all(image_type in values for image_type in IMAGE_TYPES[2:])
    }
    if missing:
        raise SystemExit(f"Missing catalog images: {missing}")
    return image_urls


def main() -> None:
    source_rows = load_json(SOURCE)
    if not isinstance(source_rows, list) or len(source_rows) != 417:
        raise SystemExit(f"Expected 417 villager rows, got {len(source_rows)}")

    source_ids = [row.get("villager_id") for row in source_rows]
    if any(not villager_id for villager_id in source_ids):
        raise SystemExit("Every villager must have a villager_id")
    if len(set(source_ids)) != len(source_ids):
        raise SystemExit("Villager IDs must be unique")

    for row in source_rows:
        raw_row = json.loads(row.get("raw_json") or "{}")
        missing_fields = [field for field in RAW_REQUIRED_FIELDS if field not in raw_row]
        if missing_fields:
            raise SystemExit(
                f"Villager {row.get('villager_id')} is missing raw fields: {missing_fields}"
            )

    catalog_image_urls = load_catalog_image_urls({row["name_en"] for row in source_rows})
    acnhapi_rows = {
        row["file-name"]: row for row in load_json(ACNHAPI_SOURCE).values()
    }
    saying_map = load_json(SAYING_MAP_SOURCE)
    rows = [
        normalize(
            row,
            acnhapi_rows.get(row["villager_id"]),
            saying_map,
            catalog_image_urls,
        )
        for row in source_rows
    ]
    rows.sort(key=lambda row: row["key"])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    write_json(OUTPUT_DIR / "villagers.normalized.json", rows)
    write_json(
        OUTPUT_DIR / "villagers.filter-options.json",
        {
            "species": options(rows, "species"),
            "personalities": options(rows, "personality"),
            "hobbies": options(rows, "hobby"),
            "genders": options(rows, "gender"),
            "birth_months": options(rows, "birth_month_key"),
            "subtypes": options(rows, "subtype"),
        },
    )
    write_json(
        OUTPUT_DIR / "villagers.summary.json",
        {
            "source_kind": "content_db_export",
            "source_file": "seed/supabase_seed/content_db/villagers.json",
            "villager_count": len(rows),
            "species": len({row["species"] for row in rows}),
            "personalities": len({row["personality"] for row in rows}),
            "hobbies": len({row["hobby"] for row in rows}),
            "genders": len({row["gender"] for row in rows}),
            "birth_months": len({row["birth_month"] for row in rows if row["birth_month"]}),
            "debut_count": sum(bool(row["debut"]) for row in rows),
            "previous_phrase_count": sum(bool(row["previous_phrases"]) for row in rows),
            "multilingual_name_count": sum(len(row["name_locales"]) > 2 for row in rows),
            "multilingual_catchphrase_count": sum(
                len(row["catchphrase_locales"]) > 2 for row in rows
            ),
            "icon_local_image_count": sum(
                row["images"]["icon"]["has_local_image"] for row in rows
            ),
            "full_local_image_count": sum(
                row["images"]["full"]["has_local_image"] for row in rows
            ),
            "poster_local_image_count": sum(
                row["images"]["poster"]["has_local_image"] for row in rows
            ),
            "framed_photo_local_image_count": sum(
                row["images"]["framed_photo"]["has_local_image"] for row in rows
            ),
            "local_image_count": sum(row["has_local_image"] for row in rows),
            "remote_image_count": sum(bool(row["image_url"]) for row in rows),
            "poster_url_count": sum(bool(row["poster_url"]) for row in rows),
            "framed_photo_url_count": sum(bool(row["framed_photo_url"]) for row in rows),
        },
    )


if __name__ == "__main__":
    main()
