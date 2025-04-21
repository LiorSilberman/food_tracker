"use client"

import { useState, useEffect } from "react"
import { Modal, View, StyleSheet, Alert, SafeAreaView, Dimensions, Platform } from "react-native"
import { useRouter } from "expo-router"

import ActionList from "./ActionList"
import BarcodeScanner from "./BarcodeScanner"
import type { Ingredient } from "./IngredientsPanel"
import CustomMealBuilder, { type CustomMeal } from "../meal/customMealBuilder"
import { requestPermissions, launchCamera, launchGallery } from "@/utils/imagePicker"
import { scanBarcodeWithAPI, fetchProductFromOpenFoodFacts } from "@/services/barcodeService"
import { saveMealToFirestoreAndSQLite } from "@/services/mealService"
import type { MealData } from "@/types/mealTypes"

export type UploadPickerModalProps = {
  isVisible: boolean
  onClose: () => void
  onImageSelected?: (uri: string, base64: string) => void
  barcodeAttachment?: string
  apiUrl?: string
  onSaveMeal?: (mealData: MealData) => void
  onBarcodeScanned?: (mealData: MealData, ingredients: Ingredient[]) => void
}

export default function UploadPickerModal({
  isVisible,
  onClose,
  onImageSelected,
  barcodeAttachment,
  apiUrl = "",
  onSaveMeal,
  onBarcodeScanned,
}: UploadPickerModalProps) {
  const router = useRouter()

  const [mode, setMode] = useState<"action" | "scan" | "view" | "custom">("action")
  const [scanningMode, setScanningMode] = useState<"camera" | "gallery" | "attachment" | "api" | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [productData, setProductData] = useState<any>(null)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [originalMealData, setOriginalMealData] = useState<MealData | null>(null)
  const [mealData, setMealData] = useState<MealData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showCustomBuilder, setShowCustomBuilder] = useState(false)

  // ⚠️ Effect: trigger scanned data callback
  useEffect(() => {
    if (mode === "view" && mealData && onBarcodeScanned) {
      onBarcodeScanned(mealData, ingredients)
      onClose()
    }
  }, [mode, mealData, onBarcodeScanned])

  useEffect(() => {
    if (barcodeAttachment && isVisible) startScan("attachment")
  }, [barcodeAttachment, isVisible])

  useEffect(() => {
    if (!isVisible) {
      // Modal was closed – reset everything
      setTimeout(() => {
        setMode("action")
        setScanningMode(null)
        setLoading(false)
        setError(null)
        setProductData(null)
        setMealData(null)
        setOriginalMealData(null)
        setIngredients([])
        setEditMode(false)
        setShowCustomBuilder(false)
      }, 100) // Slight delay to avoid race conditions
    }
  }, [isVisible])

  const resetToAction = () => {
    setMode("action")
    setScanningMode(null)
    setLoading(false)
    setError(null)
    setProductData(null)
    setMealData(null)
    setOriginalMealData(null)
    setIngredients([])
    setEditMode(false)
  }

  // Update the startScan function to handle barcode not found errors better
  const startScan = async (modeKey: "camera" | "gallery" | "attachment" | "api") => {
    console.log("Scanning mode:", modeKey)
    if (modeKey === "camera" || modeKey === "gallery") {
      const granted = await requestPermissions()
      if (!granted) return
    }
    setMode("scan")
    setScanningMode(modeKey)
    setLoading(true)
    setError(null)

    try {
      let uri: string | undefined
      if (modeKey === "camera") {
        const res = await launchCamera({ base64: false, quality: 1.0 })
        if (res.canceled) throw new Error("cancelled")
        uri = res.assets[0].uri
      } else if (modeKey === "gallery") {
        const res = await launchGallery({ base64: false, quality: 0.7 })
        if (res.canceled) throw new Error("cancelled")
        uri = res.assets[0].uri
      } else {
        uri = barcodeAttachment!
      }

      const { barcodes } = await scanBarcodeWithAPI(uri!)

      // Check if any barcodes were detected
      if (!barcodes || barcodes.length === 0) {
        Alert.alert("לא נמצא ברקוד", "לא זוהה ברקוד בתמונה. אנא נסה שוב עם תמונה ברורה יותר.", [
          { text: "אישור", style: "default" },
        ])
        throw new Error("no_barcode_detected")
      }

      // Alert the user when a barcode is detected
      Alert.alert("ברקוד זוהה", `ברקוד מספר ${barcodes[0]} זוהה בהצלחה`, [{ text: "אישור", style: "default" }])

      try {
        const product = await fetchProductFromOpenFoodFacts(barcodes[0])

        // Check if product data was found
        if (!product || !product.product_name) {
          Alert.alert("מוצר לא נמצא", "המוצר לא נמצא במאגר. נסה מוצר אחר או הוסף ארוחה מותאמת אישית.", [
            { text: "אישור", style: "default" },
          ])
          throw new Error("product_not_found")
        }

        setProductData(product)

        if (product.ingredients_tags) {
          setIngredients(
            product.ingredients_tags.map((tag: string, i: number) => ({
              id: `ing-${i}`,
              name: tag.replace(/^en:/, "").replace(/-/g, " "),
              amount: 0,
              unit: "גרם",
            })),
          )
        }

        const initial: MealData = {
          name: product.product_name || "מוצר ברקוד",
          calories: product.nutriments?.["energy-kcal"] || 0,
          protein_g: product.nutriments?.proteins || 0,
          carbs_g: product.nutriments?.carbohydrates || 0,
          fat_g: product.nutriments?.fat || 0,
          image_url: product.image_url,
          brand: product.brands,
          portion_size: 100,
          portion_unit: "גרם",
        }

        setOriginalMealData(initial)
        setMealData(initial)
        setMode("view")
      } catch (e) {
        // Handle product fetch errors
        console.error("Error fetching product:", e)
        resetToAction()
      }
    } catch (e: any) {
      if (e.message !== "cancelled" && e.message !== "no_barcode_detected" && e.message !== "product_not_found") {
        setError(e.message)
        Alert.alert("שגיאה", "אירעה שגיאה בסריקת הברקוד. אנא נסה שוב.", [{ text: "אישור", style: "default" }])
      }
      resetToAction()
    } finally {
      setLoading(false)
    }
  }

  const handlePortionChange = (size: string, unit: string) => {
    if (!originalMealData) return
    const ratio = Number.parseFloat(size) / 100
    setMealData({
      ...originalMealData,
      calories: Math.round(originalMealData.calories * ratio),
      protein_g: Number((originalMealData.protein_g * ratio).toFixed(1)),
      carbs_g: Number((originalMealData.carbs_g * ratio).toFixed(1)),
      fat_g: Number((originalMealData.fat_g * ratio).toFixed(1)),
      portion_size: Number.parseFloat(size),
      portion_unit: unit,
    })
  }

  const handleSave = async () => {
    if (!mealData) return
    try {
      if (onSaveMeal) await onSaveMeal(mealData)
      else await saveMealToFirestoreAndSQLite(mealData)
    } finally {
      onClose()
    }
  }

  const handleCustomSave = async (meal: CustomMeal) => {
    const mapped = meal.ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      amount: ing.quantity,
      unit: ing.unit,
      calories: ing.calories,
      protein_g: ing.protein_g,
      carbs_g: ing.carbs_g,
      fat_g: ing.fat_g,
    }))
    const customData: MealData = {
      name: meal.name,
      calories: meal.totalNutrition.calories,
      protein_g: meal.totalNutrition.protein_g,
      carbs_g: meal.totalNutrition.carbs_g,
      fat_g: meal.totalNutrition.fat_g,
      ingredients: mapped,
    }
    try {
      if (onSaveMeal) await onSaveMeal(customData)
      else await saveMealToFirestoreAndSQLite(customData)
    } finally {
      setShowCustomBuilder(false)
      onClose()
    }
  }

  return (
    <Modal transparent animationType="slide" visible={isVisible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {!isVisible ? null : showCustomBuilder ? (
          <SafeAreaView style={styles.customBuilderContainer}>
            <View style={styles.customBuilderWrapper}>
              <CustomMealBuilder onSaveMeal={handleCustomSave} onClose={() => setShowCustomBuilder(false)} />
            </View>
          </SafeAreaView>
        ) : mode === "scan" ? (
          <BarcodeScanner
            scanningMode={scanningMode!}
            loading={loading}
            error={error}
            onRetry={() => startScan(scanningMode!)}
            onCancel={resetToAction}
          />
        ) : (
          <ActionList
            onTakePhoto={async () => {
              if (!onImageSelected) return
              const granted = await requestPermissions()
              if (!granted) return
              const res = await launchCamera({ base64: true, quality: 0.7 })
              if (!res.canceled && res.assets[0].base64) {
                onImageSelected(res.assets[0].uri, res.assets[0].base64)
                onClose()
                // Navigate to home after a short delay to ensure modal is closed
                setTimeout(() => {
                  router.replace("/(tabs)/home")
                }, 300)
              }
              if (res.canceled) {
                onClose()
                setTimeout(() => {
                  router.replace("/(tabs)/home")
                }, 100)
              } 
            }}
            onPickFromGallery={async () => {
              if (!onImageSelected) return
              const granted = await requestPermissions()
              if (!granted) return

              const res = await launchGallery({ base64: true, quality: 0.7 })
  
              if (!res.canceled && res.assets[0].base64) {
                onImageSelected(res.assets[0].uri, res.assets[0].base64)
                onClose()
                // Navigate to home after a short delay to ensure modal is closed
                setTimeout(() => {
                  router.replace("/home")
                }, 300)
              }
              
              if (res.canceled) {
                onClose()
                setTimeout(() => {
                  router.replace("/(tabs)/home")
                }, 100)
              } 

            }}
            onScanWithCamera={() => startScan("camera")}
            onScanFromGallery={() => startScan("gallery")}
            onCustomMeal={() => setShowCustomBuilder(true)}
            onClose={onClose}
          />
        )}
      </View>
    </Modal>
  )
}

const { width, height } = Dimensions.get("window")
const isIOS = Platform.OS === "ios"

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  customBuilderContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  customBuilderWrapper: {
    width: width > 500 ? 500 : width * 0.95,
    height: height * 0.9,
    maxHeight: height * 0.95,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  viewContainer: {
    width: "90%",
    maxHeight: "90%",
  },
})
