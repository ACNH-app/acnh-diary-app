import * as SQLite from 'expo-sqlite';

import type { Island, IslandInput, Routine } from '../types/island';

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
  `);

  // Existing Phase 0 databases need these columns before the active-island index is created.
  ensureColumn('islands', 'is_active', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('islands', 'updated_at', 'TEXT');

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
