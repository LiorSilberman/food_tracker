import { calculateDailyCalories } from "@/utils/calorieUtils"
import { db } from "../dbInit"
import type { DayData } from "@/components/ui/TimeRangeBarChart"

/**
 * Fetch all meals for today, ordered by timestamp.
 */
export const fetchTodayMealsFromSQLite = async (userId: string) => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const startIso = todayStart.toISOString()
  const endIso = todayEnd.toISOString()

  try {
    const meals = await db.getAllAsync(
      `SELECT * FROM meals WHERE user_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp ASC`,
      [userId, startIso, endIso]
    )
    return meals
  } catch (err) {
    console.error("Error fetching meals from SQLite:", err)
    return []
  }
}

/**
 * Fetch the full weight history for this user, ordered ascending by timestamp.
 */
export const fetchWeightHistoryFromSQLite = async (userId: string) => {
  try {
    const rows = await db.getAllAsync(
      `SELECT id, weight, timestamp
         FROM weight
        WHERE user_id = ?
     ORDER BY datetime(timestamp) ASC;`,
      [userId]
    )
    return rows.map((r: any) => ({
      id: r.id,
      weight: r.weight,
      timestamp: new Date(r.timestamp),
    }))
  } catch (err) {
    console.error("Error fetching weight history from SQLite:", err)
    return []
  }
}

/**
 * Fetch all meals for the past year, ordered ascending by timestamp.
 */
export const fetchMealsPastYearFromSQLite = async (userId: string) => {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const startIso = oneYearAgo.toISOString()

    const rows = await db.getAllAsync(
      `SELECT id, name, calories, protein_g, carbs_g, fat_g, timestamp
         FROM meals
        WHERE user_id = ?
          AND datetime(timestamp) >= datetime(?)
     ORDER BY datetime(timestamp) ASC;`,
      [userId, startIso]
    )

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      calories: r.calories,
      protein_g: r.protein_g,
      carbs_g: r.carbs_g,
      fat_g: r.fat_g,
      timestamp: new Date(r.timestamp),
    }))
  } catch (err) {
    console.error("Error fetching meals past year from SQLite:", err)
    return []
  }
}

/**
 * Fetch total calories per hour for a specific day.
 * Returns an array of 24 DayData entries (one per hour).
 */
export const fetchHourlyCaloriesFromSQLite = async (userId: string, date: Date = new Date()): Promise<DayData[]> => {
  try {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const startIso = dayStart.toISOString()
    const endIso = dayEnd.toISOString()

    console.log(`Fetching hourly data for ${dayStart.toLocaleDateString()} from ${startIso} to ${endIso}`)

    const rows: { hour: string; total: number }[] = await db.getAllAsync(
      `SELECT strftime('%H', datetime(timestamp, 'localtime')) AS hour, SUM(calories) AS total
         FROM meals
        WHERE user_id = ?
          AND timestamp BETWEEN ? AND ?
        GROUP BY hour;`,
      [userId, startIso, endIso],
    )

    const map: Record<string, number> = {}
    rows.forEach((r) => {
      map[r.hour] = r.total
    })

    const data: DayData[] = []
    for (let i = 0; i < 24; i++) {
      const dt = new Date(dayStart)
      dt.setHours(i)
      const hourKey = String(i).padStart(2, "0")
      data.push({ date: dt.toISOString(), value: map[hourKey] || 0 })
    }
    return data
  } catch (err) {
    console.error("Error fetching hourly calories from SQLite:", err)
    return []
  }
}

