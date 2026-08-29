import * as SQLite from 'expo-sqlite';

import type { Island, IslandInput, Routine } from '../types/island';
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

const DEFAULT_ROUTINES = [
  { title: '토마토 심기', goalCount: 1 },
  { title: '집 정리', goalCount: 1 },
] as const;

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

const VILLAGER_STATUS_COLUMNS: Record<VillagerStatus, keyof Omit<VillagerStateRow, 'villager_id'>> = {
  wishlist: 'wishlist',
  campsiteVisited: 'campsite_visited',
  islandResident: 'island_resident',
  movedOut: 'moved_out',
  photoReceived: 'photo_received',
  posterOwned: 'poster_owned',
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
  `);

  // Existing Phase 0 databases need these columns before the active-island index is created.
  ensureColumn('islands', 'is_active', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('islands', 'updated_at', 'TEXT');
  ensureColumn('villager_states', 'poster_owned', 'INTEGER NOT NULL DEFAULT 0');

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
       VALUES (?, ?, NULL, NULL);`,
      [id, input.playerName.trim()]
    );

    for (const [index, routine] of DEFAULT_ROUTINES.entries()) {
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
