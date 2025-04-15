"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity } from "react-native"
import { auth } from "../../firebase"
import { useRouter } from "expo-router"
import {
  doc,
  getDoc,
  getFirestore,
  collection,
  addDoc,
  Timestamp,
  getDocs,
  query,
  where,
  setDoc,
} from "firebase/firestore"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import * as Animatable from "react-native-animatable"
import CircularCaloriesProgress from "../../components/meal/CircularCaloriesProgress"
import MacroNutrientsBar from "../../components/MacroNutrientsBar"
import { useIsFocused } from "@react-navigation/native"
import { calculateAge } from "../onbording/genderNAge"
import { useUserStore } from "../../stores/userStore"
import MealAnalysisCard from "../../components/meal/MealAnalysisCard"
import { useImageUploadStore } from "../../stores/imageUploadStore"
import KeyboardAvoidingContainer from "@/components/ui/KeyboardAvoidingContainer"
import { useFonts } from "expo-font"
import EditableNutritionResult from "../../components/meal/EditableNutritionResult"
import { useOnboarding } from "../../context/OnboardingContext"
import { API_URL } from '@/config';

const db = getFirestore()

// Define the types directly in this file to avoid import issues
type CalorieCalculationParams = {
  gender: string
  age: number
  weight: number
  height: number
  activityLevel: string
  activityType?: string
  goal?: string
  weeklyRate?: number
  experienceLevel?: string
  targetWeight?: number
}

type MacroCalculationParams = {
  weight: number
  dailyCalories: number
  activityLevel: string
  activityType?: string
  goal?: string
}

// Define the functions directly in this file
function calculateDailyCalories(params: CalorieCalculationParams): number {
  const { gender, age, weight, height, activityLevel, goal, weeklyRate, experienceLevel } = params

  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr = 0
  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161
  }

  // Apply activity multiplier - using more conservative ACSM-based values
  let activityMultiplier = 1.2 // Default for sedentary
  switch (activityLevel) {
    case "sedentary":
      activityMultiplier = 1.2
      break
    case "moderate":
      activityMultiplier = 1.375 // 2-4 times per week
      break
    case "active":
      activityMultiplier = 1.55 // 5-7 times per week
      break
    default:
      activityMultiplier = 1.2
  }

  let tdee = Math.round(bmr * activityMultiplier)

  // Adjust based on goal with more realistic values
  if (goal) {
    if (goal === "lose_weight" && weeklyRate) {
      // Each pound is roughly 3500 calories, so 0.5kg is about 3850 calories
      // Divide by 7 to get daily deficit
      const dailyDeficit = (weeklyRate * 7700) / 7
      tdee -= Math.round(dailyDeficit)
    } else if (goal === "gain_weight" && weeklyRate) {
      // Add calories for weight gain
      const dailySurplus = (weeklyRate * 7700) / 7
      tdee += Math.round(dailySurplus)
    } else if (goal === "build_muscle") {
      // For muscle building with weight loss goal, use a small deficit
      // For muscle building with maintenance/gain, use a small surplus
      const currentWeight = weight
      const targetWeight = params.targetWeight || weight

      if (targetWeight < currentWeight) {
        // Trying to lose weight while building muscle (recomp)
        tdee -= 250 // Small deficit for body recomposition
      } else {
        // Trying to maintain or gain while building muscle
        const surplus = experienceLevel === "beginner" ? 200 : 150
        tdee += surplus
      }
    }
  }

  // Ensure calories stay within reasonable limits
  return Math.max(1200, Math.min(tdee, 3000)) // Cap at 3000 calories
}

function calculateDailyMacros(params: MacroCalculationParams): {
  proteinG: number
  fatG: number
  carbsG: number
} {
  const { weight, dailyCalories, activityLevel, activityType, goal } = params

  // More realistic protein ratios based on scientific literature
  let proteinPerKg = 1.6 // Default protein in g/kg of bodyweight
  let fatRatio = 0.3 // Default 30% fat

  // Adjust macros based on goal and activity
  if (goal === "build_muscle") {
    proteinPerKg = 1.8 // Higher but reasonable protein for muscle building
    fatRatio = 0.25
  } else if (goal === "lose_weight") {
    proteinPerKg = 2.0 // Higher protein for satiety during weight loss
    fatRatio = 0.25
  } else if (goal === "gain_weight") {
    proteinPerKg = 1.6
    fatRatio = 0.3
  }

  // Further adjust based on activity type
  if (activityType === "anaerobic" || activityType === "mixed") {
    proteinPerKg += 0.2 // Slightly more protein for strength training
  }

  // Calculate protein in grams (with a reasonable cap)
  const proteinG = Math.min(Math.round(weight * proteinPerKg), Math.round(weight * 2.2))

  // Calculate fat in grams
  const fatG = Math.round((dailyCalories * fatRatio) / 9) // 9 calories per gram of fat

  // Calculate remaining calories for carbs
  const proteinCalories = proteinG * 4
  const fatCalories = fatG * 9
  const remainingCalories = dailyCalories - proteinCalories - fatCalories

  // Calculate carbs in grams
  const carbsG = Math.max(Math.round(remainingCalories / 4), 50) // Minimum 50g carbs, 4 calories per gram

  return { proteinG, fatG, carbsG }
}

export default function LoggedInHome() {
  const [result, setResult] = useState<{
    calories: number
    carbs_g: number
    protein_g: number
    fat_g: number
  } | null>(null)
  const [editableIngredients, setEditableIngredients] = useState<any | null>(null)
  const [consumedCalories, setConsumedCalories] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [clearTrigger, setClearTrigger] = useState<number>(0)
  const [todayMeals, setTodayMeals] = useState<any[]>([])
  const [userGender, setUserGender] = useState<string | null>(null)
  const [consumedProtein, setConsumedProtein] = useState(0)
  const [consumedCarbs, setConsumedCarbs] = useState(0)
  const [consumedFats, setConsumedFats] = useState(0)
  const { setDailyCalories, dailyCalories } = useUserStore()
  const [macros, setMacros] = useState({ proteinG: 0, fatG: 0, carbsG: 0 })
  const isFocused = useIsFocused()
  const [currentMealDocId, setCurrentMealDocId] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const image = useImageUploadStore((state) => state.imageUri)
  const imageBase64 = useImageUploadStore((state) => state.imageBase64)
  const clearImage = useImageUploadStore((state) => state.clearImage)
  const [fontsLoaded] = useFonts({
    "Heebo-Regular": require("../../assets/fonts/Heebo-Regular.ttf"),
  })
  const router = useRouter()
  const { onboardingData } = useOnboarding()

  const fetchUserData = async () => {
    // Try to get user from auth
    const user = auth.currentUser

    try {
      if (user) {
        // Registered user - fetch from Firebase
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data().onboarding
          calculateUserCalories(userData)
        }
      } else {
        // Non-registered user - use onboarding context data
        if (
          onboardingData.gender &&
          onboardingData.age &&
          onboardingData.weight &&
          onboardingData.height &&
          onboardingData.activityLevel
        ) {
          calculateUserCalories(onboardingData)
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error)
    }
  }

  // Helper function to calculate calories from user data
  const calculateUserCalories = (userData: any) => {
    if (!userData) return

    const age =
      userData.age instanceof Timestamp
        ? calculateAge(userData.age.toDate())
        : calculateAge(userData.age.toDate ? userData.age.toDate() : new Date())

    const calories = calculateDailyCalories({
      gender: userData.gender,
      age: age,
      weight: userData.weight,
      height: userData.height,
      activityLevel: userData.activityLevel,
      activityType: userData.activityType,
      goal: userData.goal,
      weeklyRate: userData.weeklyRate,
      experienceLevel: userData.experienceLevel,
      targetWeight: userData.targetWeight,
    })

    setUserGender(userData.gender)
    setDailyCalories(calories)

    const macros = calculateDailyMacros({
      weight: userData.weight,
      dailyCalories: calories,
      activityLevel: userData.activityLevel,
      activityType: userData.activityType,
      goal: userData.goal,
    })

    setMacros(macros)
  }

  const getGreeting = () => {
    if (userGender === "male") return "ברוך הבא! צלם או העלה תמונה של הארוחה שלך כדי לראות את הערכים התזונתיים שלה."
    if (userGender === "female")
      return "ברוכה הבאה! צלמי או העלי תמונה של הארוחה שלך כדי לראות את הערכים התזונתיים שלה."
    return "ברוך/ה הבא/ה! צלם/י או העלה/י תמונה של הארוחה שלך כדי לראות את הערכים התזונתיים שלה."
  }

  const fetchTodayMeals = async () => {
    const user = auth.currentUser
    if (!user) {
      // For non-registered users, just set zeros
      setConsumedCalories(0)
      setConsumedProtein(0)
      setConsumedCarbs(0)
      setConsumedFats(0)
      setTodayMeals([])
      return
    }

    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      const mealsRef = collection(db, "users", user.uid, "meals")
      const q = query(
        mealsRef,
        where("timestamp", ">=", Timestamp.fromDate(todayStart)),
        where("timestamp", "<=", Timestamp.fromDate(todayEnd)),
      )
      const snapshot = await getDocs(q)

      let totalCalories = 0
      let totalProtein = 0
      let totalCarbs = 0
      let totalFats = 0

      const meals: any[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        totalCalories += data.calories
        totalProtein += data.protein_g ?? 0
        totalCarbs += data.carbs_g ?? 0
        totalFats += data.fat_g ?? 0
        meals.push(data)
      })

      setConsumedCalories(totalCalories)
      setConsumedProtein(totalProtein)
      setConsumedCarbs(totalCarbs)
      setConsumedFats(totalFats)
      setTodayMeals(meals)
    } catch (err) {
      console.error("Failed to fetch meals:", err)
    }
  }

  useEffect(() => {
    fetchUserData()
    fetchTodayMeals()
  }, [])

  const saveMealToDatabase = async (mealData: any) => {
    const user = auth.currentUser
    if (!user) return
    try {
      const meal = {
        ...mealData,
        timestamp: Timestamp.now(),
      }

      if (currentMealDocId) {
        const mealRef = doc(db, "users", user.uid, "meals", currentMealDocId)
        await setDoc(mealRef, meal, { merge: true })
        console.log("✅ Meal updated:", currentMealDocId)
      } else {
        const docRef = await addDoc(collection(db, "users", user.uid, "meals"), meal)
        setCurrentMealDocId(docRef.id)
        console.log("🆕 New meal saved:", docRef.id)
      }

      fetchTodayMeals()
    } catch (error) {
      console.error("Failed to save/update meal:", error)
    }
  }

  const recalculateWithEditedIngredients = async (updatedIngredients: any) => {
    try {
      const response = await fetch(`${API_URL}/recalculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: updatedIngredients,
          originalTotals: result,
          originalIngredients: editableIngredients,
        }),
      })
      const data = await response.json()
      if (data.totals) {
        setResult(data.totals)
      } else {
        Alert.alert("שגיאה", "לא הצלחנו לחשב מחדש את התוצאה")
      }
    } catch (err) {
      console.error("❌ Error recalculating:", err)
      Alert.alert("שגיאה", "אירעה שגיאה בעת חישוב מחדש")
    }
  }

  const handleLogout = async () => {
    try {
      if (auth.currentUser) {
        await auth.signOut()
      }
      router.replace("/auth/visitor-home")
    } catch (error) {
      Alert.alert("שגיאה", "אירעה שגיאה בעת ההתנתקות")
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    setResult(null)
    setEditableIngredients(null)
    setCurrentMealDocId(null)
    setClearTrigger((prev) => prev + 1)
    await fetchUserData()
    await fetchTodayMeals()
    setRefreshing(false)
  }

  const resetAnalysisState = () => {
    setResult(null)
    setEditableIngredients(null)
    setCurrentMealDocId(null)
  }

  useEffect(() => {
    if (result) {
      saveMealToDatabase(result)
    }
  }, [result])

  useEffect(() => {
    if (image) {
      resetAnalysisState()
    }
  }, [image])

  const remainingCalories = dailyCalories - consumedCalories

  return (
    <LinearGradient colors={["#fbffff", "#dceaf8"]} style={styles.gradient}>
      <KeyboardAvoidingContainer>
        <Animatable.View
          key={isFocused ? "focused-title" : "unfocused-title"}
          animation="fadeInDown"
          duration={800}
          style={styles.titleRow}
        >
          <Text style={styles.title}>ניתוח הצלחת שלך</Text>
          <Ionicons name="restaurant" size={28} color="#31333d" />
        </Animatable.View>

        <Animatable.Text
          key={isFocused ? "focused-greeting" : "unfocused-greeting"}
          animation="fadeInUp"
          delay={300}
          style={styles.subtitle}
        >
          {getGreeting()}
        </Animatable.Text>

        <CircularCaloriesProgress consumed={consumedCalories} total={dailyCalories} />
        <Animatable.View
          key={isFocused ? "focused-macros" : "unfocused-macros"}
          animation="fadeInUp"
          delay={300}
          style={styles.macroRow}
        >
          <MacroNutrientsBar label="חלבון" consumed={consumedProtein} goal={macros.proteinG} color="#e95899" />
          <MacroNutrientsBar label="שומנים" consumed={consumedFats} goal={macros.fatG} color="#fc9e7f" />
          <MacroNutrientsBar label="פחמימות" consumed={consumedCarbs} goal={macros.carbsG} color="#32cbc6" />
        </Animatable.View>

        <TouchableOpacity onPress={() => router.push("/dailySummary")} activeOpacity={0.9} style={styles.summaryButton}>
          <Animatable.View
            key={isFocused ? "focused-summaryCard" : "unfocused-summaryCard"}
            animation="fadeInUp"
            delay={300}
            style={styles.summaryCard}
          >
            <View style={styles.summaryTextRow}>
              <Text style={styles.summaryTitle}>סיכום יומי</Text>
              <Ionicons name="stats-chart-sharp" size={20} color="#31333d" />
            </View>
            <Text style={styles.summarySubtitle}>לחץ לצפייה בהתקדמות היום</Text>
          </Animatable.View>
        </TouchableOpacity>

        {image && (
          <MealAnalysisCard
            key={image}
            image={image}
            result={result}
            onResult={(res) => setResult(res)}
            onDismiss={() => {
              clearImage()
              setResult(null)
              setEditableIngredients(null)
              setCurrentMealDocId(null)
            }}
            onSave={saveMealToDatabase}
          />
        )}

        {editableIngredients && showEditor && (
          <EditableNutritionResult
            initialIngredients={editableIngredients}
            originalTotals={result!}
            onRecalculate={recalculateWithEditedIngredients}
            onClose={() => setShowEditor(false)}
          />
        )}

        <View style={styles.logoutContainer}>
          <Button title={auth.currentUser ? "התנתקות" : "התחברות"} onPress={handleLogout} color="#31333d" />
        </View>
      </KeyboardAvoidingContainer>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 100,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    margin: 20,
    gap: 10,
  },
  wrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontFamily: "Heebo-Regular",
    fontSize: 28,
    fontWeight: "800",
    color: "#31333d",
    textAlign: "center",
    writingDirection: "rtl",
  },
  subtitle: {
    fontFamily: "Heebo-Regular",
    fontSize: 16,
    color: "#31333d",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    writingDirection: "rtl",
  },
  logoutContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#eee",
    marginTop: 10,
  },
  summaryButton: {
    width: "100%",
    alignSelf: "center",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#fdffff",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.05)",
  },
  summaryTextRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontFamily: "Heebo-Regular",
    fontSize: 18,
    textAlign: "right",
    writingDirection: "rtl",
    fontWeight: "700",
    color: "#31333d",
  },
  summarySubtitle: {
    fontFamily: "Heebo-Regular",
    fontSize: 14,
    color: "#31333d",
    marginTop: 4,
    textAlign: "right",
  },
  // New styles
  calorieSection: {
    marginVertical: 15,
    alignItems: "center",
  },
  mealCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    width: "90%",
    alignSelf: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  actionButton: {
    backgroundColor: "#31333d",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginVertical: 10,
    width: "80%",
    alignSelf: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 8,
  },
})
