"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Alert,
  Dimensions,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  withRepeat, // Import withRepeat
} from "react-native-reanimated"
import PlateChart from "./PlateChart"

// Types
export type Ingredient = {
  id: string
  name: string
  brand?: string
  image?: string
  quantity: number
  unit: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  per_100g: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

export type CustomMeal = {
  name: string
  ingredients: Ingredient[]
  totalNutrition: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

type AutocompleteItem = {
  id: string
  name: string
  brand?: string
  image?: string
  serving_size?: string
  serving_quantity?: number
  actual_quantity?: number // Add this field for the actual quantity
  actual_unit?: string // Add this field for the unit
  nutrition?: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

type Props = {
  onSaveMeal?: (meal: CustomMeal) => Promise<void>
  onCancel?: () => void
}

// Unit conversion factors (approximate)
const unitConversions = {
  גרם: 1, // Base unit (grams)
  כוס: 240, // 1 cup ≈ 240g
  כף: 15, // 1 tablespoon ≈ 15g
  כפית: 5, // 1 teaspoon ≈ 5g
  יחידה: 100, // 1 unit (default to 100g)
  ליטר: 1000, // 1 liter ≈ 1000g (for water-based liquids)
  'מ"ל': 1, // 1 ml ≈ 1g (for water-based liquids)
}

export default function CustomMealBuilder({ onSaveMeal, onCancel }: Props) {
  // Add this at the beginning of the component function body
  console.log("Rendering CustomMealBuilder component")
  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AutocompleteItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([])
  const [currentIngredient, setCurrentIngredient] = useState<AutocompleteItem | null>(null)
  const [quantity, setQuantity] = useState("100")
  const [unit, setUnit] = useState("גרם")
  const [isAddingIngredient, setIsAddingIngredient] = useState(false)
  const [mealName, setMealName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)

  // Animation values
  const searchOpacity = useSharedValue(1)
  const addIngredientHeight = useSharedValue(0)
  const ingredientListOpacity = useSharedValue(0)
  const nutritionOpacity = useSharedValue(0)
  const confirmOpacity = useSharedValue(0)
  const loadingOpacity = useSharedValue(0)
  const loadingRotation = useSharedValue(0)

  // Refs
  const searchInputRef = useRef<TextInput>(null)
  const quantityInputRef = useRef<TextInput>(null)
  const mealNameInputRef = useRef<TextInput>(null)

  // Calculate total nutrition
  const totalNutrition = selectedIngredients.reduce(
    (acc, ingredient) => {
      return {
        calories: acc.calories + ingredient.calories,
        protein_g: acc.protein_g + ingredient.protein_g,
        carbs_g: acc.carbs_g + ingredient.carbs_g,
        fat_g: acc.fat_g + ingredient.fat_g,
      }
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )

  // Animated styles
  const searchAnimatedStyle = useAnimatedStyle(() => ({
    opacity: searchOpacity.value,
  }))

  const addIngredientAnimatedStyle = useAnimatedStyle(() => ({
    height: addIngredientHeight.value,
    opacity: interpolate(addIngredientHeight.value, [0, 200], [0, 1]),
  }))

  const ingredientListAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ingredientListOpacity.value,
  }))

  const nutritionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: nutritionOpacity.value,
    transform: [{ scale: interpolate(nutritionOpacity.value, [0, 1], [0.9, 1]) }],
  }))

  const confirmAnimatedStyle = useAnimatedStyle(() => ({
    opacity: confirmOpacity.value,
    transform: [{ translateY: interpolate(confirmOpacity.value, [0, 1], [20, 0]) }],
  }))

  const loadingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    transform: [{ rotate: `${loadingRotation.value}deg` }],
  }))

  // Effects
  useEffect(() => {
    // Show ingredient list with animation when ingredients are added
    if (selectedIngredients.length > 0) {
      ingredientListOpacity.value = withTiming(1, { duration: 500 })
      nutritionOpacity.value = withTiming(1, { duration: 500 })
      confirmOpacity.value = withDelay(300, withTiming(1, { duration: 500 }))
    } else {
      ingredientListOpacity.value = withTiming(0, { duration: 300 })
      nutritionOpacity.value = withTiming(0, { duration: 300 })
      confirmOpacity.value = withTiming(0, { duration: 300 })
    }
  }, [selectedIngredients])

  useEffect(() => {
    // Control add ingredient panel animation
    if (isAddingIngredient) {
      addIngredientHeight.value = withSpring(280, { damping: 20 })
      searchOpacity.value = withTiming(0.5, { duration: 300 })
    } else {
      addIngredientHeight.value = withTiming(0, { duration: 300 })
      searchOpacity.value = withTiming(1, { duration: 300 })
    }
  }, [isAddingIngredient])

  useEffect(() => {
    // Control loading animation
    if (isSearching) {
      loadingOpacity.value = withTiming(1, { duration: 300 })
      loadingRotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1, // Infinite repeat
        false,
      )
    } else {
      loadingOpacity.value = withTiming(0, { duration: 300 })
    }
  }, [isSearching])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      searchOpenFoodFacts(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Search Open Food Facts API
  const searchOpenFoodFacts = async (query: string) => {
    if (!query.trim() || query.length < 2) return

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
          query,
        )}&search_simple=1&action=process&json=1&page_size=10`,
      )
      const data = await response.json()

      if (data.products) {
        const formattedResults = data.products.map((product: any) => {
          // Extract serving size information
          let servingQuantity: number | undefined = undefined
          let actualQuantity: number | undefined = undefined
          let actualUnit: string | undefined = undefined

          // Try to get serving quantity directly if available
          if (product.serving_quantity) {
            servingQuantity = Number.parseFloat(product.serving_quantity)
          }
          // Otherwise try to parse it from serving_size string
          else if (product.serving_size) {
            // Try to extract numeric value from serving_size (e.g., "80 g" -> 80)
            const match = product.serving_size.match(/(\d+(\.\d+)?)/)
            if (match) {
              servingQuantity = Number.parseFloat(match[0])
            }
          }

          // Extract actual quantity from the quantity field
          if (product.quantity) {
            // Parse quantity like "70 ג" (Hebrew), "93 g" (English), or "1 Liter"
            const quantityMatch = product.quantity.match(/(\d+(\.\d+)?)/)
            if (quantityMatch) {
              actualQuantity = Number.parseFloat(quantityMatch[0])

              // Try to determine the unit
              const quantityLower = product.quantity.toLowerCase()
              if (product.quantity.includes("ג") || quantityLower.includes(" g")) {
                actualUnit = "גרם" // Hebrew for gram
              } else if (
                product.quantity.includes('מ"ל') ||
                product.quantity.includes("מל") ||
                quantityLower.includes(" ml")
              ) {
                actualUnit = 'מ"ל' // Hebrew for ml
              } else if (quantityLower.includes(" kg")) {
                actualQuantity = actualQuantity * 1000 // Convert kg to g
                actualUnit = "גרם"
              } else if (quantityLower.includes(" oz")) {
                actualQuantity = actualQuantity * 28.35 // Convert oz to g (approximate)
                actualUnit = "גרם"
              } else if (
                quantityLower.includes(" l") ||
                quantityLower.includes(" liter") ||
                quantityLower.includes(" litre") ||
                quantityLower.includes("ליטר")
              ) {
                // Handle liter format
                if (quantityLower.includes(" cl")) {
                  actualQuantity = actualQuantity * 10 // Convert cl to ml
                  actualUnit = 'מ"ל'
                } else if (quantityLower.includes(" dl")) {
                  actualQuantity = actualQuantity * 100 // Convert dl to ml
                  actualUnit = 'מ"ל'
                } else {
                  actualQuantity = actualQuantity * 1000 // Convert l to ml
                  actualUnit = "ליטר"
                }
              }
            }
          }

          return {
            id: product.code || `temp-${Math.random().toString(36).substring(7)}`,
            name: product.product_name || "Unknown Product",
            brand: product.brands,
            image: product.image_url,
            serving_size: product.serving_size,
            serving_quantity: servingQuantity,
            actual_quantity: actualQuantity,
            actual_unit: actualUnit,
            nutrition: {
              calories: product.nutriments["energy-kcal_100g"] || 0,
              protein_g: product.nutriments.proteins_100g || 0,
              carbs_g: product.nutriments.carbohydrates_100g || 0,
              fat_g: product.nutriments.fat_100g || 0,
            },
          }
        })
        setSearchResults(formattedResults)
      }
    } catch (error) {
      console.error("Error searching Open Food Facts:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // Handle ingredient selection
  const handleSelectIngredient = (item: AutocompleteItem) => {
    setCurrentIngredient(item)

    // Use actual quantity if available, then serving quantity, otherwise default to 100
    if (item.actual_quantity && item.actual_quantity > 0) {
      setQuantity(item.actual_quantity.toString())
      if (item.actual_unit) {
        setUnit(item.actual_unit)
      }
    } else if (item.serving_quantity && item.serving_quantity > 0) {
      setQuantity(item.serving_quantity.toString())
    } else {
      setQuantity("100")
    }

    if (!item.actual_unit) {
      setUnit("גרם")
    }

    setIsAddingIngredient(true)
    setSearchQuery("")
    setSearchResults([])
    Keyboard.dismiss()

    // Focus quantity input after a short delay
    setTimeout(() => {
      quantityInputRef.current?.focus()
    }, 500)
  }

  // Add ingredient to meal
  const handleAddIngredient = () => {
    if (!currentIngredient || !currentIngredient.nutrition) return

    const quantityNum = Number.parseFloat(quantity)
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert("שגיאה", "אנא הכנס כמות תקינה")
      return
    }

    // Calculate nutrition based on quantity and unit
    const conversionFactor = unitConversions[unit as keyof typeof unitConversions] || 1
    const weightInGrams = quantityNum * conversionFactor
    const nutritionFactor = weightInGrams / 100 // Nutrition is per 100g

    const newIngredient: Ingredient = {
      id: editingIngredientId || `ing-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: currentIngredient.name,
      brand: currentIngredient.brand,
      image: currentIngredient.image,
      quantity: quantityNum,
      unit,
      calories: Math.round(currentIngredient.nutrition.calories * nutritionFactor),
      protein_g: Number.parseFloat((currentIngredient.nutrition.protein_g * nutritionFactor).toFixed(1)),
      carbs_g: Number.parseFloat((currentIngredient.nutrition.carbs_g * nutritionFactor).toFixed(1)),
      fat_g: Number.parseFloat((currentIngredient.nutrition.fat_g * nutritionFactor).toFixed(1)),
      per_100g: {
        calories: currentIngredient.nutrition.calories,
        protein_g: currentIngredient.nutrition.protein_g,
        carbs_g: currentIngredient.nutrition.carbs_g,
        fat_g: currentIngredient.nutrition.fat_g,
      },
    }

    if (editingIngredientId) {
      // Update existing ingredient
      setSelectedIngredients((prev) => prev.map((ing) => (ing.id === editingIngredientId ? newIngredient : ing)))
      setEditingIngredientId(null)
    } else {
      // Add new ingredient
      setSelectedIngredients((prev) => [...prev, newIngredient])
    }

    // Reset form
    setCurrentIngredient(null)
    setIsAddingIngredient(false)
  }

  // Edit ingredient
  const handleEditIngredient = (id: string) => {
    const ingredient = selectedIngredients.find((ing) => ing.id === id)
    if (!ingredient) return

    setEditingIngredientId(id)
    setCurrentIngredient({
      id: ingredient.id,
      name: ingredient.name,
      brand: ingredient.brand,
      image: ingredient.image,
      nutrition: ingredient.per_100g,
    })
    setQuantity(ingredient.quantity.toString())
    setUnit(ingredient.unit)
    setIsAddingIngredient(true)
  }

  // Delete ingredient
  const handleDeleteIngredient = (id: string) => {
    Alert.alert("הסרת מרכיב", "האם אתה בטוח שברצונך להסיר מרכיב זה?", [
      {
        text: "ביטול",
        style: "cancel",
      },
      {
        text: "הסר",
        style: "destructive",
        onPress: () => {
          setSelectedIngredients((prev) => prev.filter((ing) => ing.id !== id))
        },
      },
    ])
  }

  // Save meal
  const handleSaveMeal = async () => {
    if (selectedIngredients.length === 0) {
      Alert.alert("שגיאה", "אנא הוסף לפחות מרכיב אחד למנה")
      return
    }

    if (!mealName.trim()) {
      Alert.alert("שגיאה", "אנא הכנס שם למנה")
      mealNameInputRef.current?.focus()
      return
    }

    const meal: CustomMeal = {
      name: mealName,
      ingredients: selectedIngredients,
      totalNutrition,
    }

    try {
      setIsSaving(true)
      console.log("Attempting to save meal:", JSON.stringify(meal))

      if (onSaveMeal) {
        console.log("onSaveMeal prop exists, calling it now")
        await onSaveMeal(meal)
        console.log("onSaveMeal completed successfully")
        Alert.alert("נשמר בהצלחה", "המנה נוספה בהצלחה")
        // Reset form
        setSelectedIngredients([])
        setMealName("")
      } else {
        console.error("onSaveMeal prop is not defined")
        Alert.alert("שגיאה", "לא ניתן לשמור את המנה - חסר מידע שמירה")
      }
    } catch (error) {
      console.error("Error saving meal:", error)
      Alert.alert("שגיאה", `אירעה שגיאה בשמירת המנה: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Cancel adding ingredient
  const handleCancelAddIngredient = () => {
    setCurrentIngredient(null)
    setIsAddingIngredient(false)
    setEditingIngredientId(null)
  }

  // Render autocomplete item
  const renderAutocompleteItem = ({ item }: { item: AutocompleteItem }) => (
    <TouchableOpacity style={styles.autocompleteItem} onPress={() => handleSelectIngredient(item)}>
      {item.image && (
        <View style={styles.autocompleteImageContainer}>
          <Image source={{ uri: item.image }} style={styles.autocompleteImage} resizeMode="cover" />
        </View>
      )}
      <View style={styles.autocompleteContent}>
        <Text style={styles.autocompleteName}>{item.name}</Text>
        {item.brand && <Text style={styles.autocompleteBrand}>{item.brand}</Text>}
        {item.actual_quantity ? (
          <Text style={styles.autocompleteServing}>
            כמות: {item.actual_quantity} {item.actual_unit || "גרם"}
          </Text>
        ) : item.serving_size ? (
          <Text style={styles.autocompleteServing}>מנה: {item.serving_size}</Text>
        ) : null}
      </View>
      <Ionicons name="add-circle" size={24} color="#66bb6a" />
    </TouchableOpacity>
  )

  // Render ingredient item
  const renderIngredientItem = ({ item }: { item: Ingredient }) => (
    <View style={styles.ingredientItem}>
      <View style={styles.ingredientInfo}>
        <Text style={styles.ingredientName}>{item.name}</Text>
        <Text style={styles.ingredientQuantity}>
          {item.quantity} {item.unit}
        </Text>
        <Text style={styles.ingredientCalories}>{item.calories} קלוריות</Text>
      </View>
      <View style={styles.ingredientActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEditIngredient(item.id)}>
          <Ionicons name="pencil" size={18} color="#0ea5e9" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteIngredient(item.id)}>
          <Ionicons name="trash" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>הכנת מנה מותאמת אישית</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      {/* Add this right after the header in the return statement */}
      <View style={{ padding: 10, backgroundColor: "#66bb6a", marginBottom: 10, borderRadius: 8 }}>
        <Text style={{ color: "white", textAlign: "center", fontWeight: "bold" }}>בונה מנה מותאמת אישית</Text>
      </View>

      {/* Search Section */}
      <Animated.View style={[styles.searchSection, searchAnimatedStyle]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="חפש מרכיב..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            editable={!isAddingIngredient}
          />
          {isSearching && (
            <Animated.View style={[styles.loadingIndicator, loadingAnimatedStyle]}>
              <ActivityIndicator size="small" color="#66bb6a" />
            </Animated.View>
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && !isAddingIngredient && (
          <View style={styles.autocompleteContainer}>
            <ScrollView style={styles.autocompleteList} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
              {searchResults.map((item) => (
                <View key={item.id}>{renderAutocompleteItem({ item })}</View>
              ))}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Add Ingredient Panel */}
      <Animated.View style={[styles.addIngredientPanel, addIngredientAnimatedStyle]}>
        {currentIngredient && (
          <>
            <View style={styles.selectedIngredientHeader}>
              <Text style={styles.selectedIngredientTitle}>הוספת מרכיב</Text>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelAddIngredient}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedIngredientInfo}>
              <Text style={styles.selectedIngredientName}>{currentIngredient.name}</Text>
              {currentIngredient.brand && <Text style={styles.selectedIngredientBrand}>{currentIngredient.brand}</Text>}
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>כמות:</Text>
              <View style={styles.quantityInputContainer}>
                <TextInput
                  ref={quantityInputRef}
                  style={styles.quantityInput}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <View style={styles.unitSelector}>
                  {Object.keys(unitConversions).map((unitOption) => (
                    <TouchableOpacity
                      key={unitOption}
                      style={[styles.unitOption, unit === unitOption && styles.unitOptionSelected]}
                      onPress={() => setUnit(unitOption)}
                    >
                      <Text style={[styles.unitOptionText, unit === unitOption && styles.unitOptionTextSelected]}>
                        {unitOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
              <Text style={styles.addButtonText}>{editingIngredientId ? "עדכן מרכיב" : "הוסף מרכיב"}</Text>
              <Ionicons name={editingIngredientId ? "checkmark" : "add"} size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

      {/* Ingredients List */}
      <Animated.View style={[styles.ingredientsListSection, ingredientListAnimatedStyle]}>
        <Text style={styles.sectionTitle}>מרכיבים ({selectedIngredients.length})</Text>
        {selectedIngredients.length > 0 ? (
          <View style={styles.ingredientsList}>
            {selectedIngredients.map((item) => (
              <View key={item.id}>{renderIngredientItem({ item })}</View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyListText}>לא נבחרו מרכיבים</Text>
        )}
      </Animated.View>

      {/* Nutrition Summary */}
      {selectedIngredients.length > 0 && (
        <Animated.View style={[styles.nutritionSection, nutritionAnimatedStyle]}>
          <Text style={styles.sectionTitle}>סיכום תזונתי</Text>
          <View style={styles.nutritionChart}>
            <PlateChart
              carbs={totalNutrition.carbs_g}
              protein={totalNutrition.protein_g}
              fat={totalNutrition.fat_g}
              totalCalories={totalNutrition.calories}
            />
          </View>
        </Animated.View>
      )}

      {/* Confirmation Section */}
      {selectedIngredients.length > 0 && (
        <Animated.View style={[styles.confirmSection, confirmAnimatedStyle]}>
          <View style={styles.mealNameContainer}>
            <Text style={styles.mealNameLabel}>שם המנה:</Text>
            <TextInput
              ref={mealNameInputRef}
              style={styles.mealNameInput}
              value={mealName}
              onChangeText={setMealName}
              placeholder="הכנס שם למנה..."
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={handleSaveMeal}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? "שומר..." : "שמור מנה"}</Text>
            <Ionicons name="save-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ScrollView>
  )
}

const { width } = Dimensions.get("window")
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    width: "100%", // Ensure full width
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#334155",
    textAlign: "right",
  },
  closeButton: {
    padding: 4,
  },
  searchSection: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#334155",
    textAlign: "right",
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  autocompleteContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    maxHeight: 200,
  },
  autocompleteList: {
    padding: 8,
  },
  autocompleteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  autocompleteContent: {
    flex: 1,
    marginRight: 8,
  },
  autocompleteName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    textAlign: "right",
  },
  autocompleteBrand: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
  },
  addIngredientPanel: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    // overflow: "hidden",
  },
  selectedIngredientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedIngredientTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
  },
  cancelButton: {
    padding: 4,
  },
  selectedIngredientInfo: {
    marginBottom: 16,
  },
  selectedIngredientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
    textAlign: "right",
  },
  selectedIngredientBrand: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
  },
  quantitySection: {
    marginBottom: 16,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
    textAlign: "right",
  },
  quantityInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quantityInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#334155",
    width: 80,
    textAlign: "center",
  },
  unitSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    flex: 1,
    marginLeft: 8,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginLeft: 8,
    marginBottom: 8,
  },
  unitOptionSelected: {
    backgroundColor: "#0ea5e9",
  },
  unitOptionText: {
    fontSize: 14,
    color: "#64748b",
  },
  unitOptionTextSelected: {
    color: "#fff",
    fontWeight: "500",
  },
  addButton: {
    backgroundColor: "#66bb6a",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  ingredientsListSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
    textAlign: "right",
  },
  ingredientsList: {
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    textAlign: "right",
  },
  ingredientQuantity: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
  },
  ingredientCalories: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "500",
    textAlign: "right",
  },
  ingredientActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyListText: {
    textAlign: "center",
    color: "#64748b",
    padding: 16,
  },
  nutritionSection: {
    marginBottom: 24,
  },
  nutritionChart: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  confirmSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mealNameContainer: {
    marginBottom: 16,
  },
  mealNameLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
    textAlign: "right",
  },
  mealNameInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#334155",
    textAlign: "right",
  },
  saveButton: {
    backgroundColor: "#66bb6a",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginRight: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  autocompleteImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#f1f5f9",
  },
  autocompleteImage: {
    width: "100%",
    height: "100%",
  },
  autocompleteServing: {
    fontSize: 12,
    color: "#0ea5e9",
    textAlign: "right",
  },
})
