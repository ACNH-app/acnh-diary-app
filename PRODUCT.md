# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Primary users are Korean-speaking Animal Crossing: New Horizons players who want a private mobile companion for managing their own island play records. The product should support players who track multiple islands, daily routines, resident status, museum collection, and catalog ownership over time.

## Product Purpose

ACNH Diary is a personal mobile diary and reference app for recording island activity and checking game data without relying on login, a web server, or a network connection. Success means a player can open the app during normal play, see date-aware information, change collection or routine state quickly, and trust those records to persist locally.

## Positioning

The durable product position is an offline diary plus bundled ACNH reference: local SQLite user records are kept separate from bundled reference data, and the core Today, Villagers, Encyclopedia, and Catalog workflows must work without network access.

## Operating Context

The app is currently being built as a React Native + Expo mobile app with iOS as the first launch and verification target. Android is a planned future app target and must be considered in product and interface decisions rather than treated as out of scope.

Users begin with onboarding when no island exists, then return to the last active island's Today screen. Core navigation uses five bottom tabs: Today, Villagers, Encyclopedia, Catalog, and Guides. Guides has a reserved navigation position and post-MVP expansion contract.

Game date behavior follows Animal Crossing's 5:00 AM day boundary, with support for manual date selection and returning to the device-derived game date. Multiple islands are separated by `islandId`.

## Capabilities and Constraints

Confirmed capabilities include island onboarding and management, date-based Today information, daily routine logging, resident search and status management, encyclopedia collection and donation tracking, catalog browsing and ownership tracking, source and license notices, and JSON backup/restore.

The MVP implements Today, Villagers, Encyclopedia, and Catalog. Guides, weather/MeteoNook integration, turnip price calculation, weekly routines, mobile login, server accounts, and automatic web sync are out of scope unless later explicitly added.

The storage model is offline-first. User records live in SQLite through `expo-sqlite`; bundled reference data is app-facing JSON under `dataset/app-ready/` and copied into `acnh-diary-mobile/src/data/` for app use. Runtime UI should not read directly from `seed/`.

The stack is React Native, Expo SDK 57, Expo Router, TypeScript, React 19, React Native 0.86, and `expo-sqlite`. Routes live under `acnh-diary-mobile/src/app/`, and Expo Router remains the routing authority.

## Brand Commitments

The product name in repository documents is "모동숲 다이어리" / "ACNH Diary". Korean is the primary app language and product documentation language. Labels should preserve Korean-first terminology while keeping data keys and normalized identifiers stable for future locale expansion.

Future design work must not depend on color alone for state. Icons, labels, check states, and accessible fallbacks are part of the product commitment.

## Evidence on Hand

Durable product and technical evidence exists in:

- `docs/ACNH-Diary-Mobile-SRS.md`
- `docs/ACNH-Diary-Mobile-SAD.md`
- `docs/ACNH-Diary-Mobile-SDS.md`
- `dataset/app-ready/README.md`
- `dataset/app-ready/APP_DATA_SPEC.md`
- `acnh-diary-mobile/package.json`
- `acnh-diary-mobile/app.json`
- `acnh-diary-mobile/src/app/`
- `acnh-diary-mobile/src/constants/theme.ts`

The bundled dataset includes 417 normalized villagers, encyclopedia data for bugs, fish, sea creatures, fossils, and art, catalog content, localization helpers, and local/offline image assets. Source lineage includes ACNHAPI, Norviah, Nookipedia, and related file-level metadata already preserved in the dataset.

No real user testimonials, analytics, pricing, App Store claims, or launch metrics are present in the repository and future work must not fabricate them.

## Product Principles

1. Offline trust comes first: core lookup and record changes must work without network access.
2. Keep personal records separate from reference data so bundled data updates do not erase user history.
3. Make fast in-play capture possible with clear state, compact controls, and immediate persistence.
4. Preserve multi-island boundaries; records from different islands must not bleed together.
5. Design for iOS now while leaving Android interaction and layout needs viable for the planned app target.

## Accessibility & Inclusion

State must not be represented by color alone. Interactive status controls need accessible labels, text or icon reinforcement, and reliable checked/unchecked states. Current launch requirements target iOS 16.0+; Android 9.0/API 28+ is a planned future verification target.
