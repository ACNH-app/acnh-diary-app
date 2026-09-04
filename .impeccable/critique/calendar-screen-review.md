# Calendar Screen Critique

## Scope

React Native calendar/date-time bottom sheet in `acnh-diary-mobile/src/screens/TodayScreen.tsx`. The live iOS simulator was not available, so this is a source-informed native UI critique rather than a screenshot-verified review.

## Heuristic Scores

| Heuristic | Score | Rationale |
| --- | ---: | --- |
| Visibility of system status | 3/4 | Selected date and actual current date are represented, but their visual relationship is not self-evident. |
| Match with the real world | 3/4 | Week/month calendar conventions are familiar, but the game-day boundary is not surfaced. |
| User control and freedom | 3/4 | Date, time, Today, Cancel, and Apply are available; Apply being required after Today is easy to miss. |
| Consistency and standards | 2/4 | Calendar controls use several local compact styles and sub-44px targets. |
| Error prevention | 3/4 | Date/time values are constrained, but navigating away from the selected date has little feedback. |
| Recognition over recall | 2/4 | Birthday/event colors and selected/current states lack a visible legend. |
| Flexibility and efficiency | 3/4 | Week/month views and quick Today support common workflows. |
| Aesthetic and minimalist design | 2/4 | The modal combines toggle, period navigation, dense grid, time steppers, and actions with high vertical density. |
| Error recovery | 3/4 | Cancel and Apply provide recovery, but there is no explicit unsaved/draft cue. |
| Help and documentation | 1/4 | There is no explanation for color meaning or the 5 AM game-date rule. |

Overall: 25/40. Functional foundation is good; focused polish is needed before calling the calendar effortless.

## Design Specificity

Moderate. The warm paper palette and birthday/event badges connect to the ACNH diary product, but the interaction pattern is still a generic calendar modal. Product-specific meaning should be carried by a clearer event legend and a selected-date detail area rather than tiny text embedded in every cell.

## What Works

- The calendar is correctly reused inside the date/time selection flow.
- Users can switch week/month, move between periods, select a date, choose Today, edit time, cancel, and apply.
- Birthday and event data are exposed through both visible labels and accessibility labels.
- The cream, leaf, catalog, and museum colors are coherent with the broader app palette.

## Priority Issues

### P1: Month cells are too dense to read

`calendarBadgeTextCompact` is 7px with a 9px line height, while month cells show up to two text badges and a `+N` marker. Korean villager/event names will be truncated and the calendar becomes a scan-resistant wall of microtext.

Recommendation: use small birthday/event dots or compact counts in month mode, and show the selected date's full items in a detail row below the grid. Keep text badges for week mode where cells have more vertical space.

### P1: Selected date and actual Today are ambiguous

Both states rely on the same leaf family: Today uses `leafSoft`, while selected uses a leaf border plus leaf text. If the selected date is Today, the two meanings collapse. There is also no legend.

Recommendation: represent Today with a small labeled marker or top dot, represent selection with a stronger outline/fill, and add a compact legend for `오늘`, `선택`, `생일`, and `이벤트`.

### P1: Week navigation title becomes misleading

The week title is hard-coded to `이번 주 한눈에 보기`, even after previous/next week navigation. The title should show the visible week range, for example `9월 7일 - 13일`.

### P1: Compact controls are below the app touch-target baseline

Period arrows are 30x30, the Today control has a 40px minimum height, and time steppers are 32px high. These are visually compact but difficult to tap reliably on iPhone.

Recommendation: keep the visual icon small but give each control at least a 44x44 hit area, using transparent padding where necessary.

### P2: Calendar semantics are not discoverable

Birthday and event colors are distinguishable in code, but the user has no legend or text explanation. The pastel foreground/background pairs also need a contrast check at the rendered 7-10px sizes.

Recommendation: add an always-visible legend or a short selected-date summary with labels, and darken semantic text independently from the pastel surfaces.

### P2: Date selection and time editing feel like separate tools

The grid ends, then a vertical plus/value/minus time control begins. The modal would feel more intentional if it presented a single `선택한 날짜 · 09:00` summary and an inline time stepper below it.

### P3: Draft state is implicit

`오늘` changes draft date/time and the user must still press `적용`. This is correct for Cancel support, but the UI does not say that the changes are pending.

Recommendation: keep Apply/Cancel, but show the draft value prominently and preserve a clear pressed/selected state on Today.

## Recommended Implementation Plan

1. Fix period title, touch areas, and Today/selected visual distinction.
2. Add calendar legend and selected-date item summary.
3. Change month mode to dots/counts; retain readable labels in week mode.
4. Recompose time editing around the selected date/time summary.
5. Validate pastel semantic text contrast and Dynamic Type behavior on compact cells.
