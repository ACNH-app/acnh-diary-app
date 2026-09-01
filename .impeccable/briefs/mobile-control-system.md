# Mobile Control System Brief

## Status

- Date: 2026-09-01
- Mode: Operate
- Platform: iOS first, Android planned
- Scope: design decision only; app code is not changed by this brief
- Approved direction: overall visual feeling from the generated comps is acceptable, but screen-level layout needs common control rules before implementation

## Job And Audience

Korean-speaking Animal Crossing: New Horizons players open the app while playing and need to record small state changes quickly. The interface should feel like a friendly island notebook, but the main success criterion is fast operation: users should understand what can be tapped, update state without friction, and trust that local records persist.

## Visual Direction

Use a NookPhone-inspired original control layer: warm paper ground, soft white cards, leaf-green primary actions, and small domain accents. The app should not become a marketing page or a decorative game clone. Game images/icons may be supported through a replaceable asset layer, but app controls should still have accessible labels and checked states.

## Color Roles

These roles should become shared tokens before screen-specific layout work:

| Role | Suggested Hex | Usage |
| --- | --- | --- |
| `paper` | `#FFFCF3` | App background and large quiet surfaces |
| `card` | `#FFFFFF` | Primary cards, search fields, panels |
| `paperRaised` | `#FFF6E4` | Raised filter panels and soft grouped controls |
| `ink` | `#3F2A14` | Primary Korean text |
| `inkMuted` | `#786D5B` | Secondary labels and metadata |
| `line` | `#E6D8BC` | Card borders, dividers, inactive rings |
| `leaf` | `#6FAE54` | Primary selected state, Today, active nav |
| `leafSoft` | `#EAF6DC` | Selected green backgrounds |
| `resident` | `#EF6E68` | Wishlist/resident emotional status |
| `residentSoft` | `#FFE7E2` | Soft resident status backgrounds |
| `museum` | `#3F94C5` | Donation/museum/encyclopedia status |
| `museumSoft` | `#E6F3FA` | Soft museum backgrounds |
| `catalog` | `#E7A334` | Owned/catalog status |
| `catalogSoft` | `#FFF1D6` | Soft catalog backgrounds |
| `camp` | `#2FA99F` | Campsite/temporary visit status |
| `campSoft` | `#DDF6F2` | Soft campsite backgrounds |
| `danger` | `#C95548` | Destructive or irreversible actions only |

State cannot rely on color alone. Every selected state must also use a check, fill, border weight, or accessibility state.

## Common Layout System

- App screen topology: top chrome, island context, primary title, search/filter row, icon category rail, content grid/list, bottom navigation.
- Top chrome should be quieter than the content. Avoid English eyebrow labels in the main Korean app UI unless they are intentionally part of a branded passport/detail surface.
- Bottom navigation should be icon-first with short Korean labels. It should keep five slots: Today, 주민, 도감, 카탈로그, 더보기/가이드.
- Search should remain a 48dp high field. Filter should be adjacent as an icon button or compact chip, not a large text-heavy button.
- Category rails should use icon + one short label. Horizontal scrolling is allowed when categories exceed the available width.
- Cards should use one elevation language: soft shadow or thin border, not both at full strength.

## Control Rules

- Minimum touch target: 44pt on iOS and 48dp on Android.
- Visible icon size can be smaller than the touch target. Preferred visible control sizes:
  - nav icon: 24-28
  - category icon: 22-28
  - compact status icon: 28-34
  - major quick-action icon: 36-44
- Use icon-only only when the surrounding context is unambiguous and accessibility labels are present.
- Icon + short Korean label is preferred for navigation, filters, and status controls used by new users.
- Long explanatory text should move out of repeated controls.

## Resident Screen Decision

Use the first resident comp as the density baseline, not the later large one-column card.

- Resident list stays as a two-column card grid.
- Remove the bottom sheet.
- Keep direct status recording inside each resident card.
- Remove species tags from cards because species is visually obvious from the resident image.
- Remove hobby tags from cards because hobby is low priority for quick scanning.
- If a tag is shown, show one personality tag only.
- Keep detail entry through a small menu/detail affordance.
- Status controls remain compact. All five statuses should fit in the card without dominating the portrait/name.
- The five list statuses are: wishlist, island resident, moved out, campsite visited, photo received.

Implementation translation: the first resident comp is the spatial reference; the compact status comp only informs icon sizing and state treatment.

## Today Screen Direction

Today should prioritize quick capture, not dashboard density.

- Keep large daily routine actions for high-frequency play logging.
- Use icon-first routine controls with short labels.
- Show currently available critters as a compact strip or small card row.
- Keep date/game-day context visible near the top.
- Avoid turning the screen into a statistics board.

## Encyclopedia And Catalog Direction

The collection comp is the strongest control-system reference.

- Use segmented switching only where two modes are truly parallel, such as 도감/카탈로그.
- Use filter summary chips so users can see active constraints without reading a long panel.
- Item cards should support three compact state controls where relevant: caught/seen, donated, owned.
- Category filter panels should be bottom-sheet-like only for broad filtering, not for ordinary per-item state recording.

## Component Mapping

| Existing Component | Intended Role |
| --- | --- |
| `AppChrome` | Top chrome, island context, drawer/detail entry |
| `AppBottomNav` | Shared five-slot mobile navigation |
| `SearchBar` | Shared search field |
| `ListControls` | Filter toggle, filter chips, sort/result toolbar |
| Resident card in `VillagersScreen` | First candidate for compact status-control treatment |
| Collection item cards | Second candidate for shared status-control treatment |

## Anti-Goals

- Do not implement the large one-column resident card as the default list.
- Do not use a resident bottom sheet for ordinary status recording.
- Do not redesign one screen in isolation before the common color and control rules are in place.
- Do not add long repeated text labels to every card.
- Do not represent state by color only.
- Do not use official-looking game UI chrome in a way that makes the app feel like a game screenshot rather than a companion app.

## Next Implementation Order

1. Add shared color/control tokens.
2. Update common navigation, search, filter, and status-control components.
3. Apply the system to Today, 주민, 도감, and 카탈로그 in small passes.
4. Verify iOS-sized and Android-sized mobile viewports before treating the design as ready.
