# 모동숲 다이어리 모바일 앱 상세 설계서

문서 상태: Draft v1.2
최종 수정일: 2026-08-29  
기준 문서: 모바일 SRS v1.1 · 모바일 SAD v1.1

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

현재 Phase 0은 위의 route·screen·SQLite 초기화 골격만 구현한다. 주민·도감 상세 route와 `domain`·`data`·`storage`·`backup` 모듈은 다음 단계에서 추가한다. 별도 monorepo `packages/`는 만들지 않는다.

### 1.2 앱 진입점 및 라우팅

`package.json`의 `main`은 `expo-router/entry`로 설정한다. `src/app/`이 유일한 route root이며, 루트 `App.tsx`와 사용자 정의 `index.ts`는 앱 라우팅 진입점으로 사용하지 않는다. Expo Router 내부에서 사용하는 React Navigation navigator를 앱에서 중복 구성하지 않는다.

현재 iOS 네이티브 빌드는 Xcode 16.1 이상을 기준으로 하며, Xcode 26 계열에서는 `patches/expo-modules-jsi+57.0.6.patch`를 자동 적용한다. Android 빌드는 후속 플랫폼 단계에서 추가한다.

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

`photo_received`는 별도 `VillagerStateType`으로 저장하지 않는다. 주민 액자 사진의 `CollectionRecord(itemType = "photo", owned = true)`를 selector에서 읽어 액자 상태를 계산한다. 사진과 포스터는 서로 다른 `itemType`으로 저장한다.

TypeScript 모델은 camelCase를 사용하고 SQLite 컬럼은 snake_case를 사용한다. Repository가 두 표현 사이를 변환하며, 화면과 Domain이 SQL 컬럼명을 직접 사용하지 않는다.

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
  number: number;
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
  value TEXT NOT NULL
);
```

`app_settings.manual_date`가 null이면 기기 시각으로 계산하고, 값이 있으면 수동 기준 날짜로 사용한다. `app_settings.active_data_version`은 번들 기준 데이터 manifest와 비교한다.

## 5. Migration

```typescript
interface Migration {
  version: number;
  up(db: SQLiteDatabase): Promise<void>;
}

async function migrate(db: SQLiteDatabase, migrations: Migration[]) {
  await db.execAsync("PRAGMA foreign_keys = ON");
  await db.withTransactionAsync(async () => {
    const current = await readSchemaVersion(db);
    for (const migration of migrations.filter(m => m.version > current)) {
      await migration.up(db);
      await writeSchemaVersion(db, migration.version);
    }
  });
}
```

Migration은 번호가 증가해야 하고, 사용자 기록을 삭제하지 않는다. 루틴 정의 기간 관리나 카탈로그 변형 추가는 신규 컬럼 또는 신규 테이블로 확장한다.

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

## 8. ViewModel과 상태 관리

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

### 9.1 TodayScreen

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

### 9.2 VillagersScreen

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

### 9.3 EncyclopediaScreen

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

### 9.4 설정·백업

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
  appSettings: Record<string, string>;
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

## 14. 미정 항목

- 기준 데이터 자동 업데이트 방식
- 백업 파일 암호화 여부
- 오늘·주민 상세에 남은 물음표 필드의 최종 표시 여부

## 15. 변경 이력

- v1.0 · 2026-08-29 · 모바일 앱 전용 코드 구조, 도메인 타입, SQLite schema, Repository, Use Case, 화면, 백업·복원, 테스트 설계 작성
- v1.1 · 2026-08-29 · Expo Router, 실제 앱 경로, 앱용 데이터셋 출처, 백업 계약과 실행 기준선 확정
- v1.2 · 2026-08-29 · 현재 구현 트리와 iOS 우선 빌드·호환성 기준을 정합화
