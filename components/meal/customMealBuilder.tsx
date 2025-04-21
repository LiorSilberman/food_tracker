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
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
} from "react-native-reanimated"
import PlateChart from "./PlateChart"
import { API_URL } from "@/config"

// Import the SpoonVisualization component at the top with other imports
import SpoonVisualization from "./spoonVisualization"

// Types
export type Ingredient = {
  id: string
  name: string
  brand?: string
  image?: string
  quantity: number
  unit: string
  fullness?: "flat" | "standard" | "heaped"
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
  actual_quantity?: number
  actual_unit?: string
  nutrition?: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  }
}

type Props = {
  onSaveMeal?: (meal: CustomMeal) => Promise<void>
  onClose: () => void
  // The component can be used either as a standalone modal or embedded in another modal
  asModal?: boolean
}

// Unit conversion factors (approximate)
const unitConversions = {
  גרם: 1, // Base unit (grams)
  כוס: 240, // 1 cup ≈ 240g
  כף: 15, // 1 tablespoon ≈ 15g
  כפית: 5, // 1 teaspoon ≈ 5g
  ליטר: 1000, // 1 liter ≈ 1000g (for water-based liquids)
  'מ"ל': 1, // 1 ml ≈ 1g (for water-based liquids)
}

// Spoon profiles for different fullness levels
const spoonProfiles = {
  כפית: {
    flat: 4,
    standard: 5,
    heaped: 6.5,
  },
  כף: {
    flat: 12,
    standard: 15,
    heaped: 18,
  },
  כוס: {
    flat: 220,
    standard: 240,
    heaped: 270,
  },
}

// Measurable units that support fullness
const measurableUnits = ["כף", "כפית", "כוס"]

export default function CustomMealBuilder({ onSaveMeal, onClose, asModal = false }: Props) {
  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AutocompleteItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIngredients, setSelectedIngredients] = useState<Ingredient[]>([])
  const [currentIngredient, setCurrentIngredient] = useState<AutocompleteItem | null>(null)
  const [quantity, setQuantity] = useState("100")
  const [unit, setUnit] = useState("גרם")
  const [fullness, setFullness] = useState<"flat" | "standard" | "heaped">("standard")
  const [isAddingIngredient, setIsAddingIngredient] = useState(false)
  const [mealName, setMealName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)

  // Animation values
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
  const scrollViewRef = useRef<ScrollView>(null)

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
  const addIngredientAnimatedStyle = useAnimatedStyle(() => ({
    height: addIngredientHeight.value,
    opacity: interpolate(addIngredientHeight.value, [0, 200], [0, 1]),
    overflow: "hidden",
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

  // Auto-focus search input when component mounts
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 300)
  }, [])

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

  // Update the useEffect for controlling the add ingredient panel animation to increase the height
  useEffect(() => {
    // Control add ingredient panel animation
    if (isAddingIngredient) {
      // Significantly increase the height values to accommodate the spoon visualization
      addIngredientHeight.value = withSpring(measurableUnits.includes(unit) ? 500 : 320, { damping: 20 })
      // Scroll to the add ingredient panel
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 100, animated: true })
      }, 100)
    } else {
      addIngredientHeight.value = withTiming(0, { duration: 300 })
    }
  }, [isAddingIngredient, unit])

  useEffect(() => {
    // Control loading animation
    if (isSearching) {
      loadingOpacity.value = withTiming(1, { duration: 300 })
      loadingRotation.value = withTiming(
        360,
        {
          duration: 1000,
          easing: Easing.linear,
        },
        () => {
          loadingRotation.value = 0
          runOnJS(rotateLoading)()
        },
      )
    } else {
      loadingOpacity.value = withTiming(0, { duration: 300 })
    }
  }, [isSearching])

  const rotateLoading = () => {
    if (isSearching) {
      loadingRotation.value = withTiming(
        360,
        {
          duration: 1000,
          easing: Easing.linear,
        },
        () => {
          loadingRotation.value = 0
          runOnJS(rotateLoading)()
        },
      )
    }
  }

  // Reset fullness when unit changes
  useEffect(() => {
    if (measurableUnits.includes(unit)) {
      setFullness("standard")
    }
  }, [unit])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      searchBackendFoodItems(searchQuery)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchBackendFoodItems = async (query: string) => {
    if (!query.trim() || query.length < 2) return

    setIsSearching(true)
    try {
      const res = await fetch(`${API_URL}/search-food?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      const results: AutocompleteItem[] = data.map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        brand: item.brand || "כללי",
        actual_quantity: 100,
        actual_unit: "גרם",
        nutrition: {
          calories: Number(item.calories_per_100g) || 0,
          protein_g: Number(item.protein_g) || 0,
          carbs_g: Number(item.carbs_g) || 0,
          fat_g: Number(item.fat_g) || 0,
        },
      }))

      setSearchResults(results)
    } catch (err) {
      console.error("Error fetching from backend:", err)
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
    let conversionFactor = unitConversions[unit as keyof typeof unitConversions] || 1

    // If using a measurable unit, adjust the conversion factor based on fullness
    if (measurableUnits.includes(unit)) {
      conversionFactor = spoonProfiles[unit as keyof typeof spoonProfiles][fullness]
    }

    const weightInGrams = quantityNum * conversionFactor
    const nutritionFactor = weightInGrams / 100 // Nutrition is per 100g

    const newIngredient: Ingredient = {
      id: editingIngredientId || `ing-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: currentIngredient.name,
      brand: currentIngredient.brand,
      image: currentIngredient.image,
      quantity: quantityNum,
      unit,
      fullness: measurableUnits.includes(unit) ? fullness : undefined,
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

    // Focus back on search input
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 300)
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
    if (ingredient.fullness) {
      setFullness(ingredient.fullness)
    } else {
      setFullness("standard")
    }
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

      if (onSaveMeal) {
        await onSaveMeal(meal)
        Alert.alert("נשמר בהצלחה", "המנה נוספה בהצלחה")
        // Reset form
        setSelectedIngredients([])
        setMealName("")
        // Close modal
        onClose()
      } else {
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

    // Focus back on search input
    setTimeout(() => {
      searchInputRef.current?.focus()
    }, 300)
  }

  // Handle unit change
  const handleUnitChange = (newUnit: string) => {
    setUnit(newUnit)
    // Reset fullness to standard when changing to a measurable unit
    if (measurableUnits.includes(newUnit)) {
      setFullness("standard")
    }
  }

  // Update the renderFullnessSelector function to improve the layout
  const renderFullnessSelector = () => {
    if (!measurableUnits.includes(unit)) return null

    return (
      <View style={styles.fullnessSection}>
        <Text style={styles.fullnessLabel}>מידת מילוי:</Text>

        {/* Add the spoon visualization with proper spacing */}
        <View style={styles.spoonVisualizationContainer}>
          <SpoonVisualization fullness={fullness} unit={unit} onFullnessChange={setFullness} />
        </View>
      </View>
    )
  }

  // Helper function to get fullness text
  const getFullnessText = (fullness: "flat" | "standard" | "heaped") => {
    switch (fullness) {
      case "flat":
        return "(שטוח)"
      case "standard":
        return "(רגיל)"
      case "heaped":
        return "(גדוש)"
      default:
        return ""
    }
  }

  // Render the component content
  const renderContent = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardAvoidingView}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>הכנת מנה מותאמת אישית</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="סגור"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.contentContainer}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="חפש מרכיב מהמאגר שלך..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                editable={!isAddingIngredient}
                accessibilityLabel="חיפוש מרכיבים"
                accessibilityHint="הקלד לחיפוש מרכיבים מהמאגר"
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
                <ScrollView
                  style={styles.autocompleteList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {searchResults.map((item) => (
                    <View key={item.id}>{renderAutocompleteItem({ item })}</View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Add Ingredient Panel */}
          <Animated.View style={[styles.addIngredientPanel, addIngredientAnimatedStyle]}>
            {currentIngredient && (
              <>
                <View style={styles.selectedIngredientHeader}>
                  <Text style={styles.selectedIngredientTitle}>
                    {editingIngredientId ? "עריכת מרכיב" : "הוספת מרכיב"}
                  </Text>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelAddIngredient}
                    accessibilityLabel="ביטול"
                  >
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.selectedIngredientInfo}>
                  <Text style={styles.selectedIngredientName}>{currentIngredient.name}</Text>
                  {currentIngredient.brand && (
                    <Text style={styles.selectedIngredientBrand}>{currentIngredient.brand}</Text>
                  )}
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
                      accessibilityLabel="כמות"
                      accessibilityHint="הכנס כמות מספרית"
                    />
                    <View style={styles.unitSelector}>
                      {Object.keys(unitConversions).map((unitOption) => (
                        <TouchableOpacity
                          key={unitOption}
                          style={[styles.unitOption, unit === unitOption && styles.unitOptionSelected]}
                          onPress={() => handleUnitChange(unitOption)}
                          accessibilityLabel={`יחידת מידה ${unitOption}`}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: unit === unitOption }}
                        >
                          <Text style={[styles.unitOptionText, unit === unitOption && styles.unitOptionTextSelected]}>
                            {unitOption}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Fullness Selector */}
                {renderFullnessSelector()}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddIngredient}
                  accessibilityLabel={editingIngredientId ? "עדכן מרכיב" : "הוסף מרכיב"}
                  accessibilityRole="button"
                  disabled={!currentIngredient || !currentIngredient.nutrition}
                >
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
                  accessibilityLabel="שם המנה"
                  accessibilityHint="הכנס שם למנה המותאמת אישית"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSaveMeal}
                disabled={isSaving}
                accessibilityLabel="שמור מנה"
                accessibilityRole="button"
                accessibilityState={{ disabled: isSaving }}
              >
                <Text style={styles.saveButtonText}>{isSaving ? "שומר..." : "שמור מנה"}</Text>
                <Ionicons name="save-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )

  // If used as a standalone modal
  if (asModal) {
    return (
      <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.dismissArea} onPress={onClose} />
          <View style={styles.modalContainer}>{renderContent()}</View>
        </View>
      </Modal>
    )
  }

  // If embedded in another component/modal
  return <View style={styles.container}>{renderContent()}</View>

  function renderAutocompleteItem({ item }: { item: AutocompleteItem }) {
    return (
      <TouchableOpacity
        style={styles.autocompleteItem}
        onPress={() => handleSelectIngredient(item)}
        accessibilityLabel={`בחר ${item.name} ${item.brand ? `(${item.brand})` : ""}`}
      >
        <View style={styles.autocompleteContent}>
          <Text style={styles.autocompleteName}>{item.name}</Text>
          {item.brand && <Text style={styles.autocompleteBrand}>{item.brand}</Text>}
          {item.serving_size && item.serving_quantity && (
            <Text style={styles.autocompleteServing}>
              {item.serving_quantity} {item.serving_size}
            </Text>
          )}
          {item.nutrition && (
            <View style={styles.macroIndicators}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, styles.proteinColor]}>{item.nutrition.protein_g}g</Text>
                <Text style={styles.proteinColor}>חלבון</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, styles.fatColor]}>{item.nutrition.fat_g}g</Text>
                <Text style={styles.fatColor}>שומן</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, styles.carbColor]}>{item.nutrition.carbs_g}g</Text>
                <Text style={styles.carbColor}>פחמימה</Text>
              </View>
            </View>
          )}
        </View>
        {item.image ? (
          <View style={styles.autocompleteImageContainer}>
            <Image source={{ uri: item.image }} style={styles.autocompleteImage} />
          </View>
        ) : null}
      </TouchableOpacity>
    )
  }

  function renderIngredientItem({ item }: { item: Ingredient }) {
    return (
      <View style={styles.ingredientItem}>
        <View style={styles.ingredientInfo}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <Text style={styles.ingredientQuantity}>
            {item.quantity} {item.unit} {item.fullness ? getFullnessText(item.fullness) : ""}
          </Text>
        </View>
        <Text style={styles.ingredientCalories}>{item.calories} קלוריות</Text>
        <View style={styles.ingredientActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditIngredient(item.id)}
            accessibilityLabel={`ערוך ${item.name}`}
          >
            <Ionicons name="create-outline" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteIngredient(item.id)}
            accessibilityLabel={`מחק ${item.name}`}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }
}

const { width, height } = Dimensions.get("window")
const isIOS = Platform.OS === "ios"

// Add this to the styles object
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dismissArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: width > 500 ? 500 : width * 0.9,
    maxHeight: height * 0.9,
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
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
    maxHeight: 300,
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
    paddingBottom: 24, // Add extra padding at the bottom
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
  fullnessSection: {
    marginBottom: 24, // Increase bottom margin to create more space
  },
  fullnessLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
    textAlign: "right",
  },
  fullnessOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 4,
  },
  fullnessOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  fullnessOptionSelected: {
    backgroundColor: "#0ea5e9",
  },
  fullnessIcon: {
    marginRight: 4,
  },
  fullnessText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  fullnessTextSelected: {
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
    marginTop: 24, // Increase top margin
    marginBottom: 16, // Increase bottom margin
    zIndex: 10, // Ensure button is above other elements
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
    flexDirection: "row-reverse",
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
    paddingLeft: 30,
  },
  ingredientActions: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  editButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButton: {
    // padding: 8,
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
  macroIndicators: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
    marginBottom: 2,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: "500",
    marginRight: 4,
  },
  proteinColor: {
    color: "#0891b2", // Cyan-600
  },
  fatColor: {
    color: "#f59e0b", // Amber-500
  },
  carbColor: {
    color: "#65a30d", // Lime-600
  },
  spoonVisualizationContainer: {
    marginTop: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 80, // Reduced height since we're only showing the buttons now
  },
})
