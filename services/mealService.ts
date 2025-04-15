// Create a new service file for meal operations

import { auth } from "../firebase"
import type { MealData } from "../types/mealTypes"

// Define the base URL for your API
const API_BASE_URL = "http://192.168.1.102:5000" // Update this to your actual API URL

/**
 * Save a meal to the database
 * @param mealData The meal data to save
 * @returns A promise that resolves when the meal is saved
 */
export async function saveMeal(mealData: MealData): Promise<void> {
  try {
    const user = auth.currentUser
    if (!user) {
      throw new Error("User not authenticated")
    }

    console.log("Saving meal to database:", JSON.stringify(mealData))

    const response = await fetch(`${API_BASE_URL}/meals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`, // Assuming you use Firebase Auth
      },
      body: JSON.stringify({
        userId: user.uid,
        meal: mealData,
        timestamp: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Failed to save meal: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    console.log("Meal saved successfully:", result)
    return result
  } catch (error) {
    console.error("Error in saveMeal service:", error)
    throw error
  }
}
