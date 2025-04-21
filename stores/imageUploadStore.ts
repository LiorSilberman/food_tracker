import { create } from 'zustand'
import type { MealData, Ingredient } from '@/types/mealTypes'

type ImageUploadState = {
  // Image analysis state
  imageUri: string | null
  imageBase64: string | null
  componentId: string | null
  result: any | null

  // Barcode scanning state
  scannedBarcodeMeal: MealData | null
  scannedIngredients: Ingredient[]

  // Modal control
  showUploadModal: boolean
  setShowUploadModal: (show: boolean) => void

  // Setters
  setImageData: (uri: string, base64: string) => void
  setResult: (res: any) => void
  clearImage: () => void

  setScannedBarcodeData: (meal: MealData, ingredients: Ingredient[]) => void
  clearScannedBarcodeData: () => void

  reset: () => void
}

export const useImageUploadStore = create<ImageUploadState>((set) => ({
  imageUri: null,
  imageBase64: null,
  componentId: null,
  result: null,

  scannedBarcodeMeal: null,
  scannedIngredients: [],

  showUploadModal: false,
  setShowUploadModal: (show) => set({ showUploadModal: show }),

  setImageData: (uri, base64) =>
    set({
      imageUri: uri,
      imageBase64: base64,
      componentId: Date.now().toString(),
      result: null,
      scannedBarcodeMeal: null,
      scannedIngredients: [],
    }),

  clearImage: () =>
    set({
      imageUri: null,
      imageBase64: null,
      componentId: null,
      result: null,
    }),

  setResult: (res) => set({ result: res }),

  setScannedBarcodeData: (meal, ingredients) =>
    set({
      scannedBarcodeMeal: meal,
      scannedIngredients: ingredients,
      imageUri: null,
      imageBase64: null,
      componentId: null,
      result: null,
    }),

  clearScannedBarcodeData: () =>
    set({
      scannedBarcodeMeal: null,
      scannedIngredients: [],
    }),

  reset: () =>
    set({
      imageUri: null,
      imageBase64: null,
      componentId: null,
      result: null,
      scannedBarcodeMeal: null,
      scannedIngredients: [],
    }),
}))
