import * as SQLite from "expo-sqlite"

export const db = SQLite.openDatabaseSync("foodTracker_v3.db")

console.log("SQLite DB path:", db.databasePath)

export const initDatabase = async () => {
  // 1) Ensure the base table exists (old schema, no createdAt)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS onboarding (
      id               INTEGER PRIMARY KEY NOT NULL,
      user_id          TEXT UNIQUE,
      goal             TEXT,
      age              TEXT,
      gender           TEXT,
      height           REAL,
      weight           REAL,
      activityLevel    TEXT,
      activityType     TEXT,
      experienceLevel  TEXT,
      targetWeight     REAL,
      weeklyRate       REAL
    );
  `)

  // 2) Check for createdAt
  const cols: { name: string }[] = await db.getAllAsync(
    `PRAGMA table_info(onboarding);`
  )
  const hasCreatedAt = cols.some((c) => c.name === "createdAt")

  // 3) If missing, ALTER + backfill
  if (!hasCreatedAt) {
    await db.execAsync(`
      ALTER TABLE onboarding
      ADD COLUMN createdAt TEXT;
    `)
    await db.execAsync(`
      UPDATE onboarding
      SET createdAt = CURRENT_TIMESTAMP
      WHERE createdAt IS NULL;
    `)
    console.log("✅ onboarding.createdAt column added in v3 DB")
  }

  // 2) Weight table (unchanged)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS weight (
      id        TEXT PRIMARY KEY,
      user_id   TEXT NOT NULL,
      weight    REAL NOT NULL,
      timestamp TEXT NOT NULL
    );
  `)

  // 3) Meals table (unchanged)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meals (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      name       TEXT,
      calories   INTEGER,
      protein_g  INTEGER,
      carbs_g    INTEGER,
      fat_g      INTEGER,
      timestamp  TEXT NOT NULL
    );
  `)
}

export const logAllOnboardingData = async () => {
  try {
    const results = await db.getAllAsync(`SELECT * FROM onboarding;`)
    console.log("📋 Onboarding table contents:")
    console.table(results)
  } catch (error) {
    console.error("❌ Failed to read onboarding data:", error)
  }
}

export const logAllMealsData = async () => {
  try {
    const results = await db.getAllAsync(`SELECT * FROM meals;`)
    console.log("📋 Meals table contents:")
    console.table(results)
  } catch (error) {
    console.error("❌ Failed to read meals data:", error)
  }
}

import * as FileSystem from 'expo-file-system'

export async function deleteAllDatabases() {
  const sqliteDir = `${FileSystem.documentDirectory}SQLite/`
  const dbFiles = ['foodTracker_v2.db', 'foodTracker.db']
  const suffixes = ['', '-shm', '-wal']

  for (const dbName of dbFiles) {
    for (const suffix of suffixes) {
      const fileUri = `${sqliteDir}${dbName}${suffix}`
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true })
        console.log(`✅ Deleted ${fileUri}`)
      } catch (e) {
        console.warn(`⚠️ Couldn’t delete ${fileUri}:`, e)
      }
    }
  }
}
