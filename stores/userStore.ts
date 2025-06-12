import { create } from "zustand"

type UserState = {
  // Daily nutrition values
  dailyCalories: number
  dailyProtein: number
  dailyCarbs: number
  dailyFat: number
  manuallyEdited: boolean // New flag to track manual edits
  userGender: string | null // Add userGender property

  // Setter functions
  setDailyCalories: (calories: number) => void
  setDailyProtein: (protein: number) => void
  setDailyCarbs: (carbs: number) => void
  setDailyFat: (fat: number) => void
  setUserGender: (gender: string | null) => void // Add setter for userGender

  // Convenience function to set all nutrition values at once
  setNutritionValues: (
    values: {
      calories: number
      protein: number
      carbs: number
      fat: number
    },
    isManualEdit?: boolean,
  ) => void

  // Reset the manually edited flag
  resetManuallyEdited: () => void
}

export const useUserStore = create<UserState>((set) => ({
  // Initial values
  dailyCalories: 0,
  dailyProtein: 0,
  dailyCarbs: 0,
  dailyFat: 0,
  manuallyEdited: false,
  userGender: null, // Initialize userGender as null

  // Individual setters
  setDailyCalories: (calories) => set({ dailyCalories: calories }),
  setDailyProtein: (protein) => set({ dailyProtein: protein }),
  setDailyCarbs: (carbs) => set({ dailyCarbs: carbs }),
  setDailyFat: (fat) => set({ dailyFat: fat }),
  setUserGender: (gender) => set({ userGender: gender }), // Add setter implementation

  // Convenience function to set all values at once
  setNutritionValues: (values, isManualEdit = false) =>
    set({
      dailyCalories: values.calories,
      dailyProtein: values.protein,
      dailyCarbs: values.carbs,
      dailyFat: values.fat,
      manuallyEdited: isManualEdit, // Set the flag when values are manually edited
    }),

  // Reset the manually edited flag
  resetManuallyEdited: () => set({ manuallyEdited: false }),
}))
