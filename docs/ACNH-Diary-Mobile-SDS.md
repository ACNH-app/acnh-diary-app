# 모동숲 다이어리 모바일 앱 상세 설계서

문서 상태: Draft v1.5
최종 수정일: 2026-08-29  
기준 문서: 모바일 SRS v1.3 · 모바일 SAD v1.3

## 1. 구현 기준

모바일 앱은 Expo SDK 57 + React Native + TypeScript + Expo Router로 만들고, 사용자 기록은 `expo-sqlite`에 저장한다. FastAPI·Supabase·로그인·클라우드 동기화는 모바일 런타임에 포함하지 않는다. 현재 출시 검증 대상은 iOS 16.0+이며 Android 9.0(API 28+)는 후속 플랫폼이다.

### 1.1 디렉터리 구조

```text
acnh-diary-mobile/
  src/
    app/
      _layout.tsx
      index.tsx
      onboarding.tsx
      (tabs)/
        _layout.tsx
        today.tsx
        villagers.tsx
        encyclopedia.tsx
        catalog.tsx
        guides.tsx
    screens/
      OnboardingScreen.tsx
      PlaceholderScreen.tsx
      SplashScreen.tsx
      TodayScreen.tsx
    components/
    db/
      database.ts
    domain/       # planned
    data/         # planned
    storage/      # planned
    features/     # planned
    hooks/        # planned
    backup/       # planned
    ui/tokens/    # planned
  assets/
  scripts/
```

현재 Phase 0은 위의 route·screen·SQLite 초기화 골격만 구현한다. 주민·도감 상세 route와 `domain`·`data`·`storage`·`backup` 모듈은 다음 단계에서 추가한다. 별도 monorepo `packages/`는 만들지 않는다. 아래의 전체 스키마와 Repository 계약은 Phase 1·2의 목표 계약이며, Phase 0의 `src/db/database.ts`는 이 계약의 일부만 제공한다.

### 1.2 앱 진입점 및 라우팅

`package.json`의 `main`은 `expo-router/entry`로 설정한다. `src/app/`이 유일한 route root이며, 루트 `App.tsx`와 사용자 정의 `index.ts`는 앱 라우팅 진입점으로 사용하지 않는다. `src/app/_layout.tsx`는 공통 ThemeProvider·Stack을 구성하고, `src/app/index.tsx`가 SQLite 초기화 결과에 따라 스플래시·온보딩·오늘 route로 redirect한다. Expo Router 내부에서 사용하는 React Navigation navigator를 앱에서 중복 구성하지 않는다.

현재 iOS 네이티브 빌드는 Xcode 16.1 이상을 기준으로 하며, Xcode 26 계열에서는 `patches/expo-modules-jsi+57.0.6.patch`를 자동 적용한다. Android 빌드는 후속 플랫폼 단계에서 추가한다.

### 1.3 첫 구현 수직 슬라이스

문서와 구현의 기준점을 맞추기 위해 첫 기능 구현은 다음 범위로 제한한다. 이 범위가 완료되기 전에는 주민·도감·백업의 상세 기능을 병렬로 확장하지 않는다.

포함 범위:

- SQLite 초기화와 Migration v1
- 첫 섬·주민대표 생성 및 활성 섬 지정
- 섬의 반구·시간대에 따른 게임 날짜 계산
- 수동 날짜 설정·해제
- 매일 반복 루틴 목록 조회
- 루틴의 체크·횟수 변경과 날짜별 저장
- 오늘 화면의 로딩·빈 상태·오류·저장 중 상태
- 앱 종료 후 재실행 시 섬과 루틴 기록 복원

후속 범위:

- 현재 출현 생물·계절·이벤트·NPC·캘린더의 실제 데이터 조립
- 주민·도감·카탈로그의 상세 화면과 수집 상태
- 백업 내보내기·복원
- 여러 섬 관리 UI

첫 수직 슬라이스는 `src/app` route가 직접 SQL을 실행하지 않고, `features`의 hook과 `domain` 정책을 통해 `storage` Repository를 호출하는지로 완료를 판단한다. 기준 데이터가 없는 기능은 빈 상태를 표시하되, 사용자 기록 기능을 막지 않는다.

## 2. TypeScript 도메인 타입

```typescript
type IslandId = string;
type GameDate = string; // YYYY-MM-DD
type ItemType =
  | "bug"
  | "fish"
  | "sea"
  | "fossil"
  | "artwork"
  | "photo"
  | "poster";

interface Island {
  id: IslandId;
  name: string;
  hemisphere: "north" | "south";
  nativeFruit: string;
  nativeFlower: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlayerProfile {
  islandId: IslandId;
  name: string;
  birthdayMonth: number;
  birthdayDay: number;
}

interface GameDateContext {
  deviceNow: string;
  gameDate: GameDate;
  source: "device" | "manual";
  timezone: string;
}

interface CollectionState {
  owned: boolean;
  caught: boolean;
  donated: boolean;
  genuineOwned: boolean;
  fakeOwned: boolean;
  learned: boolean;
  quantity: number | null;
}

interface CollectionRecord extends CollectionState {
  islandId: IslandId;
  itemType: ItemType;
  itemId: string;
  firstRecordedAt: string | null;
  updatedAt: string;
}

type VillagerStateType =
  | "wishlist"
  | "resident"
  | "former_resident"
  | "campsite";

interface VillagerState {
  islandId: IslandId;
  villagerId: string;
  stateType: VillagerStateType;
}

interface CampsiteVisit {
  id: string;
  islandId: IslandId;
  villagerId: string;
  visitedOn: GameDate;
}

interface RoutineDefinition {
  id: string;
  islandId: IslandId;
  logicalKey: string;
  version: number;
  name: string;
  iconKey: string | null;
  targetCount: number | null;
  repeatType: "daily";
  sortOrder: number;
  isSystemDefault: boolean;
  effectiveFrom: GameDate;
  effectiveTo: GameDate | null;
}

interface RoutineLog {
  id: string;
  islandId: IslandId;
  routineId: string;
  gameDate: GameDate;
  currentCount: number;
  isComplete: boolean;
}
```

### 2.1 공통 입력·결과 타입

Repository와 Use Case 계약에서 사용하는 보조 타입은 다음과 같이 정의한다. 이 타입들은 구현 시 `src/domain/types.ts`에 옮기며, 화면이 임의의 문자열이나 SQL 컬럼명을 직접 사용하지 않는다.

```typescript
type Hemisphere = "north" | "south";
type ItemKey = Pick<CollectionRecord, "itemType" | "itemId">;

interface Availability {
  monthsNorth: number[];
  monthsSouth: number[];
  timeRanges: Array<{ startMinute: number; endMinute: number }>;
  isAllDay: boolean;
  location: string | null;
  weatherCondition: string | null;
}

type CollectionFilterField =
  | "caught"
  | "owned"
  | "donated"
  | "genuineOwned"
  | "fakeOwned";

interface CollectionFilter {
  field: CollectionFilterField;
  value: boolean;
}

type CollectionPatch = Partial<CollectionState>;

interface BulkResult {
  updatedCount: number;
  skippedCount: number;
}

interface CreatePlayerProfileInput {
  name: string;
  birthdayMonth: number;
  birthdayDay: number;
}

interface CreateIslandInput {
  name: string;
  hemisphere: Hemisphere;
  nativeFruit: string;
  nativeFlower: string;
  timezone: string;
  profile: CreatePlayerProfileInput;
}

type UpdateIslandInput = Partial<
  Pick<Island, "name" | "hemisphere" | "nativeFruit" | "nativeFlower" | "timezone">
> & { profile?: Partial<CreatePlayerProfileInput> };

interface ReviseRoutineDefinitionInput {
  islandId: IslandId;
  logicalKey: string;
  effectiveFrom: GameDate;
  name: string;
  iconKey?: string | null;
  targetCount: number | null;
  sortOrder: number;
}

interface SetRoutineProgressInput {
  islandId: IslandId;
  routineId: string;
  gameDate: GameDate;
  currentCount: number;
}

interface SetVillagerStateInput {
  islandId: IslandId;
  villagerId: string;
  stateType: VillagerStateType;
  enabled: boolean;
}

interface VillagerResidency {
  id: string;
  islandId: IslandId;
  villagerId: string;
  movedInOn: GameDate | null;
  movedOutOn: GameDate | null;
}

interface CampsiteVisitInput {
  islandId: IslandId;
  villagerId: string;
  visitedOn: GameDate;
}

interface DateRange {
  start: GameDate;
  end: GameDate;
}

interface NpcVisit {
  islandId: IslandId;
  visitedOn: GameDate;
  npcId: string;
  memo: string | null;
}

interface NpcVisitInput {
  islandId: IslandId;
  visitedOn: GameDate;
  npcId: string;
  memo?: string | null;
}

interface BackupValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; path?: string }>;
}

interface ImportResult {
  islandCount: number;
  recordCount: number;
}
```

`photo_received`는 별도 `VillagerStateType`으로 저장하지 않는다. 주민 액자 사진의 `CollectionRecord(itemType = "photo", owned = true)`를 selector에서 읽어 액자 상태를 계산한다. 사진과 포스터는 서로 다른 `itemType`으로 저장한다.

TypeScript 모델은 camelCase를 사용하고 SQLite 컬럼은 snake_case를 사용한다. Repository가 두 표현 사이를 변환하며, 화면과 Domain이 SQL 컬럼명을 직접 사용하지 않는다.

### 2.2 게임 날짜 계산 계약

게임 날짜 계산은 `src/domain/game-date.ts`에 두고 화면·Repository·기준 데이터 어댑터가 각각 계산하지 않는다.

```typescript
interface GameDateInput {
  deviceNow: string; // ISO 8601 instant
  manualDate: GameDate | null;
  timezone: string; // IANA, e.g. Asia/Seoul
}

function getGameDateContext(input: GameDateInput): GameDateContext;
```

계산 규칙:

1. `manualDate`가 있으면 시간대와 오전 5시 계산을 적용하지 않고 해당 날짜를 반환한다.
2. `manualDate`가 없으면 `deviceNow`를 섬의 IANA 시간대로 변환한다.
3. 변환된 현지 시각이 05:00 미만이면 현지 날짜에서 하루를 뺀다.
4. 반환 날짜는 항상 `YYYY-MM-DD`이고, 잘못된 ISO instant·IANA time zone·수동 날짜는 `VALIDATION_ERROR`로 처리한다.
5. 기기 시간대가 아니라 섬에 저장된 시간대를 우선한다. 온보딩의 기본값은 기기 IANA 시간대이며 사용자가 변경할 수 있다.

`deviceNow`는 테스트에서 고정할 수 있어야 한다. 전역 `new Date()`를 Domain 함수 내부에서 직접 호출하지 않는다.

### 2.3 루틴 정책 계약

루틴 정책은 `src/domain/routine-policy.ts`에 둔다. UI는 완료 여부를 임의로 계산하지 않고 이 정책의 결과를 사용한다.

```typescript
interface RoutineViewModel {
  id: string;
  logicalKey: string;
  title: string;
  iconKey: string | null;
  targetCount: number | null;
  currentCount: number;
  isComplete: boolean;
  isImageGrayscale: boolean;
}

function calculateRoutineCompletion(
  targetCount: number | null,
  currentCount: number,
): boolean;

function validateRoutineProgress(
  targetCount: number | null,
  currentCount: number,
): void;
```

- `targetCount === null`은 체크만 하는 루틴이며 유효한 `currentCount`는 `0` 또는 `1`이다.
- `targetCount >= 1`이면 `currentCount`는 `0` 이상 `targetCount` 이하의 정수다.
- 체크형 루틴은 `currentCount === 1`, 횟수형 루틴은 `currentCount === targetCount`일 때 완료다.
- 완료 상태의 `isImageGrayscale`는 `false`, 미완료 상태는 `true`다. 색상 외에 체크 아이콘과 접근성 레이블도 함께 바꾼다.
- 입력이 범위를 벗어나면 저장하지 않고 `VALIDATION_ERROR`를 반환한다.
- 첫 구현의 기본 루틴은 체크형으로 둘지 횟수형으로 둘지 제품 결정이 필요하다. 현재 화면 placeholder에는 `토마토 심기`, `집 정리`가 있으나 이는 최종 기본 루틴 목록으로 확정된 값이 아니다.

## 3. 기준 데이터 타입

```typescript
interface DataManifest {
  dataVersion: string;
  sources: Array<"acnhapi" | "norviah" | "nookipedia">;
  sourceUrls: string[];
  updatedAt: string;
  schemaVersion: number;
}

interface UiLabelMap {
  version: number;
  locales: {
    ko: Record<string, string>;
    en?: Record<string, string>;
  };
}

interface CritterBase {
  id: string;
  number: number;
  nameKo: string;
  nameEn: string | null;
  imageUri: string | null;
  catchphrase: string | null;
  availability: Availability | null;
  frequency: string | null;
  tankSize: string | null;
  tankImageUri: string | null;
}

interface Bug extends CritterBase {
  type: "bug";
  location: string | null;
  weatherCondition: string | null;
  nookPrice: number | null;
  flickPrice: number | null;
}

interface Fish extends CritterBase {
  type: "fish";
  location: string | null;
  weatherCondition: string | null;
  nookPrice: number | null;
  cjPrice: number | null;
  size: string | null;
}

interface SeaCreature extends CritterBase {
  type: "sea";
  sellPrice: number | null;
  shadowSize: string | null;
  movementSpeed: string | null;
}

interface Fossil {
  id: string;
  number: number | null;
  nameKo: string;
  imageUri: string | null;
  sellPrice: number | null;
  fossilGroup: string | null;
  length: number | null;
  width: number | null;
  interactable: boolean | null;
}

interface Artwork {
  id: string;
  number: number;
  nameKo: string;
  imageUri: string | null;
  buyPrice: number | null;
  sellPrice: number | null;
  acquisition: string | null;
  hasForgery: boolean;
  size: string | null;
  artName: string | null;
  style: string | null;
  type: "painting" | "statue" | null;
  author: string | null;
  description: string | null;
  forgeryDifference: string | null;
}
```

모든 상세 필드는 nullable이며 값이 없으면 화면에서 숨긴다.

### 3.1 기준 데이터 어댑터 규칙

`src/data`는 `dataset/app-ready/content`의 파일별 원본 구조를 앱 도메인 타입으로 변환한다. 원본 JSON의 키를 화면이나 Domain에서 직접 사용하지 않는다.

- 곤충·물고기·해산물은 배열의 `id`를 문자열 `id`와 번호 `number`로 사용하고, `name["name-KRko"]`, `availability["month-array-northern"]`, `availability["month-array-southern"]`, `availability["time-array"]`를 정규화한다.
- 화석은 객체의 key 또는 `file-name`을 안정적인 `id`로 사용한다. 현재 원본에 번호가 없으므로 `number`는 `null`이며 기본 정렬은 표시 순서와 이름을 사용한다.
- 출현 시간·월·위치·가격은 Domain이 사용할 정규화 필드로 변환하고, 원본에 없는 값은 `null`로 둔다.
- 미술품은 현재 `art_name_map_ko.json`만 있고 앱용 원천 목록 파일이 없으므로, 원천 파일이 추가되기 전까지 미술품 목록·상세의 MVP 수용을 완료로 처리하지 않는다.
- 앱 번들에는 검증된 파일 목록만 포함한다. `dataset/app-ready/seed`와 저장소 루트의 원본 경로는 런타임에서 직접 import하지 않는다.

## 4. SQLite 스키마

### 4.1 메타·섬

```sql
CREATE TABLE schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE islands (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 10),
  hemisphere TEXT NOT NULL CHECK(hemisphere IN ('north', 'south')),
  native_fruit TEXT NOT NULL,
  native_flower TEXT NOT NULL,
  timezone TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX one_active_island
ON islands(is_active) WHERE is_active = 1;

CREATE TABLE player_profiles (
  island_id TEXT PRIMARY KEY NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 10),
  birthday_month INTEGER NOT NULL CHECK(birthday_month BETWEEN 1 AND 12),
  birthday_day INTEGER NOT NULL CHECK(birthday_day BETWEEN 1 AND 31)
);
```

### 4.2 루틴

```sql
CREATE TABLE routine_definitions (
  id TEXT PRIMARY KEY NOT NULL,
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  logical_key TEXT NOT NULL,
  version INTEGER NOT NULL,
  name TEXT NOT NULL,
  icon_key TEXT,
  target_count INTEGER,
  repeat_type TEXT NOT NULL DEFAULT 'daily' CHECK(repeat_type = 'daily'),
  sort_order INTEGER NOT NULL,
  is_system_default INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  UNIQUE(island_id, logical_key, version)
);

CREATE TABLE routine_logs (
  id TEXT PRIMARY KEY NOT NULL,
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  routine_id TEXT NOT NULL REFERENCES routine_definitions(id),
  game_date TEXT NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_complete INTEGER NOT NULL DEFAULT 0,
  UNIQUE(island_id, routine_id, game_date)
);
```

### 4.3 수집과 주민

```sql
CREATE TABLE collection_records (
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  owned INTEGER NOT NULL DEFAULT 0,
  caught INTEGER NOT NULL DEFAULT 0,
  donated INTEGER NOT NULL DEFAULT 0,
  genuine_owned INTEGER NOT NULL DEFAULT 0,
  fake_owned INTEGER NOT NULL DEFAULT 0,
  learned INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER,
  first_recorded_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(island_id, item_type, item_id)
);

CREATE TABLE villager_states (
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  villager_id TEXT NOT NULL,
  state_type TEXT NOT NULL CHECK(state_type IN (
    'wishlist', 'resident', 'former_resident', 'campsite'
  )),
  PRIMARY KEY(island_id, villager_id, state_type)
);

CREATE TABLE villager_residencies (
  id TEXT PRIMARY KEY NOT NULL,
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  villager_id TEXT NOT NULL,
  moved_in_on TEXT,
  moved_out_on TEXT
);

CREATE TABLE campsite_visits (
  id TEXT PRIMARY KEY NOT NULL,
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  villager_id TEXT NOT NULL,
  visited_on TEXT NOT NULL,
  UNIQUE(island_id, villager_id, visited_on)
);

CREATE INDEX collection_lookup
ON collection_records(island_id, item_type, item_id);

CREATE INDEX villager_state_lookup
ON villager_states(island_id, state_type);
```

### 4.4 오늘 기록

```sql
CREATE TABLE npc_visits (
  island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  visited_on TEXT NOT NULL,
  npc_id TEXT NOT NULL,
  memo TEXT,
  PRIMARY KEY(island_id, visited_on)
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

`app_settings.manual_date`가 `NULL`이면 기기 시각으로 계산하고, 값이 있으면 `YYYY-MM-DD` 수동 기준 날짜로 사용한다. `app_settings.active_data_version`은 항상 문자열로 저장해 번들 기준 데이터 manifest와 비교한다.

## 5. Migration

Phase 0의 `src/db/database.ts`는 실행 기준선을 위해 `expo-sqlite` 동기 API를 사용한다. Phase 1부터는 migration과 Repository 내부를 비동기 API로 통일하고, 아래 계약처럼 Use Case 경계도 `Promise`를 사용한다.

```typescript
interface Migration {
  version: number;
  up(db: SQLiteDatabase): Promise<void>;
}

async function migrate(db: SQLiteDatabase, migrations: Migration[]) {
  await db.execAsync("PRAGMA foreign_keys = ON");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const current = await readSchemaVersion(db);
  for (const migration of migrations
    .filter(m => m.version > current)
    .sort((a, b) => a.version - b.version)) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await writeSchemaVersion(db, migration.version);
    });
  }
}
```

Migration은 번호가 증가해야 하고, 사용자 기록을 삭제하지 않는다. 루틴 정의 기간 관리나 카탈로그 변형 추가는 신규 컬럼 또는 신규 테이블로 확장한다.

### 5.1 Migration v1 범위

전체 목표 스키마(4장)와 실제 배포 단계를 분리한다. 첫 구현에서 Migration v1이 생성하는 테이블은 다음 6개다.

| Migration | 테이블 | 목적 |
|---|---|---|
| v1 | `schema_meta` | 현재 스키마 버전 저장 |
| v1 | `islands` | 섬 정보와 활성 섬 |
| v1 | `player_profiles` | 주민대표 정보 |
| v1 | `routine_definitions` | 날짜별 유효 루틴 정의 |
| v1 | `routine_logs` | 섬·루틴·게임 날짜별 진행 상태 |
| v1 | `app_settings` | 수동 날짜와 데이터 버전 |

`collection_records`, 주민 관련 테이블, `npc_visits`는 후속 Migration에서 추가한다. 따라서 v1 화면은 해당 기능이 아직 없어도 초기화에 실패하지 않아야 한다. v1 이후 Migration은 새 테이블·컬럼을 추가하는 방식으로만 확장하고, 기존 사용자 기록을 삭제하거나 기본값으로 덮어쓰지 않는다.

Migration 실행 규칙:

1. DB 연결 직후 `PRAGMA foreign_keys = ON`을 실행한다.
2. `schema_meta`를 `CREATE TABLE IF NOT EXISTS`로 먼저 보장하고, `schema_version`이 없으면 `0`으로 본다.
3. Migration 배열은 버전 오름차순으로 정렬하고, 각 Migration을 별도 transaction으로 실행한다.
4. `up()` 성공 후 같은 transaction 안에서 `schema_meta.schema_version`을 기록한다. 실패하면 해당 Migration과 버전 기록을 함께 rollback한다.
5. 이미 처리한 버전은 다시 실행하지 않는다. 앱 시작마다 migration runner가 멱등적으로 호출된다.

### 5.2 Phase 0 DB에서 v1로 전환

현재 `src/db/database.ts`가 만드는 Phase 0 테이블은 목표 스키마와 컬럼명이 다르다. 보존 전환을 선택하는 경우의 매핑은 다음과 같다.

| Phase 0 | v1 | 변환 규칙 |
|---|---|---|
| `islands.fruit` | `islands.native_fruit` | 값 복사 |
| `islands.flower` | `islands.native_flower` | 값 복사 |
| `islands.hemisphere` | `islands.hemisphere` | `북반구`/`남반구`를 `north`/`south`로 변환 |
| `islands.timezone` | `islands.timezone` | `KST`는 `Asia/Seoul`로 변환 |
| `routines.title` | `routine_definitions.name` | 값 복사, `version=1` |
| `routines.goal_count` | `routine_definitions.target_count` | 값 복사 |
| `routine_logs.log_date` | `routine_logs.game_date` | 값 복사 |
| `routine_logs.completed` | `routine_logs.current_count`/`is_complete` | 완료면 목표 횟수, 미완료면 0으로 변환 |

Phase 0에는 주민대표 생일 정보와 루틴 유효기간이 없으므로, 보존 전환 시 주민대표 입력을 다시 받아 `player_profiles`를 완성하고 기존 루틴에는 `effective_from`을 전환 날짜로 설정한다. 매핑할 수 없는 값은 임의로 추정하지 않고 복구 화면에서 사용자에게 알린다.

이번 Phase 0 테스트에서는 사용자가 제공한 생일 값이 없으므로 `player_profiles.birthday_month`와 `birthday_day`를 `NULL`로 저장한다. Phase 1 온보딩 수용 전에는 생일 입력·유효성 검사를 추가해 목표 스키마의 `NOT NULL` 계약으로 승격한다.

개발 빌드는 기존 Phase 0 테스트 DB를 덮어쓰지 않기 위해 `acnh_diary_onboarding_v1.db`를 사용한다. 따라서 다음 개발 실행에서는 기존 `acnh_diary.db`의 섬이 온보딩을 우회시키지 않으며, 운영 빌드의 DB 이름은 `acnh_diary.db`를 유지한다.

### 5.3 첫 섬 생성 transaction

`IslandRepository.create`는 아래 작업을 하나의 transaction으로 묶는다. 어느 단계라도 실패하면 섬·프로필·루틴이 모두 생성되지 않아야 한다.

1. 입력값과 IANA time zone을 검증한다.
2. `is_active = 1`인 기존 섬을 모두 `0`으로 바꾼다.
3. `islands`에 새 UUID를 넣는다.
4. 같은 UUID로 `player_profiles`를 넣는다.
5. 기본 루틴 정책에서 정의를 생성하고 `effective_from`을 생성일로 기록한다.
6. 새 섬을 활성 섬으로 유지하고 commit한다.

기본 루틴 목록과 이름·아이콘·목표 횟수는 제품 결정 전까지 `DEFAULT_ROUTINE_DEFINITIONS` 상수로 격리한다. 화면 컴포넌트에 기본 루틴을 하드코딩하지 않는다.

개발용 첫 섬 fixture는 다음 값으로 시작한다.

```typescript
const TEST_ISLAND = {
  name: "수원삼섬",
  hemisphere: "north",
  flower: "장미",
  fruit: "사과",
  playerName: "그랑",
  timezone: "Asia/Seoul",
};
```

## 6. Repository 계약

```typescript
interface IslandRepository {
  list(): Promise<Island[]>;
  getActive(): Promise<Island | null>;
  create(input: CreateIslandInput): Promise<Island>;
  update(id: IslandId, patch: UpdateIslandInput): Promise<Island>;
  setActive(id: IslandId): Promise<void>;
  delete(id: IslandId): Promise<void>;
}

interface RoutineRepository {
  listDefinitions(islandId: IslandId, date: GameDate): Promise<RoutineDefinition[]>;
  reviseDefinition(input: ReviseRoutineDefinitionInput): Promise<RoutineDefinition>;
  retireDefinition(islandId: IslandId, logicalKey: string, effectiveTo: GameDate): Promise<void>;
  getLogs(islandId: IslandId, date: GameDate): Promise<RoutineLog[]>;
  setProgress(input: SetRoutineProgressInput): Promise<RoutineLog>;
}

interface CollectionRepository {
  getMany(islandId: IslandId, keys: ItemKey[]): Promise<CollectionRecord[]>;
  upsert(islandId: IslandId, key: ItemKey, patch: CollectionPatch): Promise<CollectionRecord>;
  bulkSet(islandId: IslandId, keys: ItemKey[], patch: CollectionPatch): Promise<BulkResult>;
}

interface VillagerRepository {
  getStates(islandId: IslandId): Promise<VillagerState[]>;
  setState(input: SetVillagerStateInput): Promise<void>;
  listResidencies(islandId: IslandId, villagerId: string): Promise<VillagerResidency[]>;
  addCampsiteVisit(input: CampsiteVisitInput): Promise<void>;
}

interface NpcVisitRepository {
  getWeek(islandId: IslandId, range: DateRange): Promise<NpcVisit[]>;
  upsert(input: NpcVisitInput): Promise<NpcVisit>;
  clearWeek(islandId: IslandId, range: DateRange): Promise<number>;
}

interface BackupRepository {
  exportAll(): Promise<BackupEnvelope>;
  validate(input: unknown): Promise<BackupValidationResult>;
  importAll(input: BackupEnvelope, mode: "replace"): Promise<ImportResult>;
}
```

실제 구현체는 `SqliteIslandRepository`, `SqliteRoutineRepository`, `SqliteCollectionRepository`, `SqliteVillagerRepository`, `SqliteBackupRepository`다. 기준 데이터는 `BundledGameDataRepository`가 제공한다.

### 6.1 첫 수직 슬라이스 Repository 동작

첫 구현에서 반드시 동작해야 하는 Repository 메서드와 규칙은 다음과 같다.

`IslandRepository.create(input)`은 5.3의 transaction을 수행하며, 호출자는 생성된 섬을 다시 조회하지 않고 반환값을 사용할 수 있다. `setActive`는 기존 활성 섬을 해제한 뒤 대상 섬만 활성화하고, 존재하지 않는 섬이면 `NO_ACTIVE_ISLAND`가 아니라 `VALIDATION_ERROR`를 반환한다. 마지막 섬을 `delete`하려는 경우 `LAST_ISLAND_DELETE_FORBIDDEN`으로 거부한다.

`RoutineRepository.listDefinitions(islandId, date)`는 정의가 유효한지 다음 조건으로 판단한다.

```sql
SELECT d.*, COALESCE(l.current_count, 0) AS current_count,
       COALESCE(l.is_complete, 0) AS is_complete
FROM routine_definitions d
LEFT JOIN routine_logs l
  ON l.island_id = d.island_id
 AND l.routine_id = d.id
 AND l.game_date = ?
WHERE d.island_id = ?
  AND d.effective_from <= ?
  AND (d.effective_to IS NULL OR ? <= d.effective_to)
ORDER BY d.sort_order ASC, d.version DESC;
```

정의 수정 시 같은 `logicalKey`에 대해 날짜가 겹치는 두 버전을 만들지 않는다. 조회 결과에 같은 `logicalKey`가 두 개 나오면 저장 오류로 처리하고 최신 버전을 임의 선택하지 않는다. 반환 시 `RoutineDefinition.name`은 `RoutineViewModel.title`로 매핑하고, 로그가 없으면 `currentCount=0`으로 만든다.

`RoutineRepository.setProgress(input)`은 다음 순서로 처리한다.

1. `routineId`가 `islandId`에 속하고 지정한 `gameDate`에 유효한 정의인지 확인한다.
2. 정의의 `targetCount`와 입력 `currentCount`를 `validateRoutineProgress`로 검증한다.
3. `isComplete`를 Domain 정책으로 계산한다.
4. `(island_id, routine_id, game_date)`를 기준으로 `routine_logs`를 UPSERT한다.
5. 저장된 단일 `RoutineLog`를 반환한다.

UPSERT 실패 시 기존 로그를 유지하고 `STORAGE_WRITE_FAILED`를 반환한다. 과거 날짜의 진행 상태 변경은 허용하지만, 정의 수정·삭제는 화면의 기준 오늘 날짜부터 적용한다. 수동 날짜로 과거를 보고 있을 때도 정의 변경의 기준일은 기기 시각으로 계산한 실제 게임 날짜를 사용한다.

`reviseDefinition`은 기존 정의를 덮어쓰지 않고 기존 버전의 `effectiveTo`를 새 버전의 전날로 설정한 뒤 `version + 1`을 삽입한다. `retireDefinition`은 로그를 삭제하지 않고 정의의 유효 종료일만 설정한다.

## 7. Use Case

### UC-MOB-001 · 앱 초기화

1. SQLite 연결을 생성한다.
2. foreign key를 활성화한다.
3. migration을 순서대로 실행한다.
4. 기준 데이터 manifest를 읽는다.
5. 활성 섬을 확인한다.
6. 섬이 없으면 온보딩, 있으면 오늘 탭으로 이동한다.

### UC-MOB-002 · 섬 생성·변경

입력값을 검증한 뒤 섬·주민대표·기본 루틴을 하나의 transaction으로 생성한다. 활성 섬 변경 시 화면 query와 selector를 islandId 기준으로 새로 계산한다.

### UC-MOB-003 · 오늘 조회

`getGameDateContext(deviceNow, manualDate, timezone)`을 호출한다. 날짜 컨텍스트를 기준으로 계절·이벤트·출현 생물·루틴·NPC·캘린더 ViewModel을 조립한다.

### UC-MOB-004 · 루틴 진행

현재 날짜의 routine definition을 조회하고 목표 횟수·현재 횟수를 검증한다. `routine_logs`를 islandId·routineId·gameDate로 UPSERT한다.

### UC-MOB-005 · 루틴 정의 수정·삭제

오늘을 새 정의의 `effectiveFrom`으로 사용한다. 과거 정의와 로그는 변경하지 않는다. 삭제는 `effectiveTo`를 전날로 설정한다.

### UC-MOB-006 · 주민 조회·상태 변경

기준 주민 데이터와 islandId별 상태·거주 이력·캠핑장 방문을 결합한다. `photo_received`는 액자 사진 collection record에서 계산한다.

### UC-MOB-007 · 도감 목록 조회

1. category 기준 데이터를 읽는다.
2. islandId의 collection records를 결합한다.
3. 검색어를 이름·번호에 적용한다.
4. 필터 칩을 AND 조합으로 적용한다.
5. category별 정렬을 적용한다.
6. 생물 5개, 화석·미술품 2개 표시 단위로 ViewModel을 구성한다.
7. 전체 수·조회 수·월별 flag를 반환한다.

### UC-MOB-008 · 도감 상태 단건·일괄 변경

카테고리별 허용 필드를 확인한 뒤 최종 상태를 SQLite에 UPSERT한다. 일괄 변경은 화면의 현재 필터 결과 key만 대상으로 하고, 하나의 transaction으로 처리한다.

### UC-MOB-009 · 월별 추천

섬의 반구와 기준 월로 생물을 필터링한다. 출현 월·전월 출현 여부와 collection record를 결합해 `incompleteThisMonth`, `newThisMonth`를 계산한다.

### UC-MOB-010 · 백업 내보내기

모든 섬·프로필·루틴·로그·수집·주민·방문 기록을 읽고 manifest와 함께 JSON envelope로 직렬화한다. 파일 저장은 운영체제 파일 공유 API에 위임한다.

### UC-MOB-011 · 백업 복원

JSON 파싱·schemaVersion·참조 무결성을 확인한 후 사용자 확인을 받는다. 임시 transaction에 입력하고 검증 통과 시 commit한다. 오류는 rollback한다.

### 7.1 첫 수직 슬라이스 실행 흐름

앱 시작 흐름:

```text
src/app/index.tsx
  -> initializeApp()
    -> openDatabase()
    -> migrateToLatest()
    -> islandRepository.getActive()
  -> active island 없음: /onboarding
  -> active island 있음: /(tabs)/today
```

오늘 조회 흐름:

```text
TodayScreen
  -> useTodayViewModel()
    -> active island 조회
    -> app_settings.manual_date 조회
    -> getGameDateContext()
    -> routineRepository.listDefinitions(islandId, gameDate)
    -> TodayViewModel 반환
```

루틴 변경 흐름:

```text
RoutineCard action
  -> useRoutineActions().setProgress()
    -> validateRoutineProgress()
    -> routineRepository.setProgress()
    -> routines:{islandId, gameDate} 무효화
    -> TodayViewModel 재조회
```

이 흐름에서 `src/app` route는 navigation만 담당하고, `TodayScreen`은 SQL·원본 JSON·날짜 계산을 직접 호출하지 않는다. 저장 성공 전에는 카드의 확정 상태를 바꾸지 않으며, 저장 실패 시 이전 상태를 복원하고 오류 메시지를 표시한다.

## 8. ViewModel과 상태 관리

### 8.1 Today ViewModel

```typescript
type TodayStatus = "loading" | "ready" | "empty" | "error";

interface TodayViewModel {
  status: TodayStatus;
  island: Pick<Island, "id" | "name" | "hemisphere" | "timezone"> | null;
  gameDate: GameDate | null;
  dateSource: "device" | "manual" | null;
  routines: RoutineViewModel[];
  errorCode: string | null;
}
```

상태별 화면 계약:

| 상태 | 화면 | 허용 동작 |
|---|---|---|
| `loading` | 스켈레톤 또는 스플래시 | 사용자 입력 비활성화 |
| `ready` | 섬 요약·게임 날짜·루틴 목록 | 날짜 변경, 루틴 진행 변경 |
| `empty` | 활성 섬 생성 안내 | 온보딩 이동 |
| `error` | 오류 코드에 맞는 재시도 안내 | 재시도, 온보딩 또는 설정 이동 |

`useTodayViewModel`은 `activeIsland`와 `today:{islandId, gameDate}`를 구독한다. 수동 날짜를 변경하면 `app_settings.manual_date` 저장 성공 후 새 `gameDate`를 계산하고, 해제하면 해당 설정을 `NULL`로 저장한다. 루틴 한 건을 저장하는 동안 해당 카드만 `saving` 상태로 표시하며, 중복 탭은 마지막 저장이 끝날 때까지 무시한다.

### 8.2 첫 구현 Hook 계약

```typescript
interface TodayActions {
  setManualDate(date: GameDate): Promise<void>;
  clearManualDate(): Promise<void>;
  setRoutineProgress(routineId: string, currentCount: number): Promise<void>;
  retry(): Promise<void>;
}

function useTodayViewModel(): {
  state: TodayViewModel;
  actions: TodayActions;
};
```

첫 수직 슬라이스에서는 전역 상태 라이브러리를 추가하지 않고 feature hook과 Repository 조합으로 구현한다. 화면 간 공유가 필요한 활성 섬과 날짜는 Repository에서 다시 읽으며, route params로 islandId를 신뢰하지 않는다. 복잡한 캐시 라이브러리 도입은 도감·주민 목록이 추가될 때 다시 검토한다.

```typescript
interface EncyclopediaListState {
  category: "bugs" | "fish" | "sea" | "fossils" | "artworks";
  search: string;
  filters: CollectionFilter[];
  sortBy: "number" | "name" | "fossil_group";
  direction: "asc" | "desc";
  page: number;
}

interface EncyclopediaCardViewModel {
  itemId: string;
  imageUri: string | null;
  displayImageMode: "color" | "grayscale";
  caught: boolean;
  owned: boolean;
  donated: boolean;
  isIncompleteThisMonth: boolean;
  isNewThisMonth: boolean;
}
```

화면 상태는 feature hook이 관리한다. 최소 캐시 키는 다음과 같다.

```text
activeIsland
today:{islandId, gameDate}
routines:{islandId, gameDate}
npcVisits:{islandId, weekStart}
villagers:{dataVersion, islandId}
collections:{islandId, itemType}
encyclopedia:{islandId, category, filters, sort, page, dataVersion}
monthlyCritters:{islandId, hemisphere, month, dataVersion}
```

SQLite mutation 성공 후 관련 ViewModel을 무효화한다. 섬 변경 시 islandId가 포함된 모든 키를 폐기한다.

## 9. 화면별 상세

### 9.1 OnboardingScreen

```text
OnboardingScreen
  IslandForm
    IslandNameInput
    NativeFruitInput
    NativeFlowerInput
    HemisphereSelect
    TimezoneSelect
  PlayerProfileForm
    PlayerNameInput
    BirthdayPicker
  SubmitButton
```

제출 시 `CreateIslandInput`을 만들고 섬·주민대표·기본 루틴을 하나의 transaction으로 생성한다. 섬 이름과 주민대표 이름은 1~10자, 생일 월·일은 유효한 달력 날짜, 시간대는 IANA time zone 문자열로 검증한다. 화면 라벨은 한국어를 사용하되 저장 값은 `north`/`south`와 IANA 문자열을 사용한다.

### 9.2 TodayScreen

```text
TodayScreen
  TodayHeader
    IslandMenuButton
    IslandSummary
  GameDatePicker
  SeasonEventSection
  AvailableCritterSection
  RoutineSection
    RoutineCard
    RoutineEditorScreen
  WeeklyNpcSection
    NpcDayRow
    NpcPickerModal
    ClearWeekConfirmDialog
  CalendarSection
```

첫 수직 슬라이스의 실제 렌더링 범위는 `TodayHeader`, `GameDatePicker`, `RoutineSection`이다. `SeasonEventSection`, `AvailableCritterSection`, `WeeklyNpcSection`, `CalendarSection`은 기준 데이터·Repository가 준비되기 전까지 숨기거나 `준비 중` 빈 상태로 표시하며, 임의의 샘플 데이터를 사용하지 않는다.

```typescript
interface RoutineCardProps {
  routine: RoutineViewModel;
  disabled: boolean;
  onChangeCount: (currentCount: number) => void;
}

interface GameDatePickerProps {
  gameDate: GameDate;
  source: "device" | "manual";
  disabled: boolean;
  onSelectDate: (date: GameDate) => void;
  onClearManualDate: () => void;
}
```

이벤트 처리 규칙:

- 화면 최초 진입 시 loading을 표시하고, `TodayViewModel.status`가 `ready`가 되면 실제 카드 목록으로 교체한다.
- 체크형 루틴은 체크 시 `0 ↔ 1`로 변경한다. 횟수형 루틴은 증가·감소 버튼으로 `0..targetCount` 범위 안에서 변경한다.
- 루틴 저장 중에는 해당 루틴의 버튼만 비활성화하고 다른 루틴은 사용할 수 있다.
- 과거 날짜를 보고 있으면 루틴 진행 상태만 변경할 수 있고, 루틴 추가·수정·삭제 UI는 표시하지 않는다.
- 날짜 선택기에서 수동 날짜를 저장하면 `source=manual` 배지를 표시한다. 해제하면 기기 시각과 오전 5시 경계로 즉시 복귀한다.
- `NO_ACTIVE_ISLAND`이면 오늘 화면에 머물지 않고 `/onboarding`으로 이동한다. 기타 오류는 재시도 버튼과 사용자용 메시지를 표시한다.
- 모든 체크·증감 버튼에는 현재 루틴 이름, 현재 횟수, 목표 횟수를 포함한 접근성 레이블을 제공한다.

### 9.3 VillagersScreen

```text
VillagersScreen
  VillagerCategoryTabs
  VillagerSearchBar
  VillagerFilterSheet
  VillagerSortControl
  VillagerCardList
    VillagerCard
      VillagerStateToggleGroup
  VillagerDetailScreen
```

액자 사진 보유 토글은 `CollectionRepository(itemType = "photo")`를 호출하고, 성공 후 주민 selector를 갱신한다.

### 9.4 EncyclopediaScreen

```text
EncyclopediaHomeScreen
  EncyclopediaCategoryCard[bugs, fish, sea, fossils, artworks]

EncyclopediaListScreen
  SearchBar
  CollectionFilterChipGroup
  SortControl
  BulkStateControl
  ResultCount
  EncyclopediaCardGrid
    CritterCard x 5 per page unit
    FossilOrArtworkCard x 2 per page unit

EncyclopediaDetailScreen
  HeroImage
  BasicInfo
  AvailabilitySection
  PriceSection
  CollectionStateSection
  TankOrArtworkSection
```

### 9.5 설정·백업

```text
SettingsScreen
  DataLicenseLink
  ExportBackupLink
  ImportBackupLink
  ManualDateSetting

DataLicenseScreen
  DataSources
  DataVersion
  LastUpdatedAt
  OpenSourceNotices
```

## 10. JSON 백업 계약

```typescript
interface BackupEnvelope {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  dataVersion: string;
  islands: Island[];
  profiles: PlayerProfile[];
  routines: RoutineDefinition[];
  routineLogs: RoutineLog[];
  collectionRecords: CollectionRecord[];
  villagerStates: VillagerState[];
  residencies: VillagerResidency[];
  campsiteVisits: CampsiteVisit[];
  npcVisits: NpcVisit[];
  appSettings: Record<string, string | null>;
}
```

Import validation:

- `schemaVersion`이 정수이고 지원 범위인지 확인
- 모든 islandId가 islands에 존재하는지 확인
- collection key 중복 제거 또는 오류 처리
- routineLog가 유효한 islandId·routineId를 참조하는지 확인
- 날짜가 ISO `YYYY-MM-DD` 형식인지 확인
- 문자열 최대 길이·배열 최대 개수·파일 최대 크기 확인
- 검증 실패 시 DB 쓰기 금지

## 11. 오류 코드

| 코드 | 처리 |
|---|---|
| `DB_MIGRATION_FAILED` | 앱 초기화 중 중단, 재시도 안내 |
| `NO_ACTIVE_ISLAND` | 온보딩 또는 섬 선택으로 이동 |
| `LAST_ISLAND_DELETE_FORBIDDEN` | 삭제 차단 |
| `VALIDATION_ERROR` | 입력 필드 오류 표시 |
| `COLLECTION_INVALID_FIELD` | 상태 변경 취소 |
| `BULK_LIMIT_EXCEEDED` | 대상 범위 축소 안내 |
| `BACKUP_PARSE_FAILED` | 파일 형식 오류 표시 |
| `BACKUP_VERSION_UNSUPPORTED` | 앱 업데이트 안내 |
| `BACKUP_INTEGRITY_FAILED` | 기존 DB 유지, 복원 취소 |
| `BACKUP_RESTORE_FAILED` | transaction rollback, 재시도 제공 |
| `STORAGE_WRITE_FAILED` | UI 이전 상태 복원 |
| `GAME_DATA_NOT_FOUND` | 기준 데이터 버전 확인 안내 |

## 12. 테스트 명세

Phase 1 테스트 러너는 `jest`와 `jest-expo`를 사용한다. `npm test`는 전체 테스트를 실행하고, Domain·SQLite·Backup·Screen 테스트를 각각 별도 경로와 fixture로 분리한다. Phase 0에는 테스트 러너가 없으므로 iOS 빌드 성공을 기능 완성으로 간주하지 않는다.

테스트 파일과 fixture의 기본 위치는 다음과 같다.

```text
src/domain/__tests__/game-date.test.ts
src/domain/__tests__/routine-policy.test.ts
src/storage/__tests__/migration-v1.test.ts
src/storage/__tests__/routine-repository.test.ts
src/features/today/__tests__/today-view-model.test.ts
src/features/onboarding/__tests__/onboarding-flow.test.ts
test/fixtures/islands.ts
test/fixtures/routines.ts
```

테스트는 현재 시각·UUID·기준 데이터 파일을 고정한다. SQLite 테스트는 테스트마다 임시 DB를 새로 만들고, 운영 DB 파일을 사용하지 않는다. 화면 테스트는 실제 native module 대신 Repository mock을 주입해 loading·ready·error와 mutation 성공·실패를 재현한다.

### 12.1 단위 테스트

- 게임 날짜 오전 5시 경계
- 수동 날짜 우선·해제
- 북반구·남반구 월과 1월 전월 순환
- 출현 시간·월·조건
- 월별 미완료 OR 조건
- 이번 달 신규 출현 조건
- 도감 복수 필터 칩 AND 조합
- 번호·이름·화석 그룹 정렬과 방향
- 주민 복수 상태 selector
- 액자 사진 owned → 주민 액자 상태
- 루틴 유효기간과 과거 로그 보존

첫 수직 슬라이스의 필수 Given/When/Then:

- `04:59` 현지 시각이면 전날을 반환하고, `05:00`이면 당일을 반환한다.
- `manualDate`가 있으면 `deviceNow`가 어느 날짜여도 manualDate를 반환한다.
- 체크형 루틴에서 `1`을 저장하면 완료·원색이고, `0`을 저장하면 미완료·회색이다.
- 횟수형 루틴에서 목표보다 큰 횟수와 음수 횟수는 저장하지 않는다.
- 로그가 없는 날짜를 조회하면 정의는 표시되고 진행 횟수는 0이다.
- 과거 날짜의 로그를 수정해도 정의의 이름·목표·표시 순서는 바뀌지 않는다.
- 앱을 다시 초기화해도 동일한 islandId·routineId·gameDate의 로그가 조회된다.
- 첫 섬 생성 중 기본 루틴 삽입이 실패하면 섬과 프로필도 남지 않는다.

### 12.2 SQLite 통합 테스트

- migration 신규 설치·재실행
- 섬별 collection·routine·villager 격리
- collection UPSERT 멱등
- bulkSet transaction 전체 성공·전체 rollback
- 마지막 섬 삭제 차단
- routine definition revision·retire
- 외래키 cascade

### 12.3 백업 테스트

- export → import round-trip
- 여러 섬과 복수 상태 보존
- 빈 데이터·대량 데이터
- 잘못된 JSON
- 누락된 islandId
- 지원하지 않는 schemaVersion
- 중복 key
- 복원 중 오류 rollback

### 12.4 화면·기기 테스트

- 최초 온보딩과 재실행
- 하단 5개 탭과 준비 중 화면
- 섬 전환 후 데이터 교체
- 도감 카드 직접 토글과 전체 체크·해제
- 상세 화면에서 뒤로 이동 후 목록 상태
- 파일 내보내기·가져오기 확인 dialog
- 네트워크 차단 상태에서 핵심 기능
- iOS 실제 기기·시뮬레이터 및 저사양 스크롤

### 12.5 첫 수직 슬라이스 실행 명령

```text
npm test -- --runInBand
npx tsc --noEmit
npx expo config --json
npx expo run:ios
```

Phase 1부터 `package.json`에 `test`와 `typecheck` script를 추가한다. 테스트가 실패한 상태에서 `--no-verify`나 테스트 삭제로 완료 처리하지 않는다.

## 12.6 요구사항 추적

| SRS 요구사항 | 구현 계약 | 검증 |
|---|---|---|
| `MOB-ISL-001`~`003` | `CreateIslandInput`, Onboarding validation | `onboarding-flow.test.ts` |
| `MOB-ISL-008` | Migration v1, `IslandRepository.create`, 5.3 transaction | `migration-v1.test.ts` |
| `MOB-TOD-001`~`004` | `getGameDateContext`, `app_settings.manual_date` | `game-date.test.ts` |
| `MOB-TOD-008`~`011` | `RoutineDefinition`, `RoutineViewModel`, `setProgress` | `routine-policy.test.ts`, `routine-repository.test.ts` |
| `MOB-TOD-012`~`013` | definition versioning, date-scoped logs | `routine-repository.test.ts` |
| `NFR-MOB-003` | SQLite persistence, migration idempotence | migration·screen restart test |
| `NFR-MOB-004` | routine accessibility labels and non-color state | Today screen test |

## 13. 구현 완료 정의

구현은 먼저 Phase 0 실행 기준선을 통과해야 한다.

- `acnh-diary-mobile/`에서 `npm ci --legacy-peer-deps` 수행
- `npx expo config --json`과 `npx tsc --noEmit` 통과
- `npx expo start --offline`으로 번들러 시작
- iOS 개발 빌드 실행 확인
- Android 네이티브 빌드는 후속 플랫폼 단계로 보류
- 웹 빌드는 최초 출시 수용 기준에서 제외

- 모바일 SRS의 Must 요구사항이 코드·단위 테스트·화면 테스트에 연결된다.
- 앱 재실행 후 모든 사용자 기록이 유지된다.
- MVP 화면이 네트워크 없이 조회·수정된다.
- 도감 월별 추천과 복수 필터가 기준 데이터와 일치한다.
- 섬 간 기록이 누출되지 않는다.
- 백업 round-trip과 실패 rollback이 통과한다.
- 액자 사진과 주민 상태의 연동이 검증된다.
- 데이터 출처·버전·라이선스 화면이 제공된다.
- 지원 최소 OS와 앱 스토어 개인정보·파일 접근 정책을 출시 전에 확정한다.

### 13.1 구현 순서

결정이 필요한 제품 항목이 확정된 뒤 아래 순서로 구현한다.

1. `src/domain/types.ts`, `game-date.ts`, `routine-policy.ts`와 순수 함수 테스트를 작성한다.
2. `src/storage/migrations/001_core.ts`와 SQLite connection wrapper를 작성하고 Migration v1 테스트를 통과시킨다.
3. `SqliteIslandRepository`와 `SqliteRoutineRepository`를 작성하고 섬 격리·transaction·UPSERT 테스트를 통과시킨다.
4. `initializeApp`와 Onboarding Use Case를 연결해 첫 섬 생성·재실행 복원을 확인한다.
5. `useTodayViewModel`과 `TodayScreen`을 연결해 날짜 변경·루틴 저장·오류 복원을 확인한다.
6. iOS Simulator와 실제 iPhone에서 offline 상태로 수직 슬라이스의 완료 정의를 검증한다.
7. 수직 슬라이스가 통과한 후 기준 데이터 adapter와 주민·도감 기능을 추가한다.

## 14. 미정 항목

다음 세 항목은 구현 방향에 영향을 주므로 사용자 결정이 필요하다.

1. **첫 구현 범위**
   - 권장: 섬 초기화·게임 날짜·루틴·오늘 화면만 먼저 완성하고 생물·주민·도감은 다음 단계로 둔다.
   - 대안: 오늘 화면에 기준 데이터 adapter와 현재 출현 생물까지 함께 포함한다. 데이터 정합성 검증과 화면 구현이 동시에 늘어난다.

2. **현재 Phase 0 DB 처리**
   - 권장: 아직 테스트 데이터만 있다면 DB를 초기화하고 v1 스키마로 시작한다.
   - 대안: 기존 DB를 보존하고 5.2의 컬럼·값 변환과 주민대표 재입력 절차를 구현한다. 기존 기록은 보존되지만 초기 작업과 테스트가 늘어난다.

3. **기본 루틴 목록**
   - 권장: 첫 구현에서는 사용자가 확인할 수 있는 최소 2개 체크형 루틴으로 시작하고, 이름·아이콘·목표 횟수는 상수로 격리한다.
   - 대안: 시작부터 실제 사용할 루틴 목록과 각 목표 횟수를 확정해 제공한다.

추가로 기준 데이터 자동 업데이트 방식, 백업 파일 암호화 여부, 오늘·주민 상세에 남은 물음표 필드의 최종 표시 여부는 해당 기능 구현 직전에 결정해도 된다. 현재 미술품 데이터 원천 목록과 이미지가 없는 문제는 사용자 선택보다 데이터 소스 확보가 선행되어야 한다.

## 15. 변경 이력

- v1.0 · 2026-08-29 · 모바일 앱 전용 코드 구조, 도메인 타입, SQLite schema, Repository, Use Case, 화면, 백업·복원, 테스트 설계 작성
- v1.1 · 2026-08-29 · Expo Router, 실제 앱 경로, 앱용 데이터셋 출처, 백업 계약과 실행 기준선 확정
- v1.2 · 2026-08-29 · 현재 구현 트리와 iOS 우선 빌드·호환성 기준을 정합화
- v1.3 · 2026-08-29 · SRS·SAD·SDS 버전 정렬, 공통 타입·데이터 어댑터·온보딩·설정 계약 구체화
- v1.4 · 2026-08-29 · 첫 수직 슬라이스, 게임 날짜·루틴 정책, Migration v1, Repository 동작, ViewModel·테스트·요구사항 추적 구체화
- v1.5 · 2026-08-29 · 온보딩 테스트 fixture와 개발 DB 분리 규칙 반영
