import { auth } from "../firebase"
import { getFirestore, collection, addDoc, Timestamp, doc, deleteDoc } from "firebase/firestore"
import { db as sqliteDb } from "../dbInit"

const firestoreDb = getFirestore()

/**
 * Fetch the full weight history from SQLite for this user.
 */
export async function getWeightHistoryFromSQLite(
  userId: string,
): Promise<{ id: string; weight: number; timestamp: Date }[]> {
  try {
    const rows = await sqliteDb.getAllAsync(
      `SELECT id, weight, timestamp 
          FROM weight 
         WHERE user_id = ? 
      ORDER BY datetime(timestamp) DESC;`, // Changed to DESC to show newest first
      [userId],
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
 * Save a new weight entry to both Firestore and SQLite.
 * Returns the Firestore doc ID.
 */
export async function saveWeightToFirestoreAndSQLite(weightValue: number): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new Error("User not authenticated")

  // 1) Firestore
  const docRef = await addDoc(collection(firestoreDb, "users", user.uid, "weight"), {
    weight: weightValue,
    timestamp: Timestamp.now(),
  })

  // 2) SQLite
  const isoTs = new Date().toISOString()
  await sqliteDb.runAsync(`INSERT INTO weight (id, user_id, weight, timestamp) VALUES (?, ?, ?, ?);`, [
    docRef.id,
    user.uid,
    weightValue,
    isoTs,
  ])

  return docRef.id
}

/**
 * Delete a weight entry from both Firestore and SQLite.
 * Returns true if successful.
 */
export async function deleteWeightEntry(entryId: string): Promise<boolean> {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("User not authenticated")

    // 1) Delete from Firestore
    await deleteDoc(doc(firestoreDb, "users", user.uid, "weight", entryId))

    // 2) Delete from SQLite
    await sqliteDb.runAsync(`DELETE FROM weight WHERE id = ? AND user_id = ?;`, [entryId, user.uid])

    return true
  } catch (err) {
    console.error("Error deleting weight entry:", err)
    return false
  }
}

/**
 * Get the current weight (most recent entry) from the weight table.
 * Returns the weight value or null if no entries exist.
 */
export async function getCurrentWeight(userId?: string): Promise<number | null> {
  try {
    // If userId is not provided, get it from the current authenticated user
    const user = userId ? { uid: userId } : auth.currentUser
    if (!user) throw new Error("User not authenticated")

    // Query for the most recent weight entry from SQLite
    const result = await sqliteDb.getFirstAsync(
      `SELECT weight 
       FROM weight 
      WHERE user_id = ? 
   ORDER BY datetime(timestamp) DESC 
      LIMIT 1;`,
      [user.uid],
    )

    // Type check and return the weight value or null if no entries exist
    if (result && typeof result === "object" && "weight" in result) {
      console.log("✅ Current weight retrieved from SQLite:", result.weight)
      return result.weight as number
    }

    // No fallback to Firestore - SQLite is the source of truth for weight data
    console.log("ℹ️ No weight entries found in SQLite")
    return null
  } catch (err) {
    console.error("❌ Error fetching current weight from SQLite:", err)
    return null
  }
}

/**
 * Update the user's weight in the onboarding table with the most recent weight.
 * This ensures the onboarding table has the current weight for calculations.
 */
export async function syncCurrentWeightToOnboarding(): Promise<boolean> {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("User not authenticated")

    // Get the current weight
    const currentWeight = await getCurrentWeight(user.uid)

    // If no weight entries exist, return false
    if (currentWeight === null) return false

    // Update the onboarding table with the current weight
    await sqliteDb.runAsync(`UPDATE onboarding SET weight = ? WHERE user_id = ?;`, [currentWeight, user.uid])

    return true
  } catch (err) {
    console.error("Error syncing current weight to onboarding:", err)
    return false
  }
}

/**
 * Add a new weight entry and sync it to the onboarding table.
 * This is a convenience function that combines saveWeightToFirestoreAndSQLite and syncCurrentWeightToOnboarding.
 * Returns the Firestore doc ID.
 */
export async function addWeightEntryAndSync(weightValue: number): Promise<string> {
  try {
    // Save the new weight entry
    const docId = await saveWeightToFirestoreAndSQLite(weightValue)

    // Sync the weight to the onboarding table
    await syncCurrentWeightToOnboarding()

    return docId
  } catch (err) {
    console.error("Error adding weight entry and syncing:", err)
    throw err
  }
}

/**
 * Delete a weight entry and update the onboarding table if needed.
 * If the deleted entry was the most recent one, the onboarding table will be updated with the new most recent weight.
 * Returns true if successful.
 */
export async function deleteWeightEntryAndSync(entryId: string): Promise<boolean> {
  try {
    // Delete the weight entry
    const success = await deleteWeightEntry(entryId)

    if (success) {
      // Sync the weight to the onboarding table
      await syncCurrentWeightToOnboarding()
    }

    return success
  } catch (err) {
    console.error("Error deleting weight entry and syncing:", err)
    return false
  }
}
