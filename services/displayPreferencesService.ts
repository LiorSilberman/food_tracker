import { db } from "@/dbInit"
import { auth } from "@/firebase"
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore"

const firestoreDb = getFirestore()

// Define the display preferences type
export type DisplayPreferences = {
  showCaloriesCircle: boolean
  showProteinBar: boolean
  showFatBar: boolean
  showCarbsBar: boolean
}

// Default preferences
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  showCaloriesCircle: true,
  showProteinBar: true,
  showFatBar: true,
  showCarbsBar: true,
}

/**
 * Initialize the display_preferences table in SQLite
 */
export const initDisplayPreferencesTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS display_preferences (
        user_id TEXT PRIMARY KEY,
        show_calories_circle INTEGER NOT NULL DEFAULT 1,
        show_protein_bar INTEGER NOT NULL DEFAULT 1,
        show_fat_bar INTEGER NOT NULL DEFAULT 1,
        show_carbs_bar INTEGER NOT NULL DEFAULT 1
      );
    `)
    console.log("✅ display_preferences table initialized")
    return true
  } catch (error) {
    console.error("❌ Error initializing display_preferences table:", error)
    return false
  }
}

/**
 * Save display preferences to SQLite and Firestore
 */
export const saveDisplayPreferences = async (preferences: DisplayPreferences): Promise<boolean> => {
  try {
    const user = auth.currentUser
    if (!user) throw new Error("User not authenticated")

    // 1. Save to SQLite
    await db.runAsync(
      `INSERT OR REPLACE INTO display_preferences 
       (user_id, show_calories_circle, show_protein_bar, show_fat_bar, show_carbs_bar) 
       VALUES (?, ?, ?, ?, ?);`,
      [
        user.uid,
        preferences.showCaloriesCircle ? 1 : 0,
        preferences.showProteinBar ? 1 : 0,
        preferences.showFatBar ? 1 : 0,
        preferences.showCarbsBar ? 1 : 0,
      ],
    )

    // 2. Save to Firestore
    await setDoc(doc(firestoreDb, "users", user.uid, "settings", "display_preferences"), {
      showCaloriesCircle: preferences.showCaloriesCircle,
      showProteinBar: preferences.showProteinBar,
      showFatBar: preferences.showFatBar,
      showCarbsBar: preferences.showCarbsBar,
      updatedAt: new Date(),
    })

    console.log("✅ Display preferences saved successfully")
    return true
  } catch (error) {
    console.error("❌ Error saving display preferences:", error)
    return false
  }
}

/**
 * Get display preferences from SQLite
 * Returns default preferences if none exist
 */
export const getDisplayPreferences = async (userId?: string): Promise<DisplayPreferences> => {
  try {
    // If userId is not provided, get it from the current authenticated user
    const user = userId ? { uid: userId } : auth.currentUser
    if (!user) return DEFAULT_DISPLAY_PREFERENCES

    // First try to get from SQLite
    const result = await db.getFirstAsync(
      `SELECT 
        show_calories_circle, 
        show_protein_bar, 
        show_fat_bar, 
        show_carbs_bar 
       FROM display_preferences 
       WHERE user_id = ?;`,
      [user.uid],
    )

    if (result) {
      // Use type assertion to tell TypeScript about the structure
      const typedResult = result as {
        show_calories_circle: number
        show_protein_bar: number
        show_fat_bar: number
        show_carbs_bar: number
      }

      // Convert SQLite integer values (0/1) to booleans
      return {
        showCaloriesCircle: typedResult.show_calories_circle === 1,
        showProteinBar: typedResult.show_protein_bar === 1,
        showFatBar: typedResult.show_fat_bar === 1,
        showCarbsBar: typedResult.show_carbs_bar === 1,
      }
    }

    // If not in SQLite, try Firestore as fallback
    console.log("⚠️ Display preferences not found in SQLite, checking Firestore as fallback...")
    const docRef = doc(firestoreDb, "users", user.uid, "settings", "display_preferences")
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      const preferences = {
        showCaloriesCircle: data.showCaloriesCircle ?? true,
        showProteinBar: data.showProteinBar ?? true,
        showFatBar: data.showFatBar ?? true,
        showCarbsBar: data.showCarbsBar ?? true,
      }

      // Save to SQLite for future use
      await saveDisplayPreferences(preferences)
      console.log("✅ Synced Firestore display preferences to SQLite for future use")

      return preferences
    }

    // If no preferences found anywhere, save and return defaults
    await saveDisplayPreferences(DEFAULT_DISPLAY_PREFERENCES)
    return DEFAULT_DISPLAY_PREFERENCES
  } catch (error) {
    console.error("❌ Error getting display preferences:", error)
    return DEFAULT_DISPLAY_PREFERENCES
  }
}
