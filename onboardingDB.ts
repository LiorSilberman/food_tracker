import { db } from './dbInit'
import type { OnboardingData } from './context/OnboardingContext'


// Define a return type that includes createdAt
export type OnboardingRecord = OnboardingData & {
  createdAt?: string
}

/**
 * Fetches the onboarding row, including the createdAt column.
 */
export const fetchOnboardingData = async (
  userId: string
): Promise<OnboardingRecord> => {
  try {
    const row = await db.getFirstAsync<OnboardingRecord>(
      `SELECT *, createdAt FROM onboarding WHERE user_id = ? LIMIT 1;`,
      [userId]
    )
    return row ?? {}
  } catch (error) {
    throw new Error("Failed to fetch onboarding data: " + String(error))
  }
}
// Save (or update) onboarding data for a specific user
export const saveOnboardingData = async (
  userId: string,
  data: OnboardingData,
  createdAt: string
): Promise<void> => {
  try {
    // Normalize age into string or number or null
    let ageParam: string | number | null = null
    if (data.age instanceof Date) {
      ageParam = data.age.toISOString()
    } else if (typeof data.age === 'string') {
      ageParam = data.age
    } else if (typeof data.age === 'number') {
      ageParam = data.age
    }

    // Now all of these are string, number or null
    await db.runAsync(
      `INSERT OR REPLACE INTO onboarding 
         (id, user_id, goal, age, gender, height, weight, activityLevel, activityType, experienceLevel, targetWeight, weeklyRate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        1,
        userId,
        data.goal ?? null,
        ageParam,
        data.gender ?? null,
        data.height ?? null,
        data.weight ?? null,
        data.activityLevel ?? null,
        data.activityType ?? null,
        data.experienceLevel ?? null,
        data.targetWeight ?? null,
        data.weeklyRate ?? null,
        createdAt,
      ]
    )
  } catch (error) {
    throw new Error('Failed to save onboarding data: ' + String(error))
  }
}
