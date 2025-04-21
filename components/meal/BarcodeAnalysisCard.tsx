"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import type { Ingredient, MealData } from "@/types/mealTypes"

// Get screen dimensions for consistent width
const { width } = Dimensions.get("window")

export type Props = {
  meal: MealData
  ingredients: Ingredient[]
  onSave: (mealData: MealData) => Promise<void>
  onDismiss: () => void
  image?: string
  result?: { calories: number; carbs_g: number; protein_g: number; fat_g: number } | null
  onResult?: React.Dispatch<
    React.SetStateAction<{ calories: number; carbs_g: number; protein_g: number; fat_g: number } | null>
  >
}

// Define nutrition fields type for type safety
type NutritionField = "calories" | "protein_g" | "carbs_g" | "fat_g"

// Define icon names type for MaterialCommunityIcons
type IconName = "fire" | "food-steak" | "bread-slice" | "oil"

export default function BarcodeAnalysisCard({ meal, ingredients, onSave, onDismiss, image, result, onResult }: Props) {
  // Store original nutrition values per 100g for calculations
  const originalValues = useRef({
    calories: meal.calories,
    protein_g: meal.protein_g,
    carbs_g: meal.carbs_g,
    fat_g: meal.fat_g,
    portion_size: meal.portion_size || 100,
  })

  // Create a copy of the meal data that can be edited
  const [editedMeal, setEditedMeal] = useState<MealData>({ ...meal })
  const [isCalculating, setIsCalculating] = useState(false)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [portionInputValue, setPortionInputValue] = useState(editedMeal.portion_size?.toString() || "100")
  const [isEditingPortion, setIsEditingPortion] = useState(false)

  // Properly type the nutritionAnims object
  const [nutritionAnims] = useState<Record<NutritionField, Animated.Value>>({
    calories: new Animated.Value(1),
    protein_g: new Animated.Value(1),
    carbs_g: new Animated.Value(1),
    fat_g: new Animated.Value(1),
  })

  // Animation when component mounts
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  // Calculate nutrition values based on portion size
  const recalculateNutrition = (newPortionSize: number) => {
    setIsCalculating(true)

    // Short delay to show calculation is happening
    setTimeout(() => {
      const ratio = newPortionSize / originalValues.current.portion_size

      const newValues = {
        calories: Math.round(originalValues.current.calories * ratio),
        protein_g: Number.parseFloat((originalValues.current.protein_g * ratio).toFixed(1)),
        carbs_g: Number.parseFloat((originalValues.current.carbs_g * ratio).toFixed(1)),
        fat_g: Number.parseFloat((originalValues.current.fat_g * ratio).toFixed(1)),
      }

      setEditedMeal((prev) => ({
        ...prev,
        ...newValues,
        portion_size: newPortionSize,
      }))

      // Animate the nutrition values changing
      Object.keys(nutritionAnims).forEach((key) => {
        const nutritionKey = key as NutritionField
        Animated.sequence([
          Animated.timing(nutritionAnims[nutritionKey], {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(nutritionAnims[nutritionKey], {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start()
      })

      setIsCalculating(false)

      // If onResult is provided, call it with the updated values
      if (onResult) {
        onResult({
          calories: newValues.calories,
          protein_g: newValues.protein_g,
          carbs_g: newValues.carbs_g,
          fat_g: newValues.fat_g,
        })
      }
    }, 300)
  }

  const handleSave = async () => {
    try {
      await onSave(editedMeal)
      Alert.alert("נשמר בהצלחה", "הארוחה נוספה ליומן שלך")
      onDismiss()
    } catch (err) {
      Alert.alert("שגיאה", "אירעה שגיאה בשמירה")
    }
  }

  const handleDelete = () => {
    Alert.alert("מחיקת ארוחה", "האם אתה בטוח שברצונך למחוק את הארוחה?", [
      { text: "ביטול", style: "cancel" },
      { text: "מחק", style: "destructive", onPress: onDismiss },
    ])
  }

  // Just update the input value without triggering calculation
  const handlePortionInputChange = (text: string) => {
    setPortionInputValue(text)
  }

  // Calculate only when the user explicitly requests it or finishes editing
  const handleCalculateNutrition = () => {
    const newSize = Number.parseFloat(portionInputValue) || originalValues.current.portion_size
    recalculateNutrition(newSize)
    setIsEditingPortion(false)
  }

  const NutritionItem = ({
    label,
    value,
    field,
    unit = "g",
    icon,
    color,
  }: {
    label: string
    value: number
    field: NutritionField
    unit?: string
    icon: IconName
    color: string
  }) => {
    return (
      <View style={styles.nutritionItem}>
        <View style={[styles.iconContainer, { backgroundColor: color }]}>
          <MaterialCommunityIcons name={icon} size={20} color="#fff" />
        </View>

        <View style={styles.nutritionContent}>
          <Text style={styles.nutritionLabel}>{label}</Text>
          <Animated.Text style={[styles.nutritionValue, { transform: [{ scale: nutritionAnims[field] }] }]}>
            {value} {unit !== "cal" ? unit : ""}
          </Animated.Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <LinearGradient colors={["#ffffff", "#f8fafc"]} style={styles.cardContent}>
        {/* Header with product name and brand */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{editedMeal.name}</Text>
            {editedMeal.brand && <Text style={styles.brand}>{editedMeal.brand}</Text>}
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Product image and portion size */}
        <View style={styles.productSection}>
          {editedMeal.image_url ? (
            <Image source={{ uri: editedMeal.image_url }} style={styles.image} />
          ) : image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="fast-food-outline" size={40} color="#cbd5e1" />
            </View>
          )}

          <View style={styles.portionContainer}>
            <View style={styles.portionHeader}>
              <Text style={styles.portionTitle}>מנה</Text>
              {isCalculating && <ActivityIndicator size="small" color="#0ea5e9" style={styles.calculator} />}
              <TouchableOpacity style={styles.editPortionButton} onPress={() => setIsEditingPortion(!isEditingPortion)}>
                <Ionicons
                  name={isEditingPortion ? "checkmark-circle" : "pencil"}
                  size={18}
                  color={isEditingPortion ? "#10b981" : "#64748b"}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.portionValue}>
              <View style={styles.portionInputContainer}>
                <TextInput
                  style={[styles.portionInput, isEditingPortion && styles.portionInputActive]}
                  value={portionInputValue}
                  onChangeText={handlePortionInputChange}
                  keyboardType="numeric"
                  selectTextOnFocus
                  editable={isEditingPortion}
                />
                <Text style={styles.portionUnit}>{editedMeal.portion_unit || "גרם"}</Text>
              </View>
            </View>
            {isEditingPortion && (
              <TouchableOpacity style={styles.calculateButton} onPress={handleCalculateNutrition} activeOpacity={0.7}>
                <Text style={styles.calculateButtonText}>חשב</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nutrition section */}
        <View style={styles.nutritionSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ערכים תזונתיים</Text>
          </View>

          <View style={styles.nutritionGrid}>
            <NutritionItem
              label="קלוריות"
              value={editedMeal.calories}
              field="calories"
              unit="cal"
              icon="fire"
              color="#ef4444"
            />
            <NutritionItem
              label="חלבון"
              value={editedMeal.protein_g}
              field="protein_g"
              icon="food-steak"
              color="#8b5cf6"
            />
            <NutritionItem
              label="פחמימות"
              value={editedMeal.carbs_g}
              field="carbs_g"
              icon="bread-slice"
              color="#f59e0b"
            />
            <NutritionItem label="שומן" value={editedMeal.fat_g} field="fat_g" icon="oil" color="#ec4899" />
          </View>
        </View>

        {/* Ingredients section */}
        {ingredients.length > 0 && (
          <View style={styles.ingredientsSection}>
            <Text style={styles.ingredientsTitle}>רכיבים:</Text>
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredientItem}>
                  <Text style={styles.ingredientText}>{ingredient.name}</Text>
                  <View style={styles.ingredientDot} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveText}>שמור ליומן</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
            <LinearGradient
              colors={["#f43f5e", "#e11d48"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: width > 500 ? 500 : width, 
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 60,
  },
  cardContent: {
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "right",
  },
  brand: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  productSection: {
    flexDirection: "row",
    marginBottom: 24,
    alignItems: "center",
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 16,
  },
  imagePlaceholder: {
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  portionContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  portionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  portionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  editPortionButton: {
    marginRight: 8,
    padding: 4,
  },
  calculator: {
    marginRight: 8,
  },
  portionValue: {
    backgroundColor: "#f8fafc",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  portionInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  portionInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
    minWidth: 40,
    padding: 0,
  },
  portionInputActive: {
    borderBottomWidth: 1,
    borderBottomColor: "#0ea5e9",
  },
  portionUnit: {
    fontSize: 16,
    color: "#64748b",
    marginLeft: 4,
  },
  calculateButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "center",
  },
  calculateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  calculatorHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
    textAlign: "right",
  },
  nutritionSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  nutritionGrid: {
    gap: 12,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  nutritionContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0f172a",
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  ingredientsSection: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 20,
    marginBottom: 24,
  },
  ingredientsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "right",
  },
  ingredientsList: {
    flexDirection: "column",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  ingredientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0ea5e9",
    marginLeft: 8,
  },
  ingredientText: {
    fontSize: 16,
    color: "#334155",
    textAlign: "right",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  saveButton: {
    flex: 3,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
})
