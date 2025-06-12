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

/**
 * Updates a single field in the onboarding table for a specific user.
 * @param userId The user ID
 * @param field The field name to update
 * @param value The new value for the field
 * @returns A boolean indicating success or failure
 */
export const updateOnboardingField = async (
  userId: string,
  field: string,
  value: any
): Promise<boolean> => {
  try {
    // Check if the field exists in the table
    const cols = await db.getAllAsync(`PRAGMA table_info(onboarding);`)
    const validFields = cols.map((col: any) => col.name)

    if (!validFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`)
    }

    // Update the field
    await db.runAsync(
      `UPDATE onboarding SET ${field} = ? WHERE user_id = ?;`,
      [value, userId]
    )

    console.log(`✅ Updated onboarding.${field} to ${value} for user ${userId}`)
    return true
  } catch (error) {
    console.error(`Error updating onboarding.${field}:`, error)
    throw new Error(`Failed to update ${field}: ` + String(error))
  }
}

/**
 * Updates multiple fields in the onboarding table for a specific user.
 * @param userId The user ID
 * @param updates An object with field names as keys and new values as values
 * @returns A boolean indicating success or failure
 */
export const updateMultipleOnboardingFields = async (
  userId: string,
  updates: Record<string, any>
): Promise<boolean> => {
  try {
    // Check if all fields exist in the table
    const cols = await db.getAllAsync(`PRAGMA table_info(onboarding);`)
    const validFields = cols.map((col: any) => col.name)

    const fieldsToUpdate = Object.keys(updates).filter((field) => 
      validFields.includes(field)
    )

    if (fieldsToUpdate.length === 0) {
      throw new Error("No valid fields to update")
    }

    // Build the SQL query
    const setClause = fieldsToUpdate.map((field) => `${field} = ?`).join(", ")
    const values = fieldsToUpdate.map((field) => updates[field])
    values.push(userId)

    // Execute the update
    await db.runAsync(
      `UPDATE onboarding SET ${setClause} WHERE user_id = ?;`,
      values
    )

    console.log(`✅ Updated multiple onboarding fields for user ${userId}:`, fieldsToUpdate)
    return true
  } catch (error) {
    console.error("Error updating multiple onboarding fields:", error)
    throw new Error('Failed to update onboarding fields: ' + String(error))
  }
}

/**
 * Updates a specific onboarding field and returns the updated onboarding data.
 * @param userId The user ID
 * @param field The field name to update
 * @param value The new value for the field
 * @returns The updated onboarding data
 */
export const updateFieldAndFetchOnboarding = async (
  userId: string,
  field: string,
  value: any
): Promise<OnboardingRecord> => {
  await updateOnboardingField(userId, field, value)
  return await fetchOnboardingData(userId)
}

/**
 * Updates multiple onboarding fields and returns the updated onboarding data.
 * @param userId The user ID
 * @param updates An object with field names as keys and new values as values
 * @returns The updated onboarding data
 */
export const updateMultipleFieldsAndFetchOnboarding = async (
  userId: string,
  updates: Record<string, any>
): Promise<OnboardingRecord> => {
  await updateMultipleOnboardingFields(userId, updates)
  return await fetchOnboardingData(userId)
}