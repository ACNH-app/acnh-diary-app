---
target: current UI / acnh-diary-mobile/src
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-01T07-19-42Z
slug: acnh-diary-mobile-src
---
Method: dual-agent (A: 01a05bd1-92f7-7810-8bab-1c2a9a7cee2e - B: 01a05bd1-b736-7ec3-9bfa-0b373f5f1f74)

**Design Health Score**

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Counts and selected states exist, but saves/toggles often have no durable confirmation. |
| 2 | Match System / Real World | 3 | Korean ACNH terminology is strong; raw timezone input and English eyebrows weaken fit. |
| 3 | User Control and Freedom | 2 | Back/reset exist, but undo is absent and some reset/destructive actions need clearer control. |
| 4 | Consistency and Standards | 2 | Shared list controls help; custom chrome/drawer/tab choices fight iOS and future Android expectations. |
| 5 | Error Prevention | 2 | Validation and delete confirmation exist, but date/time, timezone, reset, and bulk actions need stronger guards. |
| 6 | Recognition Rather Than Recall | 3 | Most actions are labeled; abstract glyph status/category icons still require learning. |
| 7 | Flexibility and Efficiency | 2 | Search/sort/bulk collection actions exist; Today and resident status work remain mostly one-at-a-time. |
| 8 | Aesthetic and Minimalist Design | 2 | Cohesive but dense; many cards, chips, small labels, and repeated surfaces compete. |
| 9 | Error Recovery | 2 | Korean alerts are understandable but generic and rarely tell the user exactly how to recover. |
| 10 | Help and Documentation | 1 | Hints exist, but source/license, backup/restore, and Guides are placeholder or not discoverable. |
| **Total** | | **21/40** | **Acceptable: strong product model, release UI needs hardening** |

**Design Specificity Verdict**

**LLM assessment:** The interface knows the product at the IA and data level. The five-tab structure, Korean labels, island context, 5:00 AM game-day logic, resident state, museum state, catalog ownership, and offline framing are all ACNH-specific. But the visual language is only moderately authored. The repeated soft green cards, rounded panels, abstract glyphs, progress bars, and hamburger drawer could belong to a generic habit tracker or inventory app. The product has obvious native metaphors to use more deeply: NookPhone, passport, Critterpedia, museum stamps, catalog terminal, and daily island routine capture.

**Deterministic scan:** `detect.mjs --json acnh-diary-mobile/src` returned exit code `0` with `0` findings. There were no ignored findings because `.impeccable/critique/ignore.md` is absent. The detector did not contradict the design review; it simply found no rule-level violations.

**Visual overlays:** No reliable user-visible overlay exists. Assessment B started Expo web and confirmed `GET http://localhost:19006` returned `200`, but browser-control tools were not exposed and local Playwright/Puppeteer were unavailable, so screenshot capture and mutable overlay injection were skipped.

**Overall Impression**

This is a functional, serious mobile app shell with real ACNH workflows behind it. The weakness is not product understanding; it is native confidence and focus. The next pass should make the app feel less like a dense pastel database browser and more like a fast, trustworthy island companion someone uses one-handed while playing.

**What's Working**

The product model is concrete. Today combines island context, game date/time, season, current critters, routines, NPC visits, and calendar behavior in one operational surface, which matches how a companion app is actually used during play.

The collection workflows have depth. Villagers, Encyclopedia, and Catalog already include search, sort, filters, detail screens, status controls, local image assets, and island-scoped state.

Accessibility intent is present. Many controls have Korean `accessibilityLabel`, roles, selected/checked state, and alert text. That gives the next hardening pass a base to improve rather than a blank slate.

**Priority Issues**

**[P1] Native platform trust is undermined by custom chrome**  
**Why it matters:** `headerShown: false` plus a fully custom `AppTopBar` and drawer make the app feel web-shaped. iOS users lose expected large-title/nav behavior, and future Android work has no Material navigation adaptation path.  
**Fix:** Keep Expo Router as the routing authority, but redesign top-level navigation around native expectations: iOS stack/tab behavior, edge back, platform sheets for island/settings, and Android back/navigation patterns. Move the hamburger passport drawer into a conventional settings/island stack or platform sheet.  
**Suggested command:** `$impeccable shape app chrome`

**[P1] High-frequency tap targets are too small**  
**Why it matters:** Several controls fall below the iOS 44pt and Android 48dp minimums: collection/status buttons around `24-29`, date controls around `30`, NPC avatars around `24`, month controls around `34`, and catalog quantity buttons around `22`. These are exactly the controls users will hit while distracted.  
**Fix:** Increase hitboxes to platform minimums while keeping the visible glyph compact. Treat status toggles, date/time controls, NPC choices, quantity steppers, and clear/delete buttons as the first sweep.  
**Suggested command:** `$impeccable adapt mobile controls`

**[P1] Dynamic Type, dark mode, and semantic color are not release-ready**  
**Why it matters:** The app has `ThemeProvider`, but most screens use fixed `AppColors` hex values and fixed font sizes, including very small 8-11pt metadata. `StatusBar` is always dark. This will break for large text, dark appearance, and accessibility contrast.  
**Fix:** Introduce semantic role tokens for light/dark, map typography to reusable native text roles, remove negative letter spacing from compact UI, and verify large text/dark mode on device-class screenshots.  
**Suggested command:** `$impeccable harden theme and type`

**[P1] Today and advanced filters carry too much simultaneous work**  
**Why it matters:** Today asks the user to process summary, current critters, five critter tabs, routines, weekly NPCs, and a calendar in one scroll. Expanded filters in Villagers/Encyclopedia/Catalog expose many decision groups at once. This is powerful, but not optimized for quick in-play use.  
**Fix:** Split Today into a quick-capture path and a reference-exploration path. Convert advanced filters into structured sheets with applied-filter summaries and keep the screen body focused on results.  
**Suggested command:** `$impeccable shape today quick capture`

**[P2] Trust-critical support IA is visible but not actionable**  
**Why it matters:** The product promise is offline trust, but source/license and backup/restore are not first-class, discoverable flows yet. The drawer shows "데이터 출처 및 라이선스" with an arrow but it is not an actionable route.  
**Fix:** Add settings destinations for data sources/licenses and backup/restore. Make local-only storage and export safety visible where users need reassurance.  
**Suggested command:** `$impeccable harden settings trust flows`

**Persona Red Flags**

**Alex (Power User):** Bulk collection actions exist, but Today routines and NPC logging are still mostly one-by-one. There are no saved filter presets, recent searches, quick "usual daily set done," or resident batch status actions.

**Sam (Accessibility-Dependent):** Many labels exist, but checked controls sometimes use `button` semantics with checked state instead of checkbox/radio semantics. Tiny controls and 8-10pt calendar/filter/status labels will be painful with low vision or motor impairment.

**Casey (Distracted Mobile User):** The bottom nav is reachable, but the key capture actions are scattered across the scroll. Date/time, routines, NPC changes, current critters, and calendar actions compete. Small hitboxes make one-handed use fragile.

**지민 (Korean ACNH Player):** Wants to check "지금 뭐 잡을 수 있지?" and mark progress quickly while playing. The data supports that job, but English decorative labels like `TODAY ON`, `MUSEUM LOG`, `CATALOG LOG` and glyph icons like `✦`, `≈`, `▱`, `☷` feel less like 모동숲 and more like a generic dashboard.

**Minor Observations**

`SafeAreaView edges={[]}` appears on many main screens below custom chrome, so the app relies heavily on custom layout getting every inset right.

The drawer animation does not appear to honor Reduce Motion.

`CollectionHomeSummaryCard` renders a chevron-like affordance without a press action, which creates false affordance.

Invalid category routes appear to return `null` rather than a useful not-found recovery screen.

Onboarding currently ships with personal-looking defaults (`수원삼섬`, `그랑`, `사과`, `장미`), which can feel like test data or someone else's diary.

Calendar badges and several metadata labels are likely too small in Korean on real devices.

**Questions to Consider**

1. What if Today had two modes: "플레이 중 빠른 기록" and "오늘 정보 보기," instead of one long mixed dashboard?
2. What would make this feel unmistakably like a player's NookPhone diary rather than a pastel database browser?
3. Should the app prioritize fastest thumb capture over comprehensive reference data on the first screen?
4. Is the hamburger passport drawer worth the native-platform cost, or should island/settings live in a conventional stack/sheet pattern?
