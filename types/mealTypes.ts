// Create a types file for meal-related types


export type Ingredient = {
    id: string
    name: string
    amount: number
    unit: string
    calories?: number
    protein_g?: number
    carbs_g?: number
    fat_g?: number
  }
  
  export type MealData = {
    name: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    image_url?: string
    brand?: string
    ingredients?: Ingredient[]
    portion_size?: number
    portion_unit?: string
  }

  export type Meal = {
    id?: string
    user_id: string
    name: string
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    timestamp: string
  }