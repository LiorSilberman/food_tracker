"use client"

import { useRef, useState, useEffect } from "react"
import {
  View,
  Image,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native"
import PlateChart from "../meal/PlateChart"
import { useImageUploadStore } from "@/stores/imageUploadStore"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated"
import { GestureDetector, Gesture } from "react-native-gesture-handler"
import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"
import { API_URL } from '@/config';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export type Ingredient = {
  name: string
  amount: number
  unit: string
  id: string
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
}

export type NutritionResult = {
  calories: number
  carbs_g: number
  protein_g: number
  fat_g: number
  ingredients?: Ingredient[]
}

export type Props = {
  image: string
  result?: NutritionResult | null
  onResult?: (result: NutritionResult | null) => void
  base64?: string
  onDismiss?: () => void
  onSave?: (result: NutritionResult) => Promise<void>
}

const MealAnalysisCard = ({ image, result, onResult, onDismiss, onSave }: Props) => {
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [showIngredients, setShowIngredients] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [editMode, setEditMode] = useState(false)
  const [editableResult, setEditableResult] = useState<NutritionResult | null>(null)
  const [originalResult, setOriginalResult] = useState<NutritionResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const imageBase64 = useImageUploadStore((state) => state.imageBase64)

  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const cardOpacity = useSharedValue(1)
  const cardScale = useSharedValue(1)
  const cardRotate = useSharedValue(0)
  const screenWidth = Dimensions.get("window").width
  const inputRef = useRef<TextInput>(null)

  // Animation values for input field
  const inputBorderWidth = useSharedValue(1)
  const inputScale = useSharedValue(1)

  // Animation values for nutrition indicators
  const nutritionOpacity = useSharedValue(0)
  const nutritionScale = useSharedValue(0.8)

  // Animation values for loading animation
  const loadingRotation = useSharedValue(0)
  const loadingScale = useSharedValue(0)
  const loadingOpacity = useSharedValue(0)
  const pulseScale = useSharedValue(1)

  // Animation values for ingredients panel
  const ingredientsPanelHeight = useSharedValue(0)

  // Animated styles for card
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: cardScale.value },
      { rotateZ: `${cardRotate.value}deg` },
    ],
    opacity: cardOpacity.value,
  }))

  // Enhanced pan gesture handler
  const panGesture = Gesture.Pan()
    .minDistance(20)
    .activeOffsetX([-20, 20]) // Only activate for horizontal movements beyond 20px
    .failOffsetY([-20, 20]) // Fail the gesture if vertical movement exceeds 20px first
    .onUpdate((e) => {
      // Only apply horizontal movement
      const dampingFactor = 0.8
      translateX.value = e.translationX * dampingFactor

      // Reduce rotation sensitivity
      cardRotate.value = interpolate(e.translationX, [-screenWidth * 0.7, 0, screenWidth * 0.7], [-5, 0, 5])

      // Reduce vertical movement
      translateY.value = Math.abs(e.translationX) * 0.05

      // Scale down slightly as card is moved
      cardScale.value = interpolate(Math.abs(e.translationX), [0, screenWidth * 0.5], [1, 0.97])
    })
    .onEnd((e) => {
      // Increase the threshold for dismissal to 45% of screen width
      if (Math.abs(e.translationX) > screenWidth * 0.45) {
        // Swipe far enough to dismiss
        const direction = e.translationX > 0 ? 1 : -1

        translateX.value = withTiming(direction * screenWidth * 1.2, { duration: 400 })
        cardRotate.value = withTiming(direction * 15, { duration: 400 })
        translateY.value = withTiming(50, { duration: 400 })
        cardOpacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onDismiss || (() => onResult?.(null)))()
        })
      } else {
        // Spring back to original position with nice physics
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
          mass: 1.2,
        })
        cardRotate.value = withSpring(0, {
          damping: 20,
          stiffness: 200,
        })
        translateY.value = withSpring(0)
        cardScale.value = withSpring(1, { damping: 20 })
      }
    })

  // Animated styles for input field
  const inputAnimatedStyle = useAnimatedStyle(() => {
    return {
      borderWidth: inputBorderWidth.value,
      transform: [{ scale: inputScale.value }],
    }
  })

  // Animated styles for nutrition indicators
  const nutritionAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: nutritionOpacity.value,
      transform: [{ scale: nutritionScale.value }],
    }
  })

  // Animated styles for loading animation
  const loadingAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: loadingOpacity.value,
      transform: [{ scale: loadingScale.value }, { rotate: `${loadingRotation.value}deg` }],
    }
  })

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: interpolate(pulseScale.value, [1, 1.2], [0.7, 0]),
    }
  })

  // Animated styles for ingredients panel
  const ingredientsPanelStyle = useAnimatedStyle(() => {
    return {
      height: ingredientsPanelHeight.value,
      opacity: interpolate(ingredientsPanelHeight.value, [0, 150], [0, 1]),
    }
  })

  // Show nutrition indicators with animation when results are available
  useEffect(() => {
    if (result) {
      nutritionOpacity.value = withTiming(1, { duration: 800 })
      nutritionScale.value = withSpring(1, { damping: 12 })

      // Store both the original and editable results
      setOriginalResult(result)
      setEditableResult(result)

      // Initialize ingredients from result if available
      if (result.ingredients && result.ingredients.length > 0) {
        setIngredients(result.ingredients)
      }
    }
  }, [result])

  // Control loading animation
  useEffect(() => {
    if (loading) {
      // Start loading animations
      loadingOpacity.value = withTiming(1, { duration: 300 })
      loadingScale.value = withSpring(1)
      loadingRotation.value = withRepeat(withTiming(360, { duration: 2000, easing: Easing.linear }), -1, false)
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 100 }),
        ),
        -1,
        false,
      )
    } else {
      // Stop loading animations
      loadingOpacity.value = withTiming(0, { duration: 300 })
      loadingScale.value = withTiming(0)
    }
  }, [loading])

  // Handle input focus/blur animations
  useEffect(() => {
    if (isFocused) {
      inputBorderWidth.value = withTiming(2, { duration: 200 })
      inputScale.value = withTiming(1.02, { duration: 200 })
    } else {
      inputBorderWidth.value = withTiming(1, { duration: 200 })
      inputScale.value = withTiming(1, { duration: 200 })
    }
  }, [isFocused])

  // Handle ingredients panel animation
  useEffect(() => {
    if (showIngredients) {
      ingredientsPanelHeight.value = withSpring(Math.min(ingredients.length * 60 + 60, 260), { damping: 20 })
    } else {
      ingredientsPanelHeight.value = withTiming(0, { duration: 300 })
    }
  }, [showIngredients, ingredients.length])

  const sendToAnalyze = async () => {
    setLoading(true)
    try {
      console.log(API_URL);
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imageBase64, description }),
      })

      const { job_id } = await res.json()
      if (!job_id) throw new Error("Missing job_id")

      let attempts = 0
      const maxAttempts = 20
      while (attempts < maxAttempts) {
        await new Promise((res) => setTimeout(res, 3000))
        const check = await fetch(`${API_URL}/status/${job_id}`)
        const data = await check.json()

        if (data.status === "done") {
          if (data.result?.error) {
            Alert.alert("שגיאה", data.result.error)
          } else {
            // Format ingredients from the API response
            const ingredientsData = data.result.ingredients || {}
            const formattedIngredients = Object.entries(ingredientsData).map(([name, details], index) => {
              const detail = details as {
                portion_g: number
                source: string
                calories: number
                protein_g: number
                carbs_g: number
                fat_g: number
              }

              return {
                id: `ingredient-${index}`,
                name: name,
                amount: detail.portion_g,
                unit: "גרם",
                calories: detail.calories,
                protein_g: detail.protein_g,
                carbs_g: detail.carbs_g,
                fat_g: detail.fat_g,
              }
            })

            setIngredients(formattedIngredients)
            const resultData = {
              ...data.result.totals,
              ingredients: formattedIngredients,
            }

            // Store both original and editable results
            setOriginalResult(resultData)
            setEditableResult(resultData)

            // Just update the local state, don't save to DB yet
            onResult?.(resultData)
          }
          break
        }

        if (data.status === "error") {
          Alert.alert("שגיאה", data.error)
          break
        }

        attempts++
      }

      if (attempts === maxAttempts) {
        Alert.alert("שגיאה", "הניתוח לקח יותר מדי זמן")
      }
    } catch (e) {
      Alert.alert("שגיאה", "שגיאה בניתוח")
    } finally {
      setLoading(false)
    }
  }

  const dismissKeyboard = () => {
    Keyboard.dismiss()
    setIsFocused(false)
  }

  // Update ingredient amount
  const updateIngredientAmount = (id: string, amount: string) => {
    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount)) return

    const updatedIngredients = ingredients.map((ing) => (ing.id === id ? { ...ing, amount: numAmount } : ing))
    setIngredients(updatedIngredients)
  }

  // Toggle ingredients panel
  const toggleIngredientsPanel = () => {
    setShowIngredients(!showIngredients)
  }

  // Toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode)
    if (!editMode) {
      cardScale.value = withSpring(1.02, { damping: 15 })
    } else {
      cardScale.value = withSpring(1, { damping: 15 })
    }
  }

  // Update nutritional values based on edited ingredients
  const recalculateNutrition = () => {
    if (!originalResult || !editableResult) return

    // Calculate totals from ingredients
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0

    ingredients.forEach((ingredient) => {
      if (ingredient.calories) {
        totalCalories += ingredient.calories * (ingredient.amount / 100)
      }
      if (ingredient.protein_g) {
        totalProtein += ingredient.protein_g * (ingredient.amount / 100)
      }
      if (ingredient.carbs_g) {
        totalCarbs += ingredient.carbs_g * (ingredient.amount / 100)
      }
      if (ingredient.fat_g) {
        totalFat += ingredient.fat_g * (ingredient.amount / 100)
      }
    })

    // If we don't have detailed nutritional info per ingredient,
    // use the original proportions and scale based on total ingredient weight
    if (totalCalories === 0) {
      const originalTotalWeight = originalResult.ingredients?.reduce((sum, ing) => sum + ing.amount, 0) || 100
      const newTotalWeight = ingredients.reduce((sum, ing) => sum + ing.amount, 0)
      const ratio = newTotalWeight / originalTotalWeight

      totalCalories = originalResult.calories * ratio
      totalProtein = originalResult.protein_g * ratio
      totalCarbs = originalResult.carbs_g * ratio
      totalFat = originalResult.fat_g * ratio
    }

    // Update the editable result
    const updatedResult = {
      ...editableResult,
      calories: Math.round(totalCalories),
      protein_g: Number.parseFloat(totalProtein.toFixed(1)),
      carbs_g: Number.parseFloat(totalCarbs.toFixed(1)),
      fat_g: Number.parseFloat(totalFat.toFixed(1)),
      ingredients: ingredients,
    }

    setEditableResult(updatedResult)
    onResult?.(updatedResult)
  }

  // Update a specific nutritional value directly
  const updateNutritionValue = (field: keyof NutritionResult, value: string) => {
    if (!editableResult) return

    const numValue = Number.parseFloat(value)
    if (isNaN(numValue)) return

    const updatedResult = {
      ...editableResult,
      [field]: field === "calories" ? Math.round(numValue) : Number.parseFloat(numValue.toFixed(1)),
    }

    setEditableResult(updatedResult)
  }

  // Save the meal to the database
  const handleSaveMeal = async () => {
    if (!editableResult || !onSave) return

    try {
      setIsSaving(true)
      await onSave(editableResult)
      Alert.alert("נשמר בהצלחה", "הארוחה נוספה ליומן שלך")
      onDismiss?.()
    } catch (error) {
      console.error("Error saving meal:", error)
      Alert.alert("שגיאה", "אירעה שגיאה בשמירת הארוחה")
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to original values
  const resetToOriginal = () => {
    if (!originalResult) return
    setEditableResult(originalResult)
    setIngredients(originalResult.ingredients || [])
    setEditMode(false)
    cardScale.value = withSpring(1, { damping: 15 })
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>הארוחה שלך</Text>
          <TouchableOpacity
            style={styles.swipeHint}
            onPress={() => {
              if (onDismiss) onDismiss()
              else onResult?.(null)
            }}
          >
            <Ionicons name="close-circle" size={22} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />

          {/* Loading overlay on the image */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <BlurView intensity={30} style={styles.blurView}>
                <Animated.View style={[styles.loadingPulse, pulseAnimatedStyle]} />
                <Animated.View style={[styles.loadingIconContainer, loadingAnimatedStyle]}>
                  <Ionicons name="nutrition" size={40} color="#fff" />
                </Animated.View>
                <Text style={styles.loadingText}>מנתח את הארוחה...</Text>
              </BlurView>
            </View>
          )}

          {/* Overlay nutrition information on the image */}
          {editableResult && !editMode && (
            <Animated.View style={[styles.nutritionOverlay, nutritionAnimatedStyle]}>
              {/* Calories Badge */}
              <View style={styles.caloriesBadge}>
                <Text style={styles.caloriesValue}>{editableResult.calories}</Text>
                <Text style={styles.caloriesLabel}>קלוריות</Text>
              </View>

              {/* Macros Indicators */}
              <View style={styles.macrosContainer}>
                <View style={[styles.macroIndicator, styles.proteinIndicator]}>
                  <Ionicons name="fitness" size={18} color="#fff" />
                  <Text style={styles.macroValue}>{editableResult.protein_g}g</Text>
                  <Text style={styles.macroLabel}>חלבון</Text>
                </View>

                <View style={[styles.macroIndicator, styles.carbsIndicator]}>
                  <Ionicons name="leaf" size={18} color="#fff" />
                  <Text style={styles.macroValue}>{editableResult.carbs_g}g</Text>
                  <Text style={styles.macroLabel}>פחמימות</Text>
                </View>

                <View style={[styles.macroIndicator, styles.fatIndicator]}>
                  <Ionicons name="water" size={18} color="#fff" />
                  <Text style={styles.macroValue}>{editableResult.fat_g}g</Text>
                  <Text style={styles.macroLabel}>שומן</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </View>

        {!editableResult && (
          <>
            <View style={styles.inputContainer}>
              <Ionicons
                name="restaurant-outline"
                size={20}
                color={isFocused ? "#66bb6a" : "#999"}
                style={styles.inputIcon}
              />
              <Animated.View style={[styles.inputWrapper, inputAnimatedStyle]}>
                <TextInput
                  ref={inputRef}
                  placeholder="תיאור קצר של הארוחה"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={description}
                  onSubmitEditing={dismissKeyboard}
                  onChangeText={setDescription}
                  returnKeyType="done"
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </Animated.View>
            </View>
            <Text style={styles.helperText}>
              לא חובה, אבל עוזר לדייק את התוצאה
              <Ionicons name="information-circle" size={12} color="#888" />
            </Text>

            <TouchableOpacity style={styles.analyzeButton} onPress={sendToAnalyze} disabled={loading}>
              {loading ? (
                <View style={styles.buttonContent}>
                  <Text style={styles.analyzeText}>מנתח...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.analyzeText}>נתח את התמונה</Text>
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {editableResult && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>ניתוח תזונתי</Text>
              {!editMode ? (
                <TouchableOpacity style={styles.editButton} onPress={toggleEditMode}>
                  <Ionicons name="pencil" size={16} color="#fff" />
                  <Text style={styles.editButtonText}>ערוך</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.cancelEditButton} onPress={resetToOriginal}>
                  <Ionicons name="refresh" size={16} color="#64748b" />
                  <Text style={styles.cancelEditText}>איפוס</Text>
                </TouchableOpacity>
              )}
            </View>

            {editMode ? (
              <View style={styles.editContainer}>
                <Text style={styles.editSectionTitle}>ערכים תזונתיים:</Text>
                <View style={styles.nutritionEditGrid}>
                  <View style={styles.nutritionEditItem}>
                    <Text style={styles.nutritionEditLabel}>קלוריות:</Text>
                    <TextInput
                      style={styles.nutritionEditInput}
                      value={editableResult.calories.toString()}
                      onChangeText={(value) => updateNutritionValue("calories", value)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.nutritionEditItem}>
                    <Text style={styles.nutritionEditLabel}>חלבון (g):</Text>
                    <TextInput
                      style={styles.nutritionEditInput}
                      value={editableResult.protein_g.toString()}
                      onChangeText={(value) => updateNutritionValue("protein_g", value)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.nutritionEditItem}>
                    <Text style={styles.nutritionEditLabel}>פחמימות (g):</Text>
                    <TextInput
                      style={styles.nutritionEditInput}
                      value={editableResult.carbs_g.toString()}
                      onChangeText={(value) => updateNutritionValue("carbs_g", value)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                  <View style={styles.nutritionEditItem}>
                    <Text style={styles.nutritionEditLabel}>שומן (g):</Text>
                    <TextInput
                      style={styles.nutritionEditInput}
                      value={editableResult.fat_g.toString()}
                      onChangeText={(value) => updateNutritionValue("fat_g", value)}
                      keyboardType="numeric"
                      textAlign="center"
                    />
                  </View>
                </View>
              </View>
            ) : (
              <PlateChart
                carbs={editableResult.carbs_g}
                protein={editableResult.protein_g}
                fat={editableResult.fat_g}
                totalCalories={editableResult.calories}
              />
            )}

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
              >
                {ingredients.length > 0 ? (
                  ingredients.map((ingredient) => (
                    <View key={ingredient.id} style={styles.ingredientItem}>
                      <View style={styles.ingredientNameContainer}>
                        <Ionicons name="nutrition-outline" size={16} color="#66bb6a" />
                        <Text style={styles.ingredientName}>{ingredient.name}</Text>
                      </View>
                      <View style={styles.ingredientAmountContainer}>
                        <TextInput
                          style={styles.ingredientAmountInput}
                          defaultValue={ingredient.amount.toString()}
                          keyboardType="numeric"
                          onChangeText={(text) => updateIngredientAmount(ingredient.id, text)}
                          editable={editMode}
                          textAlign="center"
                        />
                        <Text style={styles.ingredientUnit}>{ingredient.unit}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noIngredientsText}>לא נמצאו רכיבים</Text>
                )}
              </ScrollView>

              {editMode && (
                <TouchableOpacity style={styles.updateButton} onPress={recalculateNutrition}>
                  <Text style={styles.updateButtonText}>חשב מחדש</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSaveMeal}
                disabled={isSaving}
              >
                <Ionicons name="save-outline" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.saveButtonText}>{isSaving ? "שומר..." : "שמור ליומן"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  Alert.alert("מחיקת ארוחה", "האם אתה בטוח שברצונך למחוק את הארוחה?", [
                    {
                      text: "ביטול",
                      style: "cancel",
                    },
                    {
                      text: "מחק",
                      style: "destructive",
                      onPress: () => {
                        // Reset all states
                        setEditableResult(null)
                        setOriginalResult(null)
                        setIngredients([])
                        // Notify parent component
                        onResult?.(null)
                        // Dismiss if needed
                        onDismiss?.()
                      },
                    },
                  ])
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.deleteButtonText}>מחק</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Swipe hint indicator */}
        {!loading && (
          <View style={styles.swipeHintContainer}>
            <Text style={styles.swipeHintText}>החלק לסגירה</Text>
            <View style={styles.swipeHintArrows}>
              <Ionicons name="chevron-back" size={16} color="#999" />
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </View>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  )
}

export default MealAnalysisCard

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
    marginBottom: 60,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
    color: "#31333d",
    writingDirection: "rtl",
  },
  swipeHint: {
    padding: 4,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 220,
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // Modern input styling
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  input: {
    padding: 14,
    textAlign: "right",
    color: "#333",
    fontSize: 15,
    fontWeight: "500",
  },
  inputIcon: {
    marginLeft: 10,
  },
  analyzeButton: {
    backgroundColor: "#66bb6a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#66bb6a",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  analyzeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 12,
    textAlign: "right",
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  // Swipe hint styles
  swipeHintContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  swipeHintText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  swipeHintArrows: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Loading overlay styles
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  blurView: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(102, 187, 106, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  loadingPulse: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(102, 187, 106, 0.4)",
  },
  loadingText: {
    marginTop: 15,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Nutrition overlay styles
  nutritionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "space-between",
    padding: 12,
  },
  caloriesBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  caloriesValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#31333d",
  },
  caloriesLabel: {
    fontSize: 12,
    color: "#31333d",
    fontWeight: "600",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  macroIndicator: {
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOpacity: 0.2,
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
  resultContainer: {
    marginTop: 10,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#31333d",
    textAlign: "center",
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
  cancelEditButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  cancelEditText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  editContainer: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 10,
    textAlign: "right",
  },
  nutritionEditGrid: {
    flexDirection: "column",
    gap: 10,
  },
  nutritionEditItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nutritionEditLabel: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  nutritionEditInput: {
    width: 80,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 8,
    fontSize: 14,
    color: "#334155",
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
  updateButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 2,
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  // Action buttons
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10,
  },
  saveButton: {
    flex: 3,
    backgroundColor: "#66bb6a",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#66bb6a",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
})
