#!/usr/bin/env python3
"""Build normalized app data for the five encyclopedia categories."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_SOURCE = ROOT / "dataset/seed/supabase_seed/content_db/catalog_items.json"
MUSEUM_ROOT = ROOT / "dataset/app-ready/content/museum"
ASSET_ROOT = ROOT / "dataset/app-ready/assets"
CATEGORIES = ("bugs", "fish", "sea", "fossils", "art")
OUTPUT_ROOTS = (
    ROOT / "dataset/app-ready/content/encyclopedia",
    ROOT / "acnh-diary-mobile/src/data/content/encyclopedia",
)


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_museum_phrases(category: str) -> dict[str, str]:
    source = MUSEUM_ROOT / f"{category}.acnhapi.json"
    if not source.exists():
        return {}
    data = load_json(source)
    rows = data.values() if isinstance(data, dict) else data
    phrases = {}
    for row in rows:
        names = row.get("name") or {}
        name = names.get("name-USen") or names.get("name-EUen")
        phrase = row.get("museum-phrase")
        if name and phrase:
            phrases[str(name).casefold()] = phrase
    return phrases


def number_or_none(value) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def availability(details: dict, hemisphere: str) -> dict:
    source = details.get(hemisphere) or {}
    return {
        "label": source.get("months"),
        "months": source.get("months_array") or [],
        "timesByMonth": source.get("times_by_month") or {},
        "periods": source.get("availability_array") or [],
    }


def first_catchphrase(details: dict) -> str | None:
    values = details.get("catchphrases") or []
    return values[0] if values else None


def build_record(row: dict, museum_phrases: dict[str, str]) -> dict:
    category = row["catalog_type"]
    item_id = row["item_id"]
    details = json.loads(row.get("raw_json") or "{}")
    local_path = f"assets/encyclopedia/{category}/items/{item_id}.png"
    local_file = ASSET_ROOT / "encyclopedia" / category / "items" / f"{item_id}.png"
    if not local_file.exists():
        raise SystemExit(f"Missing encyclopedia image: {local_file}")

    render_url = details.get("render_url")
    render_file = ASSET_ROOT / "encyclopedia" / category / "tank" / f"{item_id}.png"
    if render_url and not render_file.exists():
        raise SystemExit(f"Missing encyclopedia tank image: {render_file}")

    record = {
        "id": item_id,
        "category": category,
        "number": number_or_none(details.get("number", row.get("number"))),
        "nameKo": row.get("name_ko") or row.get("name") or "",
        "nameEn": row.get("name_en") or details.get("name") or "",
        "image": {
            "url": row.get("image_url") or details.get("image_url"),
            "localPath": local_path,
        },
        "sourceUrl": details.get("url"),
        "museumPhrase": museum_phrases.get(
            str(details.get("name") or row.get("name_en") or "").casefold()
        ),
        "location": details.get("location"),
        "condition": details.get("weather"),
        "rarity": details.get("rarity"),
        "availability": {
            "north": availability(details, "north"),
            "south": availability(details, "south"),
        },
        "catchphrase": first_catchphrase(details),
        "prices": {
            "primary": None,
            "primaryLabel": None,
            "special": None,
            "specialLabel": None,
        },
        "shadow": details.get("shadow_size"),
        "movementSpeed": details.get("shadow_movement"),
        "tank": {
            "width": details.get("tank_width"),
            "length": details.get("tank_length"),
        },
        "tankImage": {
            "url": render_url,
            "localPath": f"assets/encyclopedia/{category}/tank/{item_id}.png",
        } if render_url else None,
        "fossilGroup": details.get("fossil_group"),
        "interactable": details.get("interactable"),
        "artwork": None,
    }

    if category == "bugs":
        record["prices"] = {
            "primary": details.get("sell_nook"),
            "primaryLabel": "너굴상점",
            "special": details.get("sell_flick"),
            "specialLabel": "레온",
        }
    elif category == "fish":
        record["prices"] = {
            "primary": details.get("sell_nook"),
            "primaryLabel": "너굴상점",
            "special": details.get("sell_cj"),
            "specialLabel": "저스틴",
        }
    elif category == "sea":
        record["prices"] = {
            "primary": details.get("sell_nook"),
            "primaryLabel": "판매가",
            "special": None,
            "specialLabel": None,
        }
    elif category == "fossils":
        record["prices"] = {
            "primary": details.get("sell") or row.get("sell"),
            "primaryLabel": "판매가",
            "special": None,
            "specialLabel": None,
        }
        record["size"] = {
            "width": details.get("width"),
            "length": details.get("length"),
        }
    elif category == "art":
        real_info = details.get("real_info") or {}
        fake_info = details.get("fake_info") or {}
        for asset_variant, image_url in (("real", real_info.get("image_url")), ("fake", fake_info.get("image_url"))):
            if image_url:
                detail_file = ASSET_ROOT / "encyclopedia" / "art" / asset_variant / f"{item_id}.png"
                if not detail_file.exists():
                    raise SystemExit(f"Missing encyclopedia art image: {detail_file}")
        record["prices"] = {
            "primary": details.get("buy") or row.get("buy"),
            "primaryLabel": "구매가",
            "special": details.get("sell") or row.get("sell"),
            "specialLabel": "판매가",
        }
        record["artwork"] = {
            "type": details.get("art_type"),
            "artName": details.get("art_name"),
            "style": details.get("art_style"),
            "author": details.get("author"),
            "year": details.get("year"),
            "availability": details.get("availability"),
            "hasFake": bool(details.get("has_fake")),
            "width": details.get("width"),
            "length": details.get("length"),
            "realImageUrl": real_info.get("image_url"),
            "realImageLocalPath": f"assets/encyclopedia/art/real/{item_id}.png"
            if real_info.get("image_url")
            else None,
            "fakeImageUrl": fake_info.get("image_url"),
            "fakeImageLocalPath": f"assets/encyclopedia/art/fake/{item_id}.png"
            if fake_info.get("image_url")
            else None,
            "realDescription": real_info.get("description"),
            "fakeDescription": fake_info.get("description"),
        }

    return record


def main() -> None:
    rows = load_json(CATALOG_SOURCE)
    phrases = {category: load_museum_phrases(category) for category in CATEGORIES}
    grouped = {category: [] for category in CATEGORIES}
    for row in rows:
        category = row.get("catalog_type")
        if category in grouped:
            grouped[category].append(build_record(row, phrases[category]))

    for category, values in grouped.items():
        values.sort(
            key=lambda value: (
                value["number"] is None,
                value["number"] if value["number"] is not None else 0,
                value["nameKo"],
            )
        )
        encoded = json.dumps(values, ensure_ascii=False, indent=2) + "\n"
        for output_root in OUTPUT_ROOTS:
            output_root.mkdir(parents=True, exist_ok=True)
            (output_root / f"{category}.json").write_text(encoded, encoding="utf-8")
        print(f"{category}={len(values)}")


if __name__ == "__main__":
    main()
