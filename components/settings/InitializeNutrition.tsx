"use client"

import { useEffect } from "react"
import { auth } from "@/firebase"
import { fetchOnboardingData } from "@/onboardingDB"
import { useUserStore } from "@/stores/userStore"
import { calculateDailyCalories, calculateDailyMacros } from "@/utils/nutritionCalculator"
import { getCurrentWeight } from "@/services/weightService"
import { getCustomNutrition } from "@/services/nutritionService"

// This component initializes nutrition values when the app starts
const InitializeNutrition = () => {
  const { setNutritionValues } = useUserStore()

  useEffect(() => {
    const initializeNutrition = async () => {
      try {
        console.log("Initializing nutrition values...")

        const user = auth.currentUser
        if (!user) {
          console.log("No authenticated user, using default values")
          // Set default values if no user is authenticated
          setNutritionValues({
            calories: 2000,
            protein: 120,
            carbs: 200,
            fat: 70,
          })
          return
        }

        // First, check if there are custom nutrition values in SQLite
        const customNutrition = await getCustomNutrition(user.uid)

        if (customNutrition) {
          console.log("Found custom nutrition values in SQLite:", customNutrition)
          // Use custom values and mark them as manually edited
          setNutritionValues(
            {
              calories: customNutrition.calories,
              protein: customNutrition.protein,
              carbs: customNutrition.carbs,
              fat: customNutrition.fat,
            },
            true,
          )

          // Add additional logging to verify values are set correctly
          console.log("Set custom nutrition values in store:", {
            calories: customNutrition.calories,
            protein: customNutrition.protein,
            carbs: customNutrition.carbs,
            fat: customNutrition.fat,
          })
          return
        }

        // If no custom values, calculate based on user data from SQLite
        console.log("No custom nutrition values found, calculating from user data in SQLite")

        // Get user data from SQLite
        const userData = await fetchOnboardingData(user.uid)
        console.log("Fetched user data from SQLite:", userData)

        // Get current weight from SQLite
        const weight = await getCurrentWeight(user.uid)
        if (weight !== null) {
          userData.weight = weight
        }

        // Handle age parameter properly
        let ageParam: number | Date = new Date()
        if (typeof userData.age === "string") ageParam = new Date(userData.age)
        else if (typeof userData.age === "number") ageParam = userData.age

        // Calculate nutrition values
        const calories = calculateDailyCalories({
          gender: userData.gender || "male",
          age: ageParam || 30,
          weight: userData.weight || 70,
          height: userData.height || 170,
          activityLevel: userData.activityLevel || "moderate",
          activityType: userData.activityType || "mixed",
          goal: userData.goal || "maintain_weight",
          weeklyRate: userData.weeklyRate || 0.5,
          experienceLevel: userData.experienceLevel || "intermediate",
          targetWeight: userData.targetWeight || userData.weight || 70,
        })

        const { proteinG, fatG, carbsG } = calculateDailyMacros({
          weight: userData.weight || 70,
          dailyCalories: calories,
          activityLevel: userData.activityLevel || "moderate",
          activityType: userData.activityType || "mixed",
          goal: userData.goal || "maintain_weight",
        })

        console.log("Calculated nutrition values:", { calories, proteinG, carbsG, fatG, weight: userData.weight })

        // Update store with all values at once
        setNutritionValues(
          {
            calories: calories,
            protein: proteinG,
            carbs: carbsG,
            fat: fatG,
          },
          false,
        )

        // Log the values after setting them
        console.log("Nutrition values set in store")
      } catch (error) {
        console.error("Error initializing nutrition values:", error)
        // Set default values if there's an error
        setNutritionValues({
          calories: 2000,
          protein: 120,
          carbs: 200,
          fat: 70,
        })
      }
    }

    // Initialize nutrition values when the component mounts
    initializeNutrition()

    // Also set up an auth state listener to re-initialize when auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("Auth state changed - user logged in, re-initializing nutrition")
        initializeNutrition()
      }
    })

    // Clean up the listener when the component unmounts
    return () => unsubscribe()
  }, [])

  // This component doesn't render anything
  return null
}

export default InitializeNutrition
