"use client"

import { useState, useEffect } from "react"
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  TextInput,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { auth } from "../../firebase"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from "react-native-reanimated"
import PlateChart from "../meal/PlateChart"
import CustomMealBuilder, { type CustomMeal } from "../meal/customMealBuilder"
import type { MealData, Ingredient } from "@/types/mealTypes"
import { saveMealToFirestore } from "@/services/mealService"
import { API_URL } from "@/config"

type NutritionData = {
  product_name?: string
  brands?: string
  image_url?: string
  nutriments?: {
    "energy-kcal"?: number
    proteins?: number
    carbohydrates?: number
    fat?: number
    sugars?: number
    fiber?: number
    salt?: number
  }
  nutrient_levels?: {
    fat?: string
    salt?: string
    sugars?: string
    saturated_fat?: string
  }
}

type Props = {
  isVisible: boolean
  onClose: () => void
  onImageSelected: (imageUri: string, base64: string) => void
  barcodeAttachment?: string
  apiUrl?: string // Backend API URL
  onSaveMeal?: (mealData: MealData) => Promise<void>
}

export default function UploadPickerModal({
  isVisible,
  onClose,
  onImageSelected,
  barcodeAttachment,
  apiUrl = `${API_URL}`, // Default to localhost for development
  onSaveMeal,
}: Props) {
  const router = useRouter()
  const [scanning, setScanning] = useState(false)
  const [scanningMode, setScanningMode] = useState<"camera" | "gallery" | "attachment" | "api" | null>(null)
  const [productData, setProductData] = useState<NutritionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [mealData, setMealData] = useState<MealData | null>(null)
  const [originalMealData, setOriginalMealData] = useState<MealData | null>(null)
  const [portionSize, setPortionSize] = useState("100")
  const [portionUnit, setPortionUnit] = useState("גרם")
  const [showIngredients, setShowIngredients] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [showCustomMealBuilder, setShowCustomMealBuilder] = useState(false)

  // Animation values
  const cardScale = useSharedValue(1)
  const nutritionOpacity = useSharedValue(0)
  const nutritionScale = useSharedValue(0.8)
  const ingredientsPanelHeight = useSharedValue(0)

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }))

  const nutritionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nutritionOpacity.value,
    transform: [{ scale: nutritionScale.value }],
  }))

  const ingredientsPanelStyle = useAnimatedStyle(() => ({
    height: ingredientsPanelHeight.value,
    opacity: withTiming(showIngredients ? 1 : 0, { duration: 300 }),
  }))

  // Process barcode attachment if provided
  useEffect(() => {
    if (barcodeAttachment && isVisible) {
      setScanning(true)
      setScanningMode("attachment")
      setProductData(null)
      setError(null)
      handleBarcodeWithBackendAPI(barcodeAttachment)
    }
  }, [barcodeAttachment, isVisible])

  // Show nutrition indicators with animation when results are available
  useEffect(() => {
    if (productData && productData.nutriments) {
      nutritionOpacity.value = withTiming(1, { duration: 800 })
      nutritionScale.value = withSpring(1, { damping: 12 })

      // Create meal data from product data
      const newMealData: MealData = {
        name: productData.product_name || "מוצר מסריקת ברקוד",
        calories: productData.nutriments["energy-kcal"] || 0,
        protein_g: productData.nutriments.proteins || 0,
        carbs_g: productData.nutriments.carbohydrates || 0,
        fat_g: productData.nutriments.fat || 0,
        image_url: productData.image_url,
        brand: productData.brands,
        portion_size: 100,
        portion_unit: "גרם",
      }

      // Store both the original and current meal data
      setOriginalMealData(newMealData)
      setMealData(newMealData)
    }
  }, [productData])

  // Handle ingredients panel animation
  useEffect(() => {
    if (showIngredients) {
      ingredientsPanelHeight.value = withSpring(Math.min(ingredients.length * 60 + 60, 260), { damping: 20 })
    } else {
      ingredientsPanelHeight.value = withTiming(0, { duration: 300 })
    }
  }, [showIngredients, ingredients.length])

  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync()
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!cameraStatus.granted || !mediaStatus.granted) {
      Alert.alert("דרושה הרשאה לגשת למצלמה ולגלריה")
      return false
    }

    return true
  }

  const handleTakePhoto = async () => {
    const user = auth.currentUser
    if (!user) {
      router.push("/purchase")
      return
    }

    const hasPermission = await requestPermissions()
    if (!hasPermission) return
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      if (onImageSelected) onImageSelected(asset.uri, asset.base64!)
      router.replace("/(tabs)/home")
    }
  }

  const handlePickFromGallery = async () => {
    const user = auth.currentUser
    if (!user) {
      router.push("/purchase")
      return
    }

    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      if (onImageSelected) onImageSelected(asset.uri, asset.base64!)
      router.replace("/(tabs)/home")
    }
  }

  const handleBarcodeScan = async (mode: "camera" | "gallery") => {
    const user = auth.currentUser
    if (!user) {
      router.push("/purchase")
      return
    }

    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    setScanning(true)
    setScanningMode(mode)
    setProductData(null)
    setError(null)

    try {
      let result
      if (mode === "camera") {
        result = await ImagePicker.launchCameraAsync({
          base64: false,
          quality: 1.0,
        })
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          base64: false,
          quality: 1.0,
        })
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        await handleBarcodeWithBackendAPI(asset.uri)
      } else {
        setScanning(false)
        setScanningMode(null)
      }
    } catch (err) {
      console.error("Error scanning barcode:", err)
      setError("אירעה שגיאה בסריקת הברקוד")
      setScanning(false)
      setScanningMode(null)
    }
  }

  const handleBarcodeWithBackendAPI = async (imageUri: string) => {
    try {
      setLoading(true)

      // Create form data for the image
      const formData = new FormData()

      // Get file name and type from URI
      const uriParts = imageUri.split(".")
      const fileType = uriParts[uriParts.length - 1]

      // Create file object for form data
      const fileObject: any = {
        uri: imageUri,
        name: `barcode.${fileType}`,
        type: `image/${fileType}`,
      }

      formData.append("image", fileObject)

      // Send to backend API
      const response = await fetch(`${apiUrl}/barcode`, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to detect barcode")
      }

      if (data.barcodes && data.barcodes.length > 0) {
        const barcode = data.barcodes[0]
        console.log("Detected barcode:", barcode)
        await fetchProductData(barcode)
      } else {
        setError("לא נמצא ברקוד בתמונה")
        setLoading(false)
      }
    } catch (err) {
      console.error("Error processing barcode with API:", err)
      setError(`אירעה שגיאה בעיבוד הברקוד: ${err instanceof Error ? err.message : "Unknown error"}`)
      setLoading(false)
    }
  }

  const handleUploadBarcodeImage = async () => {
    const user = auth.currentUser
    if (!user) {
      router.push("/purchase")
      return
    }

    const hasPermission = await requestPermissions()
    if (!hasPermission) return

    setScanning(true)
    setScanningMode("api")
    setProductData(null)
    setError(null)

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1.0,
        allowsEditing: false,
      })

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0]
        await handleBarcodeWithBackendAPI(asset.uri)
      } else {
        setScanning(false)
        setScanningMode(null)
      }
    } catch (err) {
      console.error("Error uploading barcode image:", err)
      setError("אירעה שגיאה בהעלאת תמונת הברקוד")
      setScanning(false)
      setScanningMode(null)
    }
  }

  const fetchProductData = async (barcode: string) => {
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`)
      const data = await response.json()

      if (data.status === 1) {
        setProductData(data.product)

        // Create ingredients from product data if available
        if (data.product.ingredients_tags && data.product.ingredients_tags.length > 0) {
          const formattedIngredients = data.product.ingredients_tags.map((tag: string, index: number) => {
            // Clean up the ingredient name from the tag
            const name = tag.replace(/^en:/, "").replace(/-/g, " ")

            return {
              id: `ingredient-${index}`,
              name: name,
              amount: 0, // We don't have exact amounts from the API
              unit: "גרם",
            }
          })

          setIngredients(formattedIngredients)
        }
      } else {
        setError("המוצר לא נמצא במאגר")
      }
    } catch (err) {
      console.error("Error fetching product data:", err)
      setError("אירעה שגיאה בטעינת נתוני המוצר")
    } finally {
      setLoading(false)
    }
  }

  const handleEditMeal = () => {
    setEditMode(true)
    cardScale.value = withSpring(1.02, { damping: 15 })
  }

  const handleSaveMealData = async (mealData: MealData) => {
    if (!mealData) return

    try {
      console.log("Saving meal data:", JSON.stringify(mealData))

      if (onSaveMeal) {
        console.log("Using provided onSaveMeal function")
        await onSaveMeal(mealData)
      } else {
        console.log("No onSaveMeal provided, saving directly to Firestore")
        await saveMealToFirestore(mealData)
      }

      Alert.alert("נשמר בהצלחה", "הארוחה נוספה ליומן שלך")
      onClose()
      router.replace("/(tabs)/home")
    } catch (err) {
      console.error("Error saving meal:", err)
      Alert.alert("שגיאה", "אירעה שגיאה בשמירת הארוחה")
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
    cardScale.value = withSpring(1, { damping: 15 })
  }

  const updateNutritionValues = () => {
    if (!originalMealData) return

    // Calculate adjusted values based on portion size
    const portionRatio = Number.parseFloat(portionSize) / 100
    const updatedMealData: MealData = {
      ...originalMealData,
      calories: Math.round(originalMealData.calories * portionRatio),
      protein_g: Number.parseFloat((originalMealData.protein_g * portionRatio).toFixed(1)),
      carbs_g: Number.parseFloat((originalMealData.carbs_g * portionRatio).toFixed(1)),
      fat_g: Number.parseFloat((originalMealData.fat_g * portionRatio).toFixed(1)),
      portion_size: Number.parseFloat(portionSize),
      portion_unit: portionUnit,
    }

    setMealData(updatedMealData)
  }

  const toggleIngredientsPanel = () => {
    setShowIngredients(!showIngredients)
  }

  const updateIngredientAmount = (id: string, amount: string) => {
    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount)) return

    const updatedIngredients = ingredients.map((ing) => (ing.id === id ? { ...ing, amount: numAmount } : ing))
    setIngredients(updatedIngredients)
  }

  const resetScan = () => {
    setScanning(false)
    setScanningMode(null)
    setProductData(null)
    setError(null)
    setEditMode(false)
    setMealData(null)
    setOriginalMealData(null)
    setPortionSize("100")
    setPortionUnit("גרם")
    setShowIngredients(false)
    setIngredients([])
  }

  const handleCustomMealBuilder = () => {
    setShowCustomMealBuilder(true)
  }

  const handleCustomMealSave = async (meal: CustomMeal) => {
    try {
      console.log("handleCustomMealSave called with meal:", JSON.stringify(meal))

      // Convert the custom meal to MealData format
      const mappedIngredients = meal.ingredients.map((ing) => ({
        id: ing.id,
        name: ing.name,
        amount: ing.quantity,
        unit: ing.unit,
        calories: ing.calories,
        protein_g: ing.protein_g,
        carbs_g: ing.carbs_g,
        fat_g: ing.fat_g,
      }))

      const mealData: MealData = {
        name: meal.name,
        calories: meal.totalNutrition.calories,
        protein_g: meal.totalNutrition.protein_g,
        carbs_g: meal.totalNutrition.carbs_g,
        fat_g: meal.totalNutrition.fat_g,
        ingredients: mappedIngredients,
      }

      console.log("Converted to MealData format:", JSON.stringify(mealData))

      // Save the meal using the provided onSaveMeal function or directly to Firestore
      if (onSaveMeal) {
        console.log("Using provided onSaveMeal function")
        await onSaveMeal(mealData)
      } else {
        console.log("No onSaveMeal provided, saving directly to Firestore")
        await saveMealToFirestore(mealData)
      }

      Alert.alert("נשמר בהצלחה", "הארוחה נוספה ליומן שלך")
      setShowCustomMealBuilder(false)
      onClose()
    } catch (error) {
      console.error("Error saving custom meal:", error)
      Alert.alert("שגיאה", `אירעה שגיאה בשמירת המנה: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const renderBarcodeScanner = () => {
    return (
      <View style={styles.scannerContainer}>
        <Text style={styles.scannerTitle}>
          {scanningMode === "api"
            ? "מעבד תמונת ברקוד"
            : scanningMode === "attachment"
              ? "מעבד קובץ ברקוד"
              : scanningMode === "camera"
                ? "צלם את הברקוד"
                : "בחר תמונה עם ברקוד"}
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.loadingText}>מעבד את הברקוד...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.button} onPress={resetScan}>
              <Text style={styles.buttonText}>נסה שוב</Text>
            </TouchableOpacity>
          </View>
        ) : productData && mealData ? (
          <Animated.View style={[styles.productContainer, cardAnimatedStyle]}>
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.productTitle}>{productData.product_name || "מוצר לא ידוע"}</Text>
              {productData.brands && <Text style={styles.productBrand}>{productData.brands}</Text>}

              {productData.image_url && <Image source={{ uri: productData.image_url }} style={styles.productImage} />}

              {/* Nutrition Information */}
              <Animated.View style={[styles.nutritionContainer, nutritionAnimatedStyle]}>
                {!editMode ? (
                  <>
                    <View style={styles.nutritionHeader}>
                      <Text style={styles.nutritionTitle}>ערכים תזונתיים:</Text>
                      <TouchableOpacity style={styles.editButton} onPress={handleEditMeal}>
                        <Ionicons name="pencil" size={16} color="#fff" />
                        <Text style={styles.editButtonText}>ערוך</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.caloriesBadge}>
                      <Text style={styles.caloriesValue}>{mealData.calories}</Text>
                      <Text style={styles.caloriesLabel}>קלוריות</Text>
                    </View>

                    <View style={styles.macrosContainer}>
                      <View style={[styles.macroIndicator, styles.proteinIndicator]}>
                        <Ionicons name="fitness" size={18} color="#fff" />
                        <Text style={styles.macroValue}>{mealData.protein_g}g</Text>
                        <Text style={styles.macroLabel}>חלבון</Text>
                      </View>

                      <View style={[styles.macroIndicator, styles.carbsIndicator]}>
                        <Ionicons name="leaf" size={18} color="#fff" />
                        <Text style={styles.macroValue}>{mealData.carbs_g}g</Text>
                        <Text style={styles.macroLabel}>פחמימות</Text>
                      </View>

                      <View style={[styles.macroIndicator, styles.fatIndicator]}>
                        <Ionicons name="water" size={18} color="#fff" />
                        <Text style={styles.macroValue}>{mealData.fat_g}g</Text>
                        <Text style={styles.macroLabel}>שומן</Text>
                      </View>
                    </View>

                    {/* Plate Chart */}
                    <View style={styles.chartContainer}>
                      <PlateChart
                        carbs={mealData.carbs_g}
                        protein={mealData.protein_g}
                        fat={mealData.fat_g}
                        totalCalories={mealData.calories}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.nutritionHeader}>
                      <Text style={styles.nutritionTitle}>עריכת ערכים תזונתיים:</Text>
                      <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                        <Ionicons name="close" size={16} color="#64748b" />
                        <Text style={styles.cancelButtonText}>ביטול</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.portionContainer}>
                      <Text style={styles.portionLabel}>גודל מנה:</Text>
                      <View style={styles.portionInputContainer}>
                        <TextInput
                          style={styles.portionInput}
                          value={portionSize}
                          onChangeText={setPortionSize}
                          keyboardType="numeric"
                          maxLength={4}
                        />
                        <Text style={styles.portionUnit}>{portionUnit}</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.updateButton} onPress={updateNutritionValues}>
                      <Text style={styles.updateButtonText}>חשב מחדש</Text>
                    </TouchableOpacity>

                    <View style={styles.nutritionValues}>
                      <View style={styles.nutritionValue}>
                        <Text style={styles.nutritionValueLabel}>קלוריות:</Text>
                        <Text style={styles.nutritionValueNumber}>{mealData.calories}</Text>
                      </View>
                      <View style={styles.nutritionValue}>
                        <Text style={styles.nutritionValueLabel}>חלבון:</Text>
                        <Text style={styles.nutritionValueNumber}>{mealData.protein_g}g</Text>
                      </View>
                      <View style={styles.nutritionValue}>
                        <Text style={styles.nutritionValueLabel}>פחמימות:</Text>
                        <Text style={styles.nutritionValueNumber}>{mealData.carbs_g}g</Text>
                      </View>
                      <View style={styles.nutritionValue}>
                        <Text style={styles.nutritionValueLabel}>שומן:</Text>
                        <Text style={styles.nutritionValueNumber}>{mealData.fat_g}g</Text>
                      </View>
                    </View>
                  </>
                )}
              </Animated.View>

              {/* Ingredients Panel Toggle Button */}
              <TouchableOpacity style={styles.ingredientsToggle} onPress={toggleIngredientsPanel}>
                <Text style={styles.ingredientsToggleText}>{showIngredients ? "הסתר רכיבים" : "הצג רכיבים שזוהו"}</Text>
                <Ionicons name={showIngredients ? "chevron-up" : "chevron-down"} size={18} color="#66bb6a" />
              </TouchableOpacity>

              {/* Ingredients Panel */}
              <Animated.View style={[styles.ingredientsPanel, ingredientsPanelStyle]}>
                <ScrollView
                  style={styles.ingredientsList}
                  contentContainerStyle={styles.ingredientsListContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
                  {ingredients.length > 0 ? (
                    ingredients.map((ingredient) => (
                      <View key={ingredient.id} style={styles.ingredientItem}>
                        <View style={styles.ingredientNameContainer}>
                          <Ionicons name="nutrition-outline" size={16} color="#66bb6a" />
                          <Text style={styles.ingredientName}>{ingredient.name}</Text>
                        </View>
                        {editMode && (
                          <View style={styles.ingredientAmountContainer}>
                            <TextInput
                              style={styles.ingredientAmountInput}
                              defaultValue={ingredient.amount.toString()}
                              keyboardType="numeric"
                              onChangeText={(text) => updateIngredientAmount(ingredient.id, text)}
                              onBlur={() => {}}
                              textAlign="center"
                            />
                            <Text style={styles.ingredientUnit}>{ingredient.unit}</Text>
                          </View>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noIngredientsText}>לא נמצאו רכיבים</Text>
                  )}
                </ScrollView>
              </Animated.View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={() => mealData && handleSaveMealData(mealData)}>
                  <Text style={styles.saveButtonText}>הוסף ליומן</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={resetScan}>
                  <Text style={styles.cancelButtonText}>בטל</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        ) : (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              {scanningMode === "camera" ? "צלם את הברקוד על המוצר" : "בחר תמונה שמכילה ברקוד ברור"}
            </Text>
            <TouchableOpacity style={styles.button} onPress={resetScan}>
              <Text style={styles.buttonText}>חזור לתפריט</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  return (
    <Modal animationType="slide" transparent visible={isVisible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {showCustomMealBuilder ? (
          <View style={styles.customMealContainer}>
            <CustomMealBuilder onSaveMeal={handleCustomMealSave} onCancel={() => setShowCustomMealBuilder(false)} />
          </View>
        ) : scanning ? (
          renderBarcodeScanner()
        ) : (
          <View style={styles.modalCard}>
            <Text style={styles.title}>בחר פעולה</Text>

            <TouchableOpacity onPress={handleTakePhoto} style={styles.action}>
              <Text style={styles.actionText}>📸 צלם תמונה של מזון</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePickFromGallery} style={styles.action}>
              <Text style={styles.actionText}>🖼️ בחר תמונת מזון מהגלריה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleBarcodeScan("camera")} style={styles.action}>
              <Text style={styles.actionText}>🔍 סרוק ברקוד עם המצלמה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleBarcodeScan("gallery")} style={styles.action}>
              <Text style={styles.actionText}>🏷️ סרוק ברקוד מתמונה בגלריה</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCustomMealBuilder} style={styles.action}>
              <Text style={styles.actionText}>🍽️ הכן בעצמך</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.actionText, { marginTop: 10, color: "#999" }]}>ביטול</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "80%",
    padding: 20,
    elevation: 10,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  action: {
    width: "100%",
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 16,
    textAlign: "center",
    color: "#333",
  },
  scannerContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "90%",
    padding: 20,
    elevation: 10,
    maxHeight: "90%",
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#e11d48",
    marginBottom: 20,
    textAlign: "center",
  },
  productContainer: {
    maxHeight: 500,
  },
  productTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  productBrand: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
  },
  productImage: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
    marginBottom: 16,
    borderRadius: 8,
  },
  nutritionContainer: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  nutritionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "right",
  },
  nutritionItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
    textAlign: "right",
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#66bb6a",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#66bb6a",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  instructionsContainer: {
    alignItems: "center",
    padding: 20,
  },
  instructionsText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  // Nutrition overlay styles
  caloriesBadge: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#31333d",
  },
  caloriesLabel: {
    fontSize: 14,
    color: "#31333d",
    fontWeight: "600",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  macroIndicator: {
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  proteinIndicator: {
    backgroundColor: "rgba(233, 88, 153, 0.85)",
  },
  carbsIndicator: {
    backgroundColor: "rgba(50, 203, 198, 0.85)",
  },
  fatIndicator: {
    backgroundColor: "rgba(252, 158, 127, 0.85)",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  macroLabel: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
    width: "100%",
    height: "auto",
    overflow: "visible",
  },
  // Edit mode styles
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#66bb6a",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  portionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
    backgroundColor: "#f0f9ff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  portionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0891b2",
  },
  portionInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  portionInput: {
    width: 60,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  portionUnit: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 8,
    marginLeft: 8,
  },
  updateButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 10,
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  nutritionValues: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  nutritionValue: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  nutritionValueLabel: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  nutritionValueNumber: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  // Ingredients panel styles
  ingredientsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 8,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  ingredientsToggleText: {
    color: "#0891b2",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 6,
  },
  ingredientsPanel: {
    overflow: "hidden",
    marginTop: 8,
  },
  ingredientsList: {
    maxHeight: 200,
  },
  ingredientsListContent: {
    paddingVertical: 8,
  },
  ingredientItem: {
    flexDirection: "row-reverse", // RTL layout
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  ingredientNameContainer: {
    flexDirection: "row-reverse", // RTL layout
    alignItems: "center",
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    marginRight: 8,
    textAlign: "right",
  },
  ingredientAmountContainer: {
    flexDirection: "row-reverse", // RTL layout
    alignItems: "center",
  },
  ingredientAmountInput: {
    width: 50,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 4,
    fontSize: 14,
    color: "#334155",
  },
  ingredientUnit: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 4,
    marginLeft: 8,
  },
  noIngredientsText: {
    textAlign: "center",
    color: "#64748b",
    padding: 20,
  },
  customMealContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "95%",
    height: "95%", // Add explicit height
    padding: 16,
    elevation: 10,
  },
})
