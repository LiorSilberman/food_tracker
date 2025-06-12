import { auth } from "@/firebase"
import { db } from "@/dbInit"
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore"

const firestoreDb = getFirestore()

// Type for custom nutrition values
export type CustomNutrition = {
  calories: number
  protein: number
  fat: number
  carbs: number
}

/**
 * Save custom nutrition values to both SQLite and Firestore
 */
export const saveCustomNutrition = async (values: CustomNutrition): Promise<boolean> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("User not authenticated")

    // 1. Save to SQLite
    await db.runAsync(
      `INSERT OR REPLACE INTO custom_nutrition (user_id, calories, protein, fat, carbs) 
       VALUES (?, ?, ?, ?, ?);`,
      [user.uid, values.calories, values.protein, values.fat, values.carbs],
    )

    // 2. Save to Firestore
    await setDoc(doc(firestoreDb, "users", user.uid, "settings", "custom_nutrition"), {
      calories: values.calories,
      protein: values.protein,
      fat: values.fat,
      carbs: values.carbs,
      updatedAt: new Date(),
    })

    console.log("✅ Custom nutrition values saved successfully")
    return true
  } catch (error) {
    console.error("❌ Error saving custom nutrition values:", error)
    return false
  }
}

/**
 * Get custom nutrition values from SQLite
 * Returns null if no custom values exist
 */
export const getCustomNutrition = async (userId?: string): Promise<CustomNutrition | null> => {
  try {
    // If userId is not provided, get it from the current authenticated user
    const user = userId ? { uid: userId } : auth.currentUser
    if (!user) return null

    // First try to get from SQLite
    const result = await db.getFirstAsync(
      `SELECT calories, protein, fat, carbs 
       FROM custom_nutrition 
       WHERE user_id = ?;`,
      [user.uid],
    )

    if (result) {
      // Use type assertion to tell TypeScript about the structure
      const typedResult = result as {
        calories: number | string | null
        protein: number | string | null
        fat: number | string | null
        carbs: number | string | null
      }

      // Explicitly cast the result to the expected types
      const calories = Number(typedResult.calories || 0)
      const protein = Number(typedResult.protein || 0)
      const fat = Number(typedResult.fat || 0)
      const carbs = Number(typedResult.carbs || 0)

      console.log("✅ Raw custom nutrition values from SQLite:", typedResult)
      console.log("✅ Converted custom nutrition values:", { calories, protein, fat, carbs })

      return {
        calories,
        protein,
        fat,
        carbs,
      }
    }

    // If not in SQLite, try Firestore as fallback
    // This is only a fallback mechanism for data synchronization
    console.log("⚠️ Custom nutrition not found in SQLite, checking Firestore as fallback...")
    const docRef = doc(firestoreDb, "users", user.uid, "settings", "custom_nutrition")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      const values = {
        calories: Number(data.calories || 0),
        protein: Number(data.protein || 0),
        fat: Number(data.fat || 0),
        carbs: Number(data.carbs || 0),
      }

      console.log("✅ Custom nutrition values retrieved from Firestore:", values)

      // Save to SQLite for future use
      await saveCustomNutrition(values)
      console.log("✅ Synced Firestore nutrition values to SQLite for future use")

      return values
    }

    return null
  } catch (error) {
    console.error("❌ Error getting custom nutrition values:", error)
    return null
  }
}

/**
 * Delete custom nutrition values from both SQLite and Firestore
 */
export const deleteCustomNutrition = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("User not authenticated")

    // 1. Delete from SQLite
    await db.runAsync(`DELETE FROM custom_nutrition WHERE user_id = ?;`, [user.uid])

    // 2. Delete from Firestore
    await deleteDoc(doc(firestoreDb, "users", user.uid, "settings", "custom_nutrition"))

    console.log("✅ Custom nutrition values deleted successfully")
    return true
  } catch (error) {
    console.error("❌ Error deleting custom nutrition values:", error)
    return false
  }
}
