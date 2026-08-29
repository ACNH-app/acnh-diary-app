import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('acnh_diary.db');

export function initializeDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS islands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      fruit TEXT,
      flower TEXT,
      hemisphere TEXT,
      timezone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      island_id TEXT NOT NULL,
      title TEXT NOT NULL,
      goal_count INTEGER NOT NULL DEFAULT 1,
      repeat_type TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS routine_logs (
      id TEXT PRIMARY KEY,
      island_id TEXT NOT NULL,
      routine_id TEXT NOT NULL,
      log_date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function seedInitialIslandIfNeeded() {
  const existing = db.getAllSync('SELECT COUNT(*) as count FROM islands;') as Array<{ count: number }>;

  if (existing[0]?.count === 0) {
    db.runSync(
      'INSERT INTO islands (id, name, fruit, flower, hemisphere, timezone) VALUES (?, ?, ?, ?, ?, ?);',
      ['default-island', '달빛섬', '사과', '라일락', '북반구', 'KST']
    );
  }
}
