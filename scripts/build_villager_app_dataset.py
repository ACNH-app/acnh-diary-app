#!/usr/bin/env python3
"""Build the 417-entry villager dataset used by the mobile app."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "dataset/app-ready/seed/supabase_seed/content_db/villagers.json"
ACNHAPI_SOURCE = ROOT / "dataset/app-ready/content/villagers/villagers.acnhapi.json"
SAYING_MAP_SOURCE = ROOT / "dataset/app-ready/content/villagers/villager_saying_map_ko.json"
CATALOG_SOURCE = ROOT / "dataset/app-ready/seed/supabase_seed/content_db/catalog_items.json"
MUSIC_MANIFEST_SOURCE = ROOT / "dataset/app-ready/content/catalog/music/music_image_manifest.json"
CLOTHING_NAME_MAP_SOURCE = ROOT / "dataset/app-ready/content/catalog/clothing/clothing_name_map_ko.json"
INTERIOR_NAME_MAP_SOURCE = ROOT / "dataset/app-ready/content/catalog/interior/interior_name_map_ko.json"
MUSIC_NAME_MAP_SOURCE = ROOT / "dataset/app-ready/content/catalog/music/music_name_map_ko.json"
OUTPUT_DIR = ROOT / "dataset/app-ready/content/villagers"
LOCAL_ASSET_DIR = ROOT / "dataset/app-ready/assets/villagers"
RAW_REQUIRED_FIELDS = ("debut", "phrase", "prev_phrases", "title_color")
IMAGE_TYPES = ("icon", "full", "poster", "framed_photo", "house_exterior", "house_interior")
CATALOG_IMAGE_TYPES = ("poster", "framed_photo")


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


def load_translation_map(path: Path) -> dict[str, str]:
    return {str(key).lower(): str(value) for key, value in load_json(path).items()}


def translate(mapping: dict[str, str], value: str | None) -> str | None:
    return mapping.get(value.lower()) if value else None


def image_asset(villager_id: str, image_type: str, url: str | None) -> dict:
    suffix = Path(urlparse(url).path).suffix.lower() if url else ""
    extension = ".jpg" if suffix in {".jpg", ".jpeg"} else ".png"
    local_image = LOCAL_ASSET_DIR / image_type / f"{villager_id}{extension}"
    return {
        "url": url,
        "local_path": (
            f"assets/villagers/{image_type}/{villager_id}{extension}"
            if local_image.exists()
            else None
        ),
        "has_local_image": local_image.exists(),
    }


def normalize(
    row: dict,
    acnhapi_row: dict | None,
    saying_map: dict,
    catalog_items: dict[str, dict[str, dict]],
    music_assets: dict[str, dict],
    clothing_names: dict[str, str],
    interior_names: dict[str, str],
    music_names: dict[str, str],
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
    catalog_data = catalog_items[row["name_en"]]
    catalog_images = {
        image_type: catalog_data[image_type]["image_url"]
        for image_type in CATALOG_IMAGE_TYPES
    }
    music_asset = music_assets.get(raw_row.get("house_music"))
    house_furniture = raw_row.get("house_furniture")
    if not isinstance(house_furniture, list):
        house_furniture = []
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
        "number": (acnhapi_row or {}).get("id"),
        "name_ko": row["name_ko"],
        "name_en": row["name_en"],
        "species": row["species"],
        "species_ko": row["species_ko"],
        "personality": row["personality"],
        "personality_ko": row["personality_ko"],
        "gender": row["gender"],
        "subtype": row["sub_personality"],
        "hobby": row["hobby"],
        "activity_time": raw_row.get("activity_time") or raw_row.get("activity_times"),
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
        "default_clothing_ko": translate(clothing_names, raw_row.get("default_clothing")),
        "default_clothing_variation": raw_row.get("default_clothing_variation"),
        "default_umbrella": raw_row.get("default_umbrella"),
        "default_umbrella_ko": translate(clothing_names, raw_row.get("default_umbrella")),
        "house_wallpaper": raw_row.get("house_wallpaper"),
        "house_wallpaper_ko": translate(interior_names, raw_row.get("house_wallpaper")),
        "house_flooring": raw_row.get("house_flooring"),
        "house_flooring_ko": translate(interior_names, raw_row.get("house_flooring")),
        "house_furniture": house_furniture,
        "house_music": raw_row.get("house_music"),
        "house_music_ko": raw_row.get("house_music_ko")
        or translate(music_names, raw_row.get("house_music")),
        "house_music_note": raw_row.get("house_music_note"),
        "house_music_id": music_asset["id"] if music_asset else None,
        "house_music_image_url": music_asset["image_url"] if music_asset else None,
        "house_music_local_image_path": music_asset["local_path"] if music_asset else None,
        "collectibles": catalog_data,
        "images": {
            "icon": icon_asset,
            "full": full_asset,
            "poster": poster_asset,
            "framed_photo": framed_photo_asset,
            "house_exterior": image_asset(
                villager_id,
                "house_exterior",
                row.get("house_exterior_url"),
            ),
            "house_interior": image_asset(
                villager_id,
                "house_interior",
                row.get("house_interior_url"),
            ),
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
            str((acnhapi_row or {}).get("id")) if (acnhapi_row or {}).get("id") else None,
            row.get("species"),
            row.get("species_ko"),
            row.get("personality"),
            row.get("personality_ko"),
            row.get("gender"),
            row.get("hobby"),
            row.get("sub_personality"),
            raw_row.get("sign"),
            birthday,
            row.get("catchphrase"),
            row.get("catchphrase_ko"),
            saying_ko,
        ),
    }


def options(rows: list[dict], field: str) -> list[dict]:
    counts = Counter(row[field] for row in rows if row.get(field))
    return [{"key": key, "count": counts[key]} for key in sorted(counts)]


def load_catalog_items(villager_names: set[str]) -> dict[str, dict[str, dict]]:
    items: dict[str, dict[str, dict]] = {name: {} for name in villager_names}
    for row in load_json(CATALOG_SOURCE):
        if row.get("catalog_type") != "photos":
            continue
        item = json.loads(row.get("item_json") or "{}")
        item_name = item.get("name_en") or ""
        for image_type, suffix in (("poster", "poster"), ("framed_photo", "photo")):
            for villager_name in villager_names:
                if item_name == f"{villager_name}'s {suffix}":
                    if item.get("image_url"):
                        items[villager_name][image_type] = {
                            "item_id": row.get("item_id"),
                            "name_ko": row.get("name_ko") or item.get("name_ko"),
                            "name_en": row.get("name_en") or item.get("name_en"),
                            "image_url": item["image_url"],
                            "buy": row.get("buy", 0),
                            "sell": row.get("sell", 0),
                            "source": row.get("source_ko") or row.get("source") or None,
                            "source_notes": row.get("source_notes_ko")
                            or row.get("source_notes")
                            or None,
                        }
                    break

    missing = {
        name: sorted(set(CATALOG_IMAGE_TYPES) - set(values))
        for name, values in items.items()
        if not all(image_type in values for image_type in CATALOG_IMAGE_TYPES)
    }
    if missing:
        raise SystemExit(f"Missing catalog items: {missing}")
    return items


def load_music_assets() -> dict[str, dict]:
    assets: dict[str, dict] = {}
    for music_id, row in load_json(MUSIC_MANIFEST_SOURCE).items():
        name = row.get("name")
        if not name:
            continue
        local_file = ROOT / "dataset/app-ready/assets/catalog/music/items" / f"{music_id}.png"
        assets[name] = {
            "id": music_id,
            "image_url": row.get("image_url"),
            "local_path": (
                f"assets/catalog/music/items/{music_id}.png"
                if local_file.exists()
                else None
            ),
        }
    return assets


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

    catalog_items = load_catalog_items({row["name_en"] for row in source_rows})
    music_assets = load_music_assets()
    clothing_names = load_translation_map(CLOTHING_NAME_MAP_SOURCE)
    interior_names = load_translation_map(INTERIOR_NAME_MAP_SOURCE)
    music_names = load_translation_map(MUSIC_NAME_MAP_SOURCE)
    acnhapi_rows = {
        row["file-name"]: row for row in load_json(ACNHAPI_SOURCE).values()
    }
    saying_map = load_json(SAYING_MAP_SOURCE)
    rows = [
        normalize(
            row,
            acnhapi_rows.get(row["villager_id"]),
            saying_map,
            catalog_items,
            music_assets,
            clothing_names,
            interior_names,
            music_names,
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
            "house_exterior_url_count": sum(bool(row["house_exterior_url"]) for row in rows),
            "house_interior_url_count": sum(bool(row["house_interior_url"]) for row in rows),
            "house_wallpaper_count": sum(bool(row["house_wallpaper"]) for row in rows),
            "house_flooring_count": sum(bool(row["house_flooring"]) for row in rows),
            "house_music_count": sum(bool(row["house_music"]) for row in rows),
            "house_furniture_count": sum(bool(row["house_furniture"]) for row in rows),
            "activity_time_count": sum(bool(row["activity_time"]) for row in rows),
            "local_image_count": sum(row["has_local_image"] for row in rows),
            "remote_image_count": sum(bool(row["image_url"]) for row in rows),
            "poster_url_count": sum(bool(row["poster_url"]) for row in rows),
            "framed_photo_url_count": sum(bool(row["framed_photo_url"]) for row in rows),
        },
    )


if __name__ == "__main__":
    main()
