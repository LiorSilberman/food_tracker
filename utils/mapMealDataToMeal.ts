import type { MealData, Meal } from "@/types/mealTypes"

/**
 * Convert MealData to Meal format for storage
 * @param userId - The ID of the user saving the meal
 * @param data - The meal data from input or analysis
 * @returns A Meal object ready for saving in Firestore or SQLite
 */
export function mapMealDataToMeal(userId: string, data: MealData): Meal {
  return {
    user_id: userId,
    name: data.name,
    calories: data.calories,
    protein_g: data.protein_g,
    carbs_g: data.carbs_g,
    fat_g: data.fat_g,
    timestamp: new Date().toISOString()
  }
}
