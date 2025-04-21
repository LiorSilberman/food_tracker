// app/(tabs)/home.tsx
import { useState, useEffect } from "react"
import { View, Text, StyleSheet, Alert, TouchableOpacity, SafeAreaView, StatusBar, Platform } from "react-native"
import { auth } from "../../firebase"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import * as Animatable from "react-native-animatable"
import CircularCaloriesProgress from "../../components/meal/CircularCaloriesProgress"
import MacroNutrientsBar from "../../components/MacroNutrientsBar"
import { useIsFocused } from "@react-navigation/native"
import { useUserStore } from "../../stores/userStore"
import MealAnalysisCard from "../../components/meal/MealAnalysisCard"
import { useImageUploadStore } from "../../stores/imageUploadStore"
import KeyboardAvoidingContainer from "@/components/ui/KeyboardAvoidingContainer"
import { useFonts } from "expo-font"
import EditableNutritionResult from "../../components/meal/EditableNutritionResult"
import { useOnboarding } from "../../context/OnboardingContext"
import { saveMealToFirestoreAndSQLite } from "@/services/mealService"
import { fetchTodayMealsFromSQLite } from "@/services/sqliteService"
import { fetchOnboardingData } from "@/onboardingDB"
import BarcodeAnalysisCard from "@/components/meal/BarcodeAnalysisCard"
import { useBarcodeScanStore } from "@/stores/barcodeScanStore"

// ← Shared nutrition helpers
import {
  calculateDailyCalories,
  calculateDailyMacros,
} from "@/nutritionCalculator"
import { Meal } from "@/types/mealTypes"

export default function LoggedInHome() {
  const router = useRouter()
  const [result, setResult] = useState<{ calories: number; carbs_g: number; protein_g: number; fat_g: number } | null>(null)
  const scannedBarcodeMeal = useBarcodeScanStore((s) => s.scannedBarcodeMeal)
  const scannedIngredients = useBarcodeScanStore((s) => s.scannedIngredients)
  const clearScannedData = useBarcodeScanStore((s) => s.clearScannedData)
  const [editableIngredients, setEditableIngredients] = useState<any | null>(null)
  const [consumedCalories, setConsumedCalories] = useState(0)
  const [todayMeals, setTodayMeals] = useState<Meal[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [userGender, setUserGender] = useState<string | null>(null)
  const [consumedProtein, setConsumedProtein] = useState(0)
  const [consumedCarbs, setConsumedCarbs] = useState(0)
  const [consumedFats, setConsumedFats] = useState(0)
  const { setDailyCalories, dailyCalories } = useUserStore()
  const [macros, setMacros] = useState({ proteinG: 0, fatG: 0, carbsG: 0 })
  const isFocused = useIsFocused()
  const image = useImageUploadStore((s) => s.imageUri)
  const clearImage = useImageUploadStore((s) => s.clearImage)
  const { onboardingData } = useOnboarding()
  const [fontsLoaded] = useFonts({ "Heebo-Regular": require("../../assets/fonts/Heebo-Regular.ttf") })

  // --- Redirect non‑auth users who try to analyze a meal ---
  useEffect(() => {
    if (!auth.currentUser && (image || scannedBarcodeMeal)) {
      Alert.alert(
        "דרוש מנוי",
        "עליך לרכוש מנוי כדי להשתמש בניתוח הארוחות.",
        [{ text: "לרכוש", onPress: () => router.push("/purchase") }]
      )
      clearImage()
      clearScannedData()
    }
  }, [image, scannedBarcodeMeal])

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser
      const userData = user
        ? await fetchOnboardingData(user.uid)
        : onboardingData
      if (userData) applyNutritionCalculations(userData)
    } catch (err) {
      console.error("Failed to fetch user data:", err)
    }
  }

  const applyNutritionCalculations = (userData: any) => {
    // Normalize age parameter (Date-string or number)
    let ageParam: number | Date = new Date()
    if (typeof userData.age === "string") ageParam = new Date(userData.age)
    else if (typeof userData.age === "number") ageParam = userData.age

    // 1) Daily calories
    const calories = calculateDailyCalories({
      gender: userData.gender,
      age: ageParam,
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

    // 2) Daily macros
    const { proteinG, fatG, carbsG } = calculateDailyMacros({
      weight: userData.weight,
      dailyCalories: calories,
      activityLevel: userData.activityLevel,
      activityType: userData.activityType,
      goal: userData.goal,
    })
    setMacros({ proteinG, fatG, carbsG })
  }

  const getGreeting = () => {
    if (userGender === "male")
      return "ברוך הבא! צלם או העלה תמונה של הארוחה שלך כדי לראות את הערכים התזונתיים שלה."
    if (userGender === "female")
      return "ברוכה הבאה! צלמי או העלי תמונה של הארוחה שלך כדי לראות את הערכים התזונתיים שלה."
    return "ברוך/ה הבא/ה! צלם/י או העלה/י תמונה של הארוחה שלך כדי לראות את הערכים התזונתיים שלה."
  }

  const fetchTodayMeals = async () => {
    const user = auth.currentUser
    if (!user) return
    try {
      const meals = (await fetchTodayMealsFromSQLite(user.uid)) as Meal[]
      let cals = 0, prot = 0, carbs = 0, fats = 0
      meals.forEach((m) => {
        cals += m.calories || 0
        prot += m.protein_g || 0
        carbs += m.carbs_g || 0
        fats += m.fat_g || 0
      })
      setConsumedCalories(cals)
      setConsumedProtein(prot)
      setConsumedCarbs(carbs)
      setConsumedFats(fats)
      setTodayMeals(meals)
    } catch (err) {
      console.error("❌ Failed to fetch meals:", err)
    }
  }

  useEffect(() => {
    if (isFocused || refreshTrigger) {
      fetchUserData()
      fetchTodayMeals()
    }
  }, [isFocused, refreshTrigger])

  const saveMealToDatabase = async (mealData: any) => {
    try {
      // optimistic UI update
      setConsumedCalories((p) => p + (mealData.calories || 0))
      setConsumedProtein((p) => p + (mealData.protein_g || 0))
      setConsumedCarbs((p) => p + (mealData.carbs_g || 0))
      setConsumedFats((p) => p + (mealData.fat_g || 0))

      await saveMealToFirestoreAndSQLite(mealData)
      setRefreshTrigger((p) => p + 1)
      resetAnalysisState()
    } catch (err) {
      console.error("Failed to save meal:", err)
      Alert.alert("שגיאה", "אירעה שגיאה בשמירת הארוחה")
      fetchTodayMeals()
    }
  }

  const recalculateWithEditedIngredients = async (updatedIngredients: any) => {
    try {
      const res = await fetch("http://192.168.1.102:5000/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: updatedIngredients,
          originalTotals: result,
          originalIngredients: editableIngredients,
        }),
      })
      const data = await res.json()
      if (data.totals) setResult(data.totals)
      else Alert.alert("שגיאה", "לא הצלחנו לחשב מחדש את התוצאה")
    } catch (err) {
      console.error("❌ Error recalculating:", err)
      Alert.alert("שגיאה", "אירעה שגיאה בעת חישוב מחדש")
    }
  }

  const handleLogout = async () => {
    try {
      if (auth.currentUser) await auth.signOut()
      router.replace("/auth/visitor-home")
    } catch {
      Alert.alert("שגיאה", "אירעה שגיאה בעת ההתנתקות")
    }
  }

  const resetAnalysisState = () => {
    setResult(null)
    setEditableIngredients(null)
  }

  useEffect(() => {
    if (image) resetAnalysisState()
  }, [image])

  return (
    <LinearGradient colors={["#fbffff", "#dceaf8"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        {/* Logout Button - Top Right */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={24} color="#31333d" />
        </TouchableOpacity>

        <KeyboardAvoidingContainer>
          <Animatable.View animation="fadeInDown" duration={800} style={styles.titleRow}>
            <Text style={styles.title}>ניתוח הצלחת שלך</Text>
            <Ionicons name="restaurant" size={28} color="#31333d" />
          </Animatable.View>

          <Animatable.Text animation="fadeInUp" delay={300} style={styles.subtitle}>
            {getGreeting()}
          </Animatable.Text>

          <CircularCaloriesProgress consumed={consumedCalories} total={dailyCalories} />

          <Animatable.View animation="fadeInUp" delay={300} style={styles.macroRow}>
            <MacroNutrientsBar label="חלבון" consumed={consumedProtein} goal={macros.proteinG} color="#e95899" />
            <MacroNutrientsBar label="שומנים" consumed={consumedFats} goal={macros.fatG} color="#fc9e7f" />
            <MacroNutrientsBar label="פחמימות" consumed={consumedCarbs} goal={macros.carbsG} color="#32cbc6" />
          </Animatable.View>

          <TouchableOpacity onPress={() => router.push("/dailySummary")} activeOpacity={0.9} style={styles.summaryButton}>
            <Animatable.View animation="fadeInUp" delay={300} style={styles.summaryCard}>
              <View style={styles.summaryTextRow}>
                <Text style={styles.summaryTitle}>סיכום יומי</Text>
                <Ionicons name="stats-chart-sharp" size={20} color="#31333d" />
              </View>
              <Text style={styles.summarySubtitle}>לחץ לצפייה בהתקדמות היום</Text>
            </Animatable.View>
          </TouchableOpacity>

          {/* Subscription Button - Floating at bottom */}
          <Animatable.View animation="fadeInUp" delay={400} style={styles.subscriptionContainer}>
            <LinearGradient
              colors={["#5e72e4", "#825ee4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.subscriptionButton}
            >
              <TouchableOpacity
                style={styles.subscriptionTouchable}
                onPress={() => router.push("/purchase")}
                activeOpacity={0.9}
              >
                <Ionicons name="star" size={20} color="#ffffff" style={styles.subscriptionIcon} />
                <Text style={styles.subscriptionText}>הצטרפות למנוי פרימיום</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animatable.View>

          {image && auth.currentUser && (
            <MealAnalysisCard
              key={image}
              image={image}
              result={result}
              onResult={setResult}
              onDismiss={() => {
                clearImage()
                resetAnalysisState()
              }}
              onSave={saveMealToDatabase}
            />
          )}

          {scannedBarcodeMeal && auth.currentUser && (
            <BarcodeAnalysisCard
              meal={scannedBarcodeMeal}
              ingredients={scannedIngredients}
              onSave={saveMealToDatabase}
              onDismiss={clearScannedData}
            />
          )}

          {editableIngredients && (
            <EditableNutritionResult
              initialIngredients={editableIngredients}
              originalTotals={result!}
              onRecalculate={recalculateWithEditedIngredients}
              onClose={() => setEditableIngredients(null)}
            />
          )}
        </KeyboardAvoidingContainer>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { 
    flex: 1, 
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  titleRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8, 
    marginBottom: 12, 
    paddingHorizontal: 16,
    marginTop: 16,
  },
  title: { 
    fontFamily: "Heebo-Regular", 
    fontSize: 28, 
    fontWeight: "800", 
    color: "#31333d", 
    textAlign: "center", 
    writingDirection: "rtl" 
  },
  subtitle: { 
    fontFamily: "Heebo-Regular", 
    fontSize: 16, 
    color: "#31333d", 
    marginBottom: 24, 
    textAlign: "center", 
    lineHeight: 24, 
    paddingHorizontal: 20, 
    writingDirection: "rtl" 
  },
  macroRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginVertical: 20, 
    gap: 10 
  },
  summaryButton: { 
    width: "100%", 
    alignSelf: "center", 
    marginBottom: 20 
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
    alignItems: "center" 
  },
  summaryTitle: { 
    fontFamily: "Heebo-Regular", 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#31333d", 
    textAlign: "right", 
    writingDirection: "rtl" 
  },
  summarySubtitle: { 
    fontFamily: "Heebo-Regular", 
    fontSize: 14, 
    color: "#31333d", 
    marginTop: 4, 
    textAlign: "right" 
  },
  // New logout button styles
  logoutButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 10,
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  // New subscription button styles
  subscriptionContainer: {
    width: '90%',
    alignSelf: 'center',
    marginVertical: 20,
  },
  subscriptionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#5e72e4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  subscriptionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  subscriptionIcon: {
    marginRight: 8,
  },
  subscriptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: "Heebo-Regular",
  },
})