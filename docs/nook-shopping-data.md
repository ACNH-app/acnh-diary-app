# Nook Shopping Seasonal Products

The Today screen uses the selected game date and island hemisphere, not the device's calendar date. It displays the seasonal offering, not the player's randomized daily Special Goods stock or exact color variation.

- `acnh-diary-mobile/src/data/content/catalog/nook-shopping-events.json` maps selling windows to existing catalog names. Names, prices, detail routes, and images come from the catalog.
- `nook-shopping-years.json` contains moving windows for 2000-2060. The generator uses Node's ICU Chinese calendar for lunar dates and `date-easter` for Carnival of Venice. The latter is a development-only dependency.
- `nook-shopping-assets.ts` exposes 92 existing local images to the web catalog registry; no remote image fetch is needed.
- Recurring windows use current game rules, not historical update-specific availability. Unsupported years omit moving-date events rather than reuse the wrong year's dates.
- The new-year window crosses December/January. Zodiac figurines follow the upcoming year in December, and the dated arches appear only for 2021/2022.
- Event counts count shopping campaigns, not individual products. Campaigns with known daily product rotation are labeled accordingly.

## Rebuild And Test

Run from the repository root after installing the mobile project's dependencies:

```sh
node scripts/build_nook_shopping_data.cjs
node scripts/test_nook_shopping.cjs
```

The generator validates catalog matches and local asset registry entries. Tests cover all 92 products, date boundaries, lunar-year changes, hemisphere swaps, new-year rollover, empty dates, and generated asset files.

## Sources

- [Nookipedia seasonal event schedule](https://nookipedia.com/wiki/Nook_Shopping_seasonal_event), checked 2026-09-07. Only structured schedule facts and item associations are used, not event descriptions.
- Existing app catalog and original Norviah source records for product data.
- [date-easter](https://github.com/commenthol/date-easter) for the Gregorian Easter date used by Carnival of Venice (69 through 47 days before Easter).
