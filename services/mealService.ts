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
  query,
  where,
  getDocs
} from "firebase/firestore";
import type { MealData } from "@/types/mealTypes";

const db = getFirestore();

/**
 * Save a meal to the Firestore database
 * @param mealData The meal data to save
 * @returns A promise that resolves with the document ID when the meal is saved
 */
export async function saveMealToFirestore(mealData: MealData): Promise<string> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("Saving meal to Firestore:", JSON.stringify(mealData));

    // Add timestamp to the meal data
    const mealWithTimestamp = {
      ...mealData,
      timestamp: Timestamp.now(),
      userId: user.uid,
    };

    // Add to Firestore
    const docRef = await addDoc(collection(db, "users", user.uid, "meals"), mealWithTimestamp);

    console.log("Meal saved successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving meal to Firestore:", error);
    throw error;
  }
}

/**
 * Update an existing meal in the Firestore database
 * @param mealId The ID of the meal to update
 * @param mealData The updated meal data
 */
export async function updateMealInFirestore(mealId: string, mealData: Partial<MealData>): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("Updating meal in Firestore:", mealId, JSON.stringify(mealData));

    const mealRef = doc(db, "users", user.uid, "meals", mealId);
    await updateDoc(mealRef, mealData);

    console.log("Meal updated successfully");
  } catch (error) {
    console.error("Error updating meal in Firestore:", error);
    throw error;
  }
}

/**
 * Delete a meal from the Firestore database
 * @param mealId The ID of the meal to delete
 */
export async function deleteMealFromFirestore(mealId: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("Deleting meal from Firestore:", mealId);

    const mealRef = doc(db, "users", user.uid, "meals", mealId);
    await deleteDoc(mealRef);

    console.log("Meal deleted successfully");
  } catch (error) {
    console.error("Error deleting meal from Firestore:", error);
    throw error;
  }
}

/**
 * Save a meal (legacy function for compatibility)
 * This now uses saveMealToFirestore internally
 */
export async function saveMeal(mealData: MealData): Promise<void> {
  try {
    await saveMealToFirestore(mealData);
  } catch (error) {
    console.error("Error in saveMeal service:", error);
    throw error;
  }
}
