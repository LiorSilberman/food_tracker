import { calculateAge } from "./dateHelpers"

export type CalorieCalculationParams = {
  gender: string
  age: number | Date
  weight: number
  height: number
  activityLevel: string
  activityType?: string
  goal?: string
  weeklyRate?: number
  experienceLevel?: string
  targetWeight?: number
}

export type MacroCalculationParams = {
  weight: number
  dailyCalories: number
  activityLevel: string
  activityType?: string
  goal?: string
}

export function calculateDailyCalories(params: CalorieCalculationParams): number {
  // ensure age is a number
  const ageYears = typeof params.age === "number" ? params.age : calculateAge(params.age)

  const { gender, weight, height, activityLevel, goal, weeklyRate, experienceLevel, targetWeight } = params

  // BMR (Mifflin–St Jeor)
  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * ageYears + 5
      : 10 * weight + 6.25 * height - 5 * ageYears - 161

  // Activity multiplier
  let activityMultiplier = 1.2
  switch (activityLevel) {
    case "sedentary":
      activityMultiplier = 1.2
      break
    case "moderate":
      activityMultiplier = 1.375
      break
    case "active":
      activityMultiplier = 1.55
      break
  }

  let tdee = Math.round(bmr * activityMultiplier)

  // Adjust for goal
  if (goal === "lose_weight" && weeklyRate) {
    const dailyDeficit = (weeklyRate * 7700) / 7
    tdee -= Math.round(dailyDeficit)
  } else if (goal === "gain_weight" && weeklyRate) {
    const dailySurplus = (weeklyRate * 7700) / 7
    tdee += Math.round(dailySurplus)
  } else if (goal === "build_muscle") {
    const current = weight
    const target = targetWeight ?? weight
    if (target < current) {
      tdee -= 250
    } else {
      const surplus = experienceLevel === "beginner" ? 200 : 150
      tdee += surplus
    }
  }

  return Math.max(1200, Math.min(tdee, 3000))
}

// Fix the calculateDailyMacros function to ensure it always returns valid values
export function calculateDailyMacros(params: MacroCalculationParams): {
  proteinG: number
  fatG: number
  carbsG: number
} {
  // ensure we have valid parameters
  const weight = params.weight > 0 ? params.weight : 70
  const dailyCalories = params.dailyCalories > 0 ? params.dailyCalories : 2000
  const activityLevel = params.activityLevel || "moderate"
  const activityType = params.activityType || "mixed"
  const goal = params.goal || "maintain_weight"

  let proteinPerKg = 1.6
  // let fatRatio = 0.3;

  if (goal === "build_muscle") {
    proteinPerKg = 1.9
    // fatRatio = 0.25;
  } else if (goal === "lose_weight") {
    proteinPerKg = 1.6
    // fatRatio = 0.25;
  } else if (goal === "gain_weight") {
    proteinPerKg = 1.8
    // fatRatio = 0.3;
  }

  if (activityType === "anaerobic" || activityType === "mixed") {
    proteinPerKg += 0.2
  } else if (activityType === "aerobic") {
    proteinPerKg += 0.1
  }

  const proteinG = Math.min(Math.round(weight * proteinPerKg), Math.round(weight * 2.2))
  // const fatG = Math.round((dailyCalories) / 9);
  const fatG = Math.round(weight * 0.9)

  const proteinCalories = proteinG * 4
  const fatCalories = fatG * 9
  const remaining = dailyCalories - proteinCalories - fatCalories
  const carbsG = Math.max(Math.round(remaining / 4), 50)

  console.log("Macro calculation:", { proteinG, fatG, carbsG, weight, calories: dailyCalories })

  return { proteinG, fatG, carbsG }
}
