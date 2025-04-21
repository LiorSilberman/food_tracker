import { create } from 'zustand'
import { MealData, Ingredient } from '@/types/mealTypes'

type BarcodeScanStore = {
  scannedBarcodeMeal: MealData | null
  scannedIngredients: Ingredient[]
  setScannedBarcodeData: (meal: MealData, ingredients: Ingredient[]) => void
  clearScannedData: () => void
}

export const useBarcodeScanStore = create<BarcodeScanStore>((set) => ({
  scannedBarcodeMeal: null,
  scannedIngredients: [],
  setScannedBarcodeData: (meal, ingredients) =>
    set({ scannedBarcodeMeal: meal, scannedIngredients: ingredients }),
  clearScannedData: () => set({ scannedBarcodeMeal: null, scannedIngredients: [] }),
}))
