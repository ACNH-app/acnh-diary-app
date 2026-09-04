import * as SQLite from 'expo-sqlite';

import type {
  EncyclopediaCategory,
  EncyclopediaState,
  EncyclopediaStatus,
} from '../types/encyclopedia';
import type { CatalogCategory } from '../types/catalog';
import {
  DEFAULT_ROUTINE_OPTIONS,
  LEGACY_ROUTINE_TITLES,
  ROUTINE_TITLE_MIGRATIONS,
} from '../data/routines';
import type {
  Island,
  IslandInput,
  NpcVisit,
  PlayerProfile,
  Routine,
  RoutineProgress,
} from '../types/island';
import type { VillagerState, VillagerStatus } from '../types/villager-state';

// Keep the old Phase 0 database untouched while the onboarding flow is verified.
const DATABASE_NAME = __DEV__ ? 'acnh_diary_onboarding_v1.db' : 'acnh_diary.db';

export const db = SQLite.openDatabaseSync(DATABASE_NAME);

export const TEST_ISLAND: IslandInput = {
  name: '수원삼섬',
  fruit: '사과',
  flower: '장미',
  hemisphere: 'north',
  timezone: 'Asia/Seoul',
  playerName: '그랑',
};

type IslandRow = {
  id: string;
  name: string;
  fruit: string | null;
  flower: string | null;
  hemisphere: string | null;
  timezone: string | null;
  player_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: number;
};

type RoutineRow = {
  id: string;
  island_id: string;
  title: string;
  goal_count: number;
  repeat_type: 'daily';
  created_at: string | null;
};

type RoutineLogRow = {
  routine_id: string;
  current_count: number;
  completed: number;
};

type PlayerProfileRow = {
  island_id: string;
  name: string;
  birthday_month: number | null;
  birthday_day: number | null;
};

type NpcVisitRow = {
  island_id: string;
  visit_date: string;
  npc_name: string;
};

type VillagerStateRow = {
  villager_id: string;
  wishlist: number;
  campsite_visited: number;
  island_resident: number;
  moved_out: number;
  photo_received: number;
  poster_owned: number;
};

type CampsiteVisitRow = {
  villager_id: string;
  visit_date: string;
};

type CollectionRecordRow = {
  item_type: EncyclopediaCategory | CatalogCategory;
  item_id: string;
  caught: number;
  owned: number;
  donated: number;
  genuine_owned: number;
  fake_owned: number;
  quantity: number | null;
};

const VILLAGER_STATUS_COLUMNS: Record<VillagerStatus, keyof Omit<VillagerStateRow, 'villager_id'>> = {
  wishlist: 'wishlist',
  campsiteVisited: 'campsite_visited',
  islandResident: 'island_resident',
  movedOut: 'moved_out',
  photoReceived: 'photo_received',
  posterOwned: 'poster_owned',
};

const COLLECTION_STATUS_COLUMNS: Record<EncyclopediaStatus, keyof Omit<CollectionRecordRow, 'item_type' | 'item_id'>> = {
  caught: 'caught',
  owned: 'owned',
  donated: 'donated',
  genuineOwned: 'genuine_owned',
  fakeOwned: 'fake_owned',
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function hasColumn(table: string, column: string) {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table});`);
  return columns.some((item) => item.name === column);
}

function ensureColumn(table: string, column: string, definition: string) {
  if (!hasColumn(table, column)) {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function validateIslandInput(input: IslandInput) {
  const name = input.name.trim();
  const playerName = input.playerName.trim();

  if (name.length < 1 || name.length > 10 || playerName.length < 1 || playerName.length > 10) {
    throw new Error('VALIDATION_ERROR');
  }

  if (!input.fruit.trim() || !input.flower.trim() || !isValidTimezone(input.timezone)) {
    throw new Error('VALIDATION_ERROR');
  }

  if (input.hemisphere !== 'north' && input.hemisphere !== 'south') {
    throw new Error('VALIDATION_ERROR');
  }

  if (input.birthdayMonth != null || input.birthdayDay != null) {
    if (!isValidBirthday(input.birthdayMonth, input.birthdayDay)) {
      throw new Error('VALIDATION_ERROR');
    }
  }
}

function isValidBirthday(month: number | undefined | null, day: number | undefined | null) {
  if (month == null || day == null) return false;
  const date = new Date(Date.UTC(2024, month - 1, day));
  return (
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === 2024 &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toIsland(row: IslandRow): Island {
  return {
    id: row.id,
    name: row.name,
    fruit: row.fruit,
    flower: row.flower,
    hemisphere: row.hemisphere === 'north' || row.hemisphere === 'south' ? row.hemisphere : null,
    timezone: row.timezone,
    playerName: row.player_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active === 1,
  };
}

function toRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    islandId: row.island_id,
    title: row.title,
    goalCount: row.goal_count,
    repeatType: row.repeat_type,
    createdAt: row.created_at,
  };
}

function parseNpcNames(value: string): string[] {
  const trimmedValue = value.trim();
  if (!trimmedValue) return [];
  try {
    const parsed = JSON.parse(trimmedValue);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Older rows stored a single NPC name in this column.
  }
  return [trimmedValue];
}

function serializeNpcNames(names: string[]) {
  return JSON.stringify([...new Set(names.map((name) => name.trim()).filter(Boolean))]);
}

export function initializeDatabase() {
  db.execSync('PRAGMA foreign_keys = ON;');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS islands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fruit TEXT,
      flower TEXT,
      hemisphere TEXT,
      timezone TEXT,
      is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_profiles (
      island_id TEXT PRIMARY KEY NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      birthday_month INTEGER,
      birthday_day INTEGER
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      goal_count INTEGER NOT NULL DEFAULT 1,
      repeat_type TEXT NOT NULL DEFAULT 'daily' CHECK(repeat_type = 'daily'),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routine_logs (
      id TEXT PRIMARY KEY,
      island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
      current_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(island_id, routine_id, log_date)
    );

    CREATE TABLE IF NOT EXISTS villager_states (
      island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      villager_id TEXT NOT NULL,
      wishlist INTEGER NOT NULL DEFAULT 0 CHECK(wishlist IN (0, 1)),
      campsite_visited INTEGER NOT NULL DEFAULT 0 CHECK(campsite_visited IN (0, 1)),
      island_resident INTEGER NOT NULL DEFAULT 0 CHECK(island_resident IN (0, 1)),
      moved_out INTEGER NOT NULL DEFAULT 0 CHECK(moved_out IN (0, 1)),
      photo_received INTEGER NOT NULL DEFAULT 0 CHECK(photo_received IN (0, 1)),
      poster_owned INTEGER NOT NULL DEFAULT 0 CHECK(poster_owned IN (0, 1)),
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(island_id, villager_id)
    );

    CREATE TABLE IF NOT EXISTS campsite_visits (
      id TEXT PRIMARY KEY,
      island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      villager_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(island_id, villager_id, visit_date)
    );

    CREATE TABLE IF NOT EXISTS collection_records (
      island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      caught INTEGER NOT NULL DEFAULT 0 CHECK(caught IN (0, 1)),
      owned INTEGER NOT NULL DEFAULT 0 CHECK(owned IN (0, 1)),
      donated INTEGER NOT NULL DEFAULT 0 CHECK(donated IN (0, 1)),
      genuine_owned INTEGER NOT NULL DEFAULT 0 CHECK(genuine_owned IN (0, 1)),
      fake_owned INTEGER NOT NULL DEFAULT 0 CHECK(fake_owned IN (0, 1)),
      quantity INTEGER CHECK(quantity IS NULL OR (quantity >= 0 AND quantity <= 999)),
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(island_id, item_type, item_id)
    );

    CREATE INDEX IF NOT EXISTS collection_records_island_type
    ON collection_records(island_id, item_type);

    CREATE TABLE IF NOT EXISTS npc_visits (
      island_id TEXT NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
      visit_date TEXT NOT NULL,
      npc_name TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(island_id, visit_date)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  for (const [oldTitle, newTitle] of Object.entries(ROUTINE_TITLE_MIGRATIONS)) {
    db.runSync('UPDATE routines SET title = ? WHERE title = ?;', [newTitle, oldTitle]);
  }

  // Remove retired routines left by older development builds without touching other records.
  const legacyRoutineTitles = [...LEGACY_ROUTINE_TITLES];
  db.runSync(
    `DELETE FROM routines WHERE title IN (${legacyRoutineTitles.map(() => '?').join(', ')});`,
    legacyRoutineTitles,
  );

  // Existing Phase 0 databases need these columns before the active-island index is created.
  ensureColumn('islands', 'is_active', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('islands', 'updated_at', 'TEXT');
  ensureColumn('villager_states', 'poster_owned', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('routine_logs', 'current_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('collection_records', 'quantity', 'INTEGER');

  const islands = db.getAllSync<{ id: string; is_active: number }>(
    'SELECT id, is_active FROM islands ORDER BY created_at ASC, id ASC;'
  );

  if (islands.length > 0 && !islands.some((island) => island.is_active === 1)) {
    db.runSync('UPDATE islands SET is_active = 0;');
    db.runSync('UPDATE islands SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;', [
      islands[0].id,
    ]);
  }

  db.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS one_active_island
    ON islands(is_active) WHERE is_active = 1;
  `);
}

export function getIslandCount() {
  const result = db.getAllSync<{ count: number }>('SELECT COUNT(*) AS count FROM islands;');
  return result[0]?.count ?? 0;
}

export function getActiveIsland(): Island | null {
  const result = db.getAllSync<IslandRow>(`
    SELECT i.id, i.name, i.fruit, i.flower, i.hemisphere, i.timezone,
           p.name AS player_name, i.created_at, i.updated_at, i.is_active
    FROM islands i
    LEFT JOIN player_profiles p ON p.island_id = i.id
    WHERE i.is_active = 1
    LIMIT 1;
  `);

  return result[0] ? toIsland(result[0]) : null;
}

export function getIslands(): Island[] {
  const result = db.getAllSync<IslandRow>(`
    SELECT i.id, i.name, i.fruit, i.flower, i.hemisphere, i.timezone,
           p.name AS player_name, i.created_at, i.updated_at, i.is_active
    FROM islands i
    LEFT JOIN player_profiles p ON p.island_id = i.id
    ORDER BY i.is_active DESC, i.created_at ASC, i.id ASC;
  `);
  return result.map(toIsland);
}

export function setActiveIsland(islandId: string) {
  db.withTransactionSync(() => {
    db.runSync('UPDATE islands SET is_active = 0, updated_at = CURRENT_TIMESTAMP;');
    const result = db.runSync(
      'UPDATE islands SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?;',
      [islandId],
    );
    if (result.changes === 0) throw new Error('ISLAND_NOT_FOUND');
  });
}

export function getPlayerProfileForIsland(islandId: string): PlayerProfile | null {
  const row = db.getAllSync<PlayerProfileRow>(
    `SELECT island_id, name, birthday_month, birthday_day
     FROM player_profiles WHERE island_id = ? LIMIT 1;`,
    [islandId],
  )[0];
  return row
    ? {
        islandId: row.island_id,
        name: row.name,
        birthdayMonth: row.birthday_month,
        birthdayDay: row.birthday_day,
      }
    : null;
}

export function updateIsland(islandId: string, input: IslandInput) {
  validateIslandInput(input);
  db.withTransactionSync(() => {
    const result = db.runSync(
      `UPDATE islands
       SET name = ?, fruit = ?, flower = ?, hemisphere = ?, timezone = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?;`,
      [
        input.name.trim(),
        input.fruit.trim(),
        input.flower.trim(),
        input.hemisphere,
        input.timezone.trim(),
        islandId,
      ],
    );
    if (result.changes === 0) throw new Error('ISLAND_NOT_FOUND');
    db.runSync(
      `INSERT INTO player_profiles (island_id, name, birthday_month, birthday_day)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(island_id) DO UPDATE SET
         name = excluded.name,
         birthday_month = excluded.birthday_month,
         birthday_day = excluded.birthday_day;`,
      [islandId, input.playerName.trim(), input.birthdayMonth ?? null, input.birthdayDay ?? null],
    );
  });
}

export function deleteIsland(islandId: string) {
  if (getIslandCount() <= 1) throw new Error('LAST_ISLAND');
  db.withTransactionSync(() => {
    const island = db.getAllSync<{ is_active: number }>('SELECT is_active FROM islands WHERE id = ?;', [islandId])[0];
    if (!island) throw new Error('ISLAND_NOT_FOUND');
    db.runSync('DELETE FROM islands WHERE id = ?;', [islandId]);
    if (island.is_active === 1) {
      db.runSync(
        `UPDATE islands SET is_active = 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM islands ORDER BY created_at ASC, id ASC LIMIT 1);`,
      );
    }
  });
}

export function getFirstIslandName() {
  const activeIsland = getActiveIsland();
  if (activeIsland) return activeIsland.name;

  const result = db.getAllSync<{ name: string }>(
    'SELECT name FROM islands ORDER BY created_at ASC, id ASC LIMIT 1;'
  );
  return result[0]?.name ?? '내 섬';
}

export function getRoutinesForIsland(islandId: string) {
  const result = db.getAllSync<RoutineRow>(
    `SELECT id, island_id, title, goal_count, repeat_type, created_at
     FROM routines
     WHERE island_id = ?
     ORDER BY created_at ASC, id ASC;`,
    [islandId]
  );
  return result.map(toRoutine);
}

export function getRoutineProgressForIsland(islandId: string, date: string): Record<string, RoutineProgress> {
  const rows = db.getAllSync<RoutineLogRow>(
    `SELECT routine_id, current_count, completed
     FROM routine_logs WHERE island_id = ? AND log_date = ?;`,
    [islandId, date],
  );
  return Object.fromEntries(
    rows.map((row) => [
      row.routine_id,
      { currentCount: row.current_count, isComplete: row.completed === 1 },
    ]),
  );
}

export function setRoutineProgress(
  islandId: string,
  routineId: string,
  date: string,
  currentCount: number,
  targetCount: number,
) {
  if (!Number.isInteger(currentCount) || currentCount < 0 || currentCount > targetCount) {
    throw new Error('VALIDATION_ERROR');
  }
  db.runSync(
    `INSERT INTO routine_logs (id, island_id, routine_id, log_date, completed, current_count)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(island_id, routine_id, log_date) DO UPDATE SET
       completed = excluded.completed,
       current_count = excluded.current_count;`,
    [createId('routine-log'), islandId, routineId, date, currentCount >= targetCount ? 1 : 0, currentCount],
  );
}

export function addRoutine(islandId: string, title: string, goalCount = 1) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > 40 || !Number.isInteger(goalCount) || goalCount < 1 || goalCount > 99) {
    throw new Error('VALIDATION_ERROR');
  }
  db.runSync(
    `INSERT INTO routines (id, island_id, title, goal_count, repeat_type)
     VALUES (?, ?, ?, ?, 'daily');`,
    [createId('routine'), islandId, trimmedTitle, goalCount],
  );
}

export function updateRoutine(routineId: string, title: string, goalCount: number) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle || trimmedTitle.length > 40 || !Number.isInteger(goalCount) || goalCount < 1 || goalCount > 99) {
    throw new Error('VALIDATION_ERROR');
  }
  db.runSync('UPDATE routines SET title = ?, goal_count = ? WHERE id = ?;', [trimmedTitle, goalCount, routineId]);
}

export function deleteRoutine(routineId: string) {
  db.runSync('DELETE FROM routines WHERE id = ?;', [routineId]);
}

export function getNpcVisitsForIsland(islandId: string, startDate: string, endDate: string): Record<string, string[]> {
  const rows = db.getAllSync<NpcVisitRow>(
    `SELECT island_id, visit_date, npc_name FROM npc_visits
     WHERE island_id = ? AND visit_date BETWEEN ? AND ? ORDER BY visit_date ASC;`,
    [islandId, startDate, endDate],
  );
  return Object.fromEntries(rows.map((row) => [row.visit_date, parseNpcNames(row.npc_name)]));
}

export function setNpcVisit(visit: NpcVisit) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visit.visitDate)) {
    throw new Error('VALIDATION_ERROR');
  }
  const npcNames = serializeNpcNames(visit.npcNames);
  db.runSync(
    `INSERT INTO npc_visits (island_id, visit_date, npc_name)
     VALUES (?, ?, ?)
     ON CONFLICT(island_id, visit_date) DO UPDATE SET
       npc_name = excluded.npc_name, updated_at = CURRENT_TIMESTAMP;`,
    [visit.islandId, visit.visitDate, npcNames],
  );
}

export function clearNpcVisitsForWeek(islandId: string, startDate: string, endDate: string) {
  db.runSync(
    'DELETE FROM npc_visits WHERE island_id = ? AND visit_date BETWEEN ? AND ?;',
    [islandId, startDate, endDate],
  );
}

export function getManualGameDate() {
  return db.getAllSync<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = 'manual_game_date' LIMIT 1;`,
  )[0]?.value ?? null;
}

export function setManualGameDate(value: string | null) {
  if (value != null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('VALIDATION_ERROR');
  if (value == null) {
    db.runSync(`DELETE FROM app_settings WHERE key = 'manual_game_date';`);
    return;
  }
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES ('manual_game_date', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [value],
  );
}

export function getManualGameTime() {
  return db.getAllSync<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = 'manual_game_time' LIMIT 1;`,
  )[0]?.value ?? null;
}

export function setManualGameTime(value: string | null) {
  if (value != null && !/^\d{2}:\d{2}$/.test(value)) throw new Error('VALIDATION_ERROR');
  if (value == null) {
    db.runSync(`DELETE FROM app_settings WHERE key = 'manual_game_time';`);
    return;
  }
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES ('manual_game_time', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [value],
  );
}

export function getVillagerStatesForIsland(islandId: string): Record<string, VillagerState> {
  const result = db.getAllSync<VillagerStateRow>(
    `SELECT villager_id, wishlist, campsite_visited, island_resident, moved_out, photo_received,
            poster_owned
     FROM villager_states
     WHERE island_id = ?;`,
    [islandId],
  );

  return Object.fromEntries(
    result.map((row) => [
      row.villager_id,
      {
        wishlist: row.wishlist === 1,
        campsiteVisited: row.campsite_visited === 1,
        islandResident: row.island_resident === 1,
        movedOut: row.moved_out === 1,
        photoReceived: row.photo_received === 1,
        posterOwned: row.poster_owned === 1,
      },
    ]),
  );
}

export function setVillagerStatus(
  islandId: string,
  villagerId: string,
  status: VillagerStatus,
  value: boolean,
) {
  const column = VILLAGER_STATUS_COLUMNS[status];

  db.runSync(
    `INSERT INTO villager_states (island_id, villager_id, ${column})
     VALUES (?, ?, ?)
     ON CONFLICT(island_id, villager_id) DO UPDATE SET
       ${column} = excluded.${column},
       updated_at = CURRENT_TIMESTAMP;`,
    [islandId, villagerId, value ? 1 : 0],
  );
}

export function getCollectionStatesForIsland(islandId: string): Record<string, EncyclopediaState> {
  const rows = db.getAllSync<CollectionRecordRow>(
    `SELECT item_type, item_id, caught, owned, donated, genuine_owned, fake_owned
     FROM collection_records
     WHERE island_id = ?;`,
    [islandId],
  );

  return Object.fromEntries(
    rows.map((row) => [
      `${row.item_type}/${row.item_id}`,
      {
        caught: row.caught === 1,
        owned: row.owned === 1,
        donated: row.donated === 1,
        genuineOwned: row.genuine_owned === 1,
        fakeOwned: row.fake_owned === 1,
      },
    ]),
  );
}

export function getCollectionQuantitiesForIsland(islandId: string): Record<string, number> {
  const rows = db.getAllSync<Pick<CollectionRecordRow, 'item_type' | 'item_id' | 'quantity'>>(
    `SELECT item_type, item_id, quantity
     FROM collection_records
     WHERE island_id = ? AND quantity IS NOT NULL;`,
    [islandId],
  );

  return Object.fromEntries(
    rows.map((row) => [`${row.item_type}/${row.item_id}`, row.quantity ?? 0]),
  );
}

export function setCollectionStatus(
  islandId: string,
  itemType: EncyclopediaCategory | CatalogCategory,
  itemId: string,
  status: EncyclopediaStatus,
  value: boolean,
) {
  const column = COLLECTION_STATUS_COLUMNS[status];
  db.runSync(
    `INSERT INTO collection_records (island_id, item_type, item_id, ${column})
     VALUES (?, ?, ?, ?)
     ON CONFLICT(island_id, item_type, item_id) DO UPDATE SET
       ${column} = excluded.${column},
       updated_at = CURRENT_TIMESTAMP;`,
    [islandId, itemType, itemId, value ? 1 : 0],
  );
}

export function setCatalogOwnedStatus(
  islandId: string,
  itemType: CatalogCategory,
  itemId: string,
  value: boolean,
  linkedVillager?: { id: string; status: VillagerStatus },
) {
  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO collection_records (island_id, item_type, item_id, owned)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(island_id, item_type, item_id) DO UPDATE SET
         owned = excluded.owned,
         updated_at = CURRENT_TIMESTAMP;`,
      [islandId, itemType, itemId, value ? 1 : 0],
    );

    if (linkedVillager) {
      const column = VILLAGER_STATUS_COLUMNS[linkedVillager.status];
      db.runSync(
        `INSERT INTO villager_states (island_id, villager_id, ${column})
         VALUES (?, ?, ?)
         ON CONFLICT(island_id, villager_id) DO UPDATE SET
           ${column} = excluded.${column},
           updated_at = CURRENT_TIMESTAMP;`,
        [islandId, linkedVillager.id, value ? 1 : 0],
      );
    }
  });
}

export function setCatalogOwnedStatusForItems(
  islandId: string,
  itemType: CatalogCategory,
  items: Array<{ id: string; linkedVillager?: { id: string; status: VillagerStatus } }>,
  value: boolean,
) {
  if (items.length === 0) return;
  db.withTransactionSync(() => {
    for (const item of items) {
      db.runSync(
        `INSERT INTO collection_records (island_id, item_type, item_id, owned)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(island_id, item_type, item_id) DO UPDATE SET
           owned = excluded.owned,
           updated_at = CURRENT_TIMESTAMP;`,
        [islandId, itemType, item.id, value ? 1 : 0],
      );

      if (item.linkedVillager) {
        const column = VILLAGER_STATUS_COLUMNS[item.linkedVillager.status];
        db.runSync(
          `INSERT INTO villager_states (island_id, villager_id, ${column})
           VALUES (?, ?, ?)
           ON CONFLICT(island_id, villager_id) DO UPDATE SET
             ${column} = excluded.${column},
             updated_at = CURRENT_TIMESTAMP;`,
          [islandId, item.linkedVillager.id, value ? 1 : 0],
        );
      }
    }
  });
}

export function setCollectionStatusForItems(
  islandId: string,
  itemType: EncyclopediaCategory | CatalogCategory,
  itemIds: string[],
  status: EncyclopediaStatus,
  value: boolean,
) {
  if (itemIds.length === 0) return;
  db.withTransactionSync(() => {
    for (const itemId of itemIds) {
      setCollectionStatus(islandId, itemType, itemId, status, value);
    }
  });
}

export function setCollectionQuantity(
  islandId: string,
  itemType: CatalogCategory,
  itemId: string,
  quantity: number,
) {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) {
    throw new Error('VALIDATION_ERROR');
  }
  db.runSync(
    `INSERT INTO collection_records (island_id, item_type, item_id, quantity)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(island_id, item_type, item_id) DO UPDATE SET
       quantity = excluded.quantity,
       updated_at = CURRENT_TIMESTAMP;`,
    [islandId, itemType, itemId, quantity],
  );
}

export function getCampsiteVisitsForIsland(islandId: string): Record<string, string[]> {
  const result = db.getAllSync<CampsiteVisitRow>(
    `SELECT villager_id, visit_date
     FROM campsite_visits
     WHERE island_id = ?
     ORDER BY visit_date DESC;`,
    [islandId],
  );
  const visits: Record<string, string[]> = {};

  for (const row of result) {
    (visits[row.villager_id] ??= []).push(row.visit_date);
  }

  return visits;
}

function validateVisitDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('VALIDATION_ERROR');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error('VALIDATION_ERROR');
  }
}

export function addCampsiteVisit(islandId: string, villagerId: string, visitDate: string) {
  validateVisitDate(visitDate);

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT OR IGNORE INTO campsite_visits (id, island_id, villager_id, visit_date)
       VALUES (?, ?, ?, ?);`,
      [createId('campsite-visit'), islandId, villagerId, visitDate],
    );
    db.runSync(
      `INSERT INTO villager_states (island_id, villager_id, campsite_visited)
       VALUES (?, ?, 1)
       ON CONFLICT(island_id, villager_id) DO UPDATE SET
         campsite_visited = 1,
         updated_at = CURRENT_TIMESTAMP;`,
      [islandId, villagerId],
    );
  });
}

export function removeCampsiteVisit(islandId: string, villagerId: string, visitDate: string) {
  validateVisitDate(visitDate);

  db.withTransactionSync(() => {
    db.runSync(
      `DELETE FROM campsite_visits
       WHERE island_id = ? AND villager_id = ? AND visit_date = ?;`,
      [islandId, villagerId, visitDate],
    );
    const remaining = db.getAllSync<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM campsite_visits
       WHERE island_id = ? AND villager_id = ?;`,
      [islandId, villagerId],
    )[0]?.count;
    if (!remaining) {
      db.runSync(
        `UPDATE villager_states
         SET campsite_visited = 0, updated_at = CURRENT_TIMESTAMP
         WHERE island_id = ? AND villager_id = ?;`,
        [islandId, villagerId],
      );
    }
  });
}

export function createIsland(input: IslandInput) {
  validateIslandInput(input);

  const id = createId('island');
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    db.runSync('UPDATE islands SET is_active = 0, updated_at = ?;', [now]);
    db.runSync(
      `INSERT INTO islands
        (id, name, fruit, flower, hemisphere, timezone, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        id,
        input.name.trim(),
        input.fruit.trim(),
        input.flower.trim(),
        input.hemisphere,
        input.timezone.trim(),
        now,
        now,
      ]
    );

    db.runSync(
      `INSERT INTO player_profiles (island_id, name, birthday_month, birthday_day)
       VALUES (?, ?, ?, ?);`,
      [id, input.playerName.trim(), input.birthdayMonth ?? null, input.birthdayDay ?? null]
    );

    for (const [index, routine] of DEFAULT_ROUTINE_OPTIONS.entries()) {
      db.runSync(
        `INSERT INTO routines (id, island_id, title, goal_count, repeat_type, created_at)
         VALUES (?, ?, ?, ?, 'daily', ?);`,
        [createId(`routine-${index + 1}`), id, routine.title, routine.goalCount, now]
      );
    }
  });

  return id;
}

export function seedInitialIslandIfNeeded() {
  if (getIslandCount() === 0) {
    createIsland(TEST_ISLAND);
  }
}
