// services/mealServices.tsx

import { auth } from "../firebase";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { Alert } from "react-native";
import { db as sqliteDb } from "../dbInit";
import type { MealData } from "@/types/mealTypes";
import { mapMealDataToMeal } from "@/utils/mapMealDataToMeal";

const db = getFirestore();

/**
 * Save a meal to both Firestore and SQLite
 */
export async function saveMealToFirestoreAndSQLite(mealData: MealData): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const timestamp = new Date().toISOString();
    const firestoreMeal = {
      ...mealData,
      timestamp: Timestamp.now(),
      userId: user.uid,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "users", user.uid, "meals"), firestoreMeal);

    try {
      const meal = mapMealDataToMeal(user.uid, mealData);
      console.log("🧪 Saving to SQLite with ID:", docRef.id)
      console.log("🧪 Full meal payload:", meal)
      
      await sqliteDb.runAsync(
        `INSERT INTO meals (id, user_id, name, calories, protein_g, carbs_g, fat_g, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [docRef.id, meal.user_id, meal.name, meal.calories, meal.protein_g, meal.carbs_g, meal.fat_g, meal.timestamp]
      );
    } catch (sqliteErr) {
      await deleteDoc(doc(db, "users", user.uid, "meals", docRef.id));
      Alert.alert("שגיאה", "השמירה נכשלה במסד הנתונים המקומי, הפעולה בוטלה.");
      throw new Error("Meal saved to Firestore but failed in SQLite. Rolling back Firestore.");
    }

    return docRef.id;
  } catch (error) {
    console.error("Error saving meal:", error);
    Alert.alert("שגיאה", "אירעה שגיאה בעת השמירה.");
    throw error;
  }
}

/**
 * Update a meal in both Firestore and SQLite
 */
export async function updateMealInFirestoreAndSQLite(mealId: string, mealData: Partial<MealData>): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const mealRef = doc(db, "users", user.uid, "meals", mealId);
    const originalSnap = await getDoc(mealRef);
    const originalData = originalSnap.data();

    await updateDoc(mealRef, mealData);

    try {
      const timestamp = 'timestamp' in mealData && mealData.timestamp instanceof Timestamp
        ? mealData.timestamp.toDate().toISOString()
        : new Date().toISOString();

      await sqliteDb.runAsync(
        `UPDATE meals SET name = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, timestamp = ?
         WHERE user_id = ? AND id = ?;`,
        [
          mealData.name ?? "",
          mealData.calories ?? 0,
          mealData.protein_g ?? 0,
          mealData.carbs_g ?? 0,
          mealData.fat_g ?? 0,
          timestamp,
          user.uid,
          mealId
        ]
      );
    } catch (sqliteErr) {
      if (originalData) await updateDoc(mealRef, originalData);
      Alert.alert("שגיאה", "העדכון נכשל במסד הנתונים המקומי, הפעולה בוטלה.");
      throw new Error("Meal updated in Firestore but failed in SQLite. Rolling back Firestore.");
    }
  } catch (error) {
    console.error("Error updating meal:", error);
    Alert.alert("שגיאה", "אירעה שגיאה בעת העדכון.");
    throw error;
  }
}

/**
 * Delete a meal from both Firestore and SQLite
 */
export async function deleteMealFromFirestoreAndSQLite(mealId: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const mealRef = doc(db, "users", user.uid, "meals", mealId);
    const snapshot = await getDoc(mealRef);
    const originalData = snapshot.data();

    await deleteDoc(mealRef);

    try {
      await sqliteDb.runAsync(`DELETE FROM meals WHERE user_id = ? AND id = ?;`, [user.uid, mealId]);
    } catch (sqliteErr) {
      if (originalData) {
        await addDoc(collection(db, "users", user.uid, "meals"), originalData);
      }
      Alert.alert("שגיאה", "המחיקה נכשלה במסד הנתונים המקומי, הפעולה בוטלה.");
      throw new Error("Meal deleted from Firestore but failed in SQLite. Rolling back Firestore.");
    }
  } catch (error) {
    console.error("Error deleting meal:", error);
    Alert.alert("שגיאה", "אירעה שגיאה בעת המחיקה.");
    throw error;
  }
}

/**
 * Legacy save method for compatibility
 */
export async function saveMeal(mealData: MealData): Promise<void> {
  try {
    await saveMealToFirestoreAndSQLite(mealData);
  } catch (error) {
    console.error("Error in saveMeal service:", error);
    Alert.alert("שגיאה", "אירעה שגיאה בשמירת הארוחה.");
    throw error;
  }
}
