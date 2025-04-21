"use client"

import { useEffect, useState, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native"
import { auth } from "../../firebase"
import { useRouter } from "expo-router"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import * as Animatable from "react-native-animatable"
import ConfettiCannon from "react-native-confetti-cannon"
import { useIsFocused } from "@react-navigation/native"
import { useUserStore } from "../../stores/userStore"
import { LinearGradient } from "expo-linear-gradient"
import { deleteMealFromFirestoreAndSQLite, updateMealInFirestoreAndSQLite } from "@/services/mealService"
import { fetchTodayMealsFromSQLite } from "@/services/sqliteService"
import { Meal } from "@/types/mealTypes"
import { useMealRefreshStore } from "@/stores/useMealRefreshStore"

const { width, height } = Dimensions.get("window")

// Helper function to determine meal type based on time
const getMealType = (date: Date) => {
  const hour = date.getHours()
  if (hour >= 4 && hour < 11) return { type: "breakfast", icon: "coffee", label: "ארוחת בוקר" }
  if (hour >= 11 && hour < 15) return { type: "lunch", icon: "food", label: "ארוחת צהריים" }
  if (hour >= 15 && hour < 18) return { type: "snack", icon: "fruit-apple", label: "ארוחת ביניים" }
  if (hour >= 18 && hour < 22) return { type: "dinner", icon: "food-fork-drink", label: "ארוחת ערב" }
  return { type: "snack", icon: "food-apple", label: "חטיף" }
}

// Helper function to format time
const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function DailySummaryScreen() {
  const [meals, setMeals] = useState<any[]>([])
  const { refreshKey } = useMealRefreshStore()
  const [consumed, setConsumed] = useState(0)
  const [consumedProtein, setConsumedProtein] = useState(0)
  const [consumedCarbs, setConsumedCarbs] = useState(0)
  const [consumedFats, setConsumedFats] = useState(0)
  const dailyCalories = useUserStore((state) => state.dailyCalories)
  const [percentCalories, setPercentCalories] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const confettiRef = useRef<any>(null)
  const router = useRouter()
  const isFocused = useIsFocused()
  const [animateValue, setAnimateValue] = useState(0)
  const [showAnimation, setShowAnimation] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [currentEditMeal, setCurrentEditMeal] = useState<any>(null)
  const [editValues, setEditValues] = useState({
    calories: "",
    protein_g: "",
    carbs_g: "",
    fat_g: "",
  })

  const fetchMeals = async () => {
    const user = auth.currentUser
    if (!user) return

    try {
      const mealsFromDB = (await fetchTodayMealsFromSQLite(user.uid)) as Meal[]

      let total = 0
      let protein = 0
      let carbs = 0
      let fats = 0

      mealsFromDB.forEach((meal) => {
        total += meal.calories || 0
        protein += meal.protein_g || 0
        carbs += meal.carbs_g || 0
        fats += meal.fat_g || 0
      })

      mealsFromDB.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      setMeals(mealsFromDB)
      setConsumed(total)
      setConsumedProtein(protein)
      setConsumedCarbs(carbs)
      setConsumedFats(fats)
      setPercentCalories((total / dailyCalories) * 100)

      setTimeout(() => {
        setShowAnimation(true)
        setAnimateValue(total)
      }, 500)
    } catch (err) {
      console.error("❌ Error fetching meals from SQLite:", err)
      Alert.alert("שגיאה", "שגיאה בטעינת הארוחות מהדאטהבייס המקומי")
    }
  }
  useEffect(() => {
    if (isFocused) {
      fetchMeals()
    }
  }, [dailyCalories, isFocused])

  useEffect(() => {
    if (percentCalories >= 100 && !showConfetti && isFocused) {
      setShowConfetti(true)
      setTimeout(() => {
        if (confettiRef.current) {
          confettiRef.current.start()
        }
      }, 1000)
    }
  }, [percentCalories, isFocused])

  // Calculate remaining calories
  const remaining = dailyCalories - consumed
  const remainingText = remaining > 0 ? `נותרו ${remaining} קלוריות` : `חריגה של ${Math.abs(remaining)} קלוריות`

  // Calculate fill color based on percentage
  const getFillColor = (percent: number) => {
    if (percent <= 70) return ["#4CAF50", "#8BC34A"]
    if (percent <= 100) return ["#FFC107", "#FF9800"]
    return ["#FF5722", "#F44336"]
  }

  const fillColors = getFillColor(percentCalories)

  // Handle editing a meal
  const handleEditMeal = (meal: any) => {
    setCurrentEditMeal(meal)
    setEditValues({
      calories: meal.calories?.toString() || "0",
      protein_g: meal.protein_g?.toString() || "0",
      carbs_g: meal.carbs_g?.toString() || "0",
      fat_g: meal.fat_g?.toString() || "0",
    })
    setEditModalVisible(true)
  }

  // Handle saving edited meal
  const handleSaveEdit = async () => {
    if (!currentEditMeal) return

    try {
      const updatedMealData = {
        calories: Number(editValues.calories),
        protein_g: Number(editValues.protein_g),
        carbs_g: Number(editValues.carbs_g),
        fat_g: Number(editValues.fat_g),
      }

      await updateMealInFirestoreAndSQLite(currentEditMeal.id, updatedMealData)
      setEditModalVisible(false)
      setCurrentEditMeal(null)
      await fetchMeals()
    } catch (error) {
      console.error("Error updating meal:", error)
      Alert.alert("שגיאה", "אירעה שגיאה בעדכון הארוחה")
    }
  }

  // Handle deleting a meal
  const handleDeleteMeal = (meal: any) => {
    Alert.alert("מחיקת ארוחה", "האם אתה בטוח שברצונך למחוק ארוחה זו?", [
      {
        text: "ביטול",
        style: "cancel",
      },
      {
        text: "מחק",
        style: "destructive",
        onPress: async () => {
          try {
            setIsDeleting(true)
            await deleteMealFromFirestoreAndSQLite(meal.id)
            await fetchMeals()
          } catch (error) {
            console.error("Error deleting meal:", error)
            Alert.alert("שגיאה", "אירעה שגיאה במחיקת הארוחה")
          } finally {
            setIsDeleting(false)
          }
        },
      },
    ])
  }

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/home")}>
          <Ionicons name="chevron-back" size={28} color="#0891b2" />
        </TouchableOpacity>

        <Animatable.View animation="fadeIn" duration={800}>
          <Text style={styles.title}>סיכום יומי</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </Animatable.View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="fadeInUp" duration={1000} delay={200} style={styles.progressCard}>
          <AnimatedCircularProgress
            size={180}
            width={15}
            backgroundWidth={8}
            duration={1500}
            fill={percentCalories}
            // tintColorSecondary={fillColors[0]}
            tintColor={fillColors[1]}
            backgroundColor="#e2e8f0"
            rotation={0}
            lineCap="round"
          >
            {() => (
              <Animatable.View animation={showAnimation ? "bounceIn" : undefined} style={styles.circleContent}>
                <Text style={styles.calorieCount}>{animateValue}</Text>
                <Text style={styles.calorieLabel}>קלוריות</Text>
                <Text style={[styles.remainingCalories, { color: remaining > 0 ? "#0891b2" : "#ef4444" }]}>
                  {remainingText}
                </Text>
              </Animatable.View>
            )}
          </AnimatedCircularProgress>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.macroCard}>
          <Text style={styles.macroTitle}>אבות מזון</Text>

          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroIcon, { backgroundColor: "#e9d5ff" }]}>
                <MaterialCommunityIcons name="food-steak" size={20} color="#9333ea" />
              </View>
              <Text style={styles.macroValue}>{Math.round(consumedProtein)}g</Text>
              <Text style={styles.macroLabel}>חלבון</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIcon, { backgroundColor: "#fed7aa" }]}>
                <MaterialCommunityIcons name="bread-slice" size={20} color="#f97316" />
              </View>
              <Text style={styles.macroValue}>{Math.round(consumedCarbs)}g</Text>
              <Text style={styles.macroLabel}>פחמימות</Text>
            </View>

            <View style={styles.macroItem}>
              <View style={[styles.macroIcon, { backgroundColor: "#fecdd3" }]}>
                <MaterialCommunityIcons name="oil" size={20} color="#e11d48" />
              </View>
              <Text style={styles.macroValue}>{Math.round(consumedFats)}g</Text>
              <Text style={styles.macroLabel}>שומנים</Text>
            </View>
          </View>
        </Animatable.View>

        <View style={styles.mealsSection}>
          <Animatable.View animation="fadeInUp" duration={800} delay={600} style={styles.mealsTitleContainer}>
            <Text style={styles.mealsTitle}>הארוחות שלי</Text>
            <View style={styles.mealsDivider} />
          </Animatable.View>
          {isDeleting && (
            <ActivityIndicator size="small" color="#ef4444" style={{ marginTop: 10 }} />
          )}
          {meals.length === 0 ? (
            <Animatable.View animation="fadeIn" duration={800} delay={800} style={styles.emptyState}>
              <MaterialCommunityIcons name="food-off" size={60} color="#94a3b8" />
              <Text style={styles.emptyStateText}>עדיין לא נרשמו ארוחות היום</Text>
            </Animatable.View>

          ) : (

            meals.map((meal, idx) => {
              const mealTime = new Date(meal.timestamp)
              const { icon, label } = getMealType(mealTime)

              return (
                <Animatable.View
                  key={`meal-${meal.id || idx}`}
                  animation="fadeInUp"
                  delay={700 + idx * 100}
                  duration={500}
                  style={styles.mealItem}
                >
                  <View style={styles.mealIconContainer}>
                    <MaterialCommunityIcons name={icon as any} size={24} color="#0891b2" />
                  </View>

                  <View style={styles.mealContent}>
                    <View style={styles.mealHeader}>
                      <Text style={styles.mealType}>{label}</Text>
                      <Text style={styles.mealTime}>{formatTime(mealTime)}</Text>
                    </View>

                    <View style={styles.mealDetails}>
                      <View style={styles.mealCalories}>
                        <Text style={styles.calorieValue}>{meal.calories}</Text>
                        <Text style={styles.calorieUnit}> קלוריות</Text>
                      </View>

                      <View style={styles.mealNutrients}>
                        {meal.protein_g && (
                          <Text style={styles.nutrientText}>חלבון: {Math.round(meal.protein_g)}g</Text>
                        )}
                        {meal.carbs_g && <Text style={styles.nutrientText}>פחמ': {Math.round(meal.carbs_g)}g</Text>}
                        {meal.fat_g && <Text style={styles.nutrientText}>שומן: {Math.round(meal.fat_g)}g</Text>}
                      </View>
                    </View>

                    <View style={styles.mealActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditMeal(meal)}>
                        <Ionicons name="pencil" size={18} color="#0891b2" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteMeal(meal)}>
                        <Ionicons name="trash" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animatable.View>
              )
            })
          )}
        </View>

        {/* Edit Meal Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>עריכת ארוחה</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>קלוריות:</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editValues.calories}
                  onChangeText={(text) => setEditValues({ ...editValues, calories: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>חלבון (גרם):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editValues.protein_g}
                  onChangeText={(text) => setEditValues({ ...editValues, protein_g: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>פחמימות (גרם):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editValues.carbs_g}
                  onChangeText={(text) => setEditValues({ ...editValues, carbs_g: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>שומן (גרם):</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editValues.fat_g}
                  onChangeText={(text) => setEditValues({ ...editValues, fat_g: text })}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>ביטול</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveEdit}>
                  <Text style={styles.saveButtonText}>שמור</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={150}
          origin={{ x: width / 2, y: -10 }}
          explosionSpeed={350}
          fallSpeed={2500}
          fadeOut
          colors={["#22c55e", "#10b981", "#3b82f6", "#8b5cf6", "#f97316", "#f59e0b"]}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
  },
  date: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  progressCard: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  circleContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  calorieCount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#0f172a",
  },
  calorieLabel: {
    fontSize: 16,
    color: "#64748b",
    marginTop: -5,
  },
  remainingCalories: {
    fontSize: 14,
    marginTop: 8,
    fontWeight: "500",
  },
  macroCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  macroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
    textAlign: "right",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
  },
  macroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  macroLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  mealsSection: {
    paddingHorizontal: 20,
    direction: "rtl",
  },
  mealsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  mealsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginLeft: 12,
  },
  mealsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#cbd5e1",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 12,
  },
  mealItem: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  mealIconContainer: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236, 253, 245, 0.8)",
  },
  mealContent: {
    flex: 1,
    padding: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  mealTime: {
    fontSize: 14,
    color: "#64748b",
  },
  mealDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealCalories: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  calorieValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0891b2",
  },
  calorieUnit: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 4,
  },
  mealNutrients: {
    flexDirection: "row",
    gap: 8,
  },
  nutrientText: {
    fontSize: 13,
    color: "#64748b",
  },
  // New styles for edit and delete actions
  mealActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 6,
    textAlign: "right",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    fontSize: 16,
    textAlign: "right",
    direction: "rtl",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#0891b2",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
})
