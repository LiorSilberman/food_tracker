"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@expo/vector-icons"
import * as Animatable from "react-native-animatable"
import { BarChart, LineChart } from "react-native-chart-kit"
import { auth } from "../../firebase"
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  Timestamp,
  addDoc,
} from "firebase/firestore"
import { useUserStore } from "../../stores/userStore"
import { useOnboarding } from "../../context/OnboardingContext"
import { Stack } from "expo-router"
import { useIsFocused } from "@react-navigation/native"

const db = getFirestore()
const { width } = Dimensions.get("window")

// Helper function to format date
const formatDate = (date: Date): string => {
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })
}

// Replace the getDayName function with this implementation
const getDayName = (date: Date): string => {
  const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000)
  const day = localDate.getDay()
  const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
  return hebrewDays[day]
}

// Helper function to get motivational message
const getMotivationalMessage = (progress: number): string => {
  if (progress >= 100) return "כל הכבוד! השגת את היעד שלך! 🎉"
  if (progress >= 75) return "כמעט שם! עוד קצת מאמץ ותגיע ליעד! 💪"
  if (progress >= 50) return "חצי דרך! אתה עושה עבודה נהדרת! 🌟"
  if (progress >= 25) return "התחלה מצוינת! המשך כך! 🚀"
  return "כל מסע מתחיל בצעד קטן. אתה בדרך הנכונה! 👣"
}

// Helper function to calculate remaining kg
const getRemainingWeight = (currentWeight: number, targetWeight: number): string => {
  const diff = Math.abs(currentWeight - targetWeight).toFixed(1)
  return currentWeight > targetWeight ? `נותרו ${diff} ק"ג להורדה` : `נותרו ${diff} ק"ג לעלייה`
}

export default function ProgressScreen() {
  // State variables
  const [loading, setLoading] = useState(true)
  const [goalData, setGoalData] = useState<any>(null)
  const [calorieData, setCalorieData] = useState<any[]>([])
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [newWeight, setNewWeight] = useState("")
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [weightModalVisible, setWeightModalVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [weightChangeDirection, setWeightChangeDirection] = useState<"up" | "down" | "none">("none")
  const [weightChangeAmount, setWeightChangeAmount] = useState<number>(0)

  const { onboardingData } = useOnboarding()
  const { dailyCalories } = useUserStore()
  const isFocused = useIsFocused()

  // Calculate progress and weight change
  const calculateProgress = useCallback((current: number | null, goal: any) => {
    if (!current || !goal || goal.startWeight === goal.targetWeight) return 0

    const weightDiff = Math.abs(goal.startWeight - goal.targetWeight)
    const currentDiff = Math.abs(current - goal.targetWeight)
    const progressPercent = ((weightDiff - currentDiff) / weightDiff) * 100

    return Math.min(100, Math.max(0, progressPercent))
  }, [])

  const calculateWeightChange = useCallback((current: number | null, history: any[]) => {
    if (!current || history.length < 2) return { direction: "none" as const, amount: 0 }

    // Get the previous weight entry (excluding the most recent one which is current)
    const sortedHistory = [...history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    if (sortedHistory.length < 2) return { direction: "none" as const, amount: 0 }

    const previousWeight = sortedHistory[1].weight
    const diff = current - previousWeight

    return {
      direction: diff > 0 ? ("up" as const) : diff < 0 ? ("down" as const) : ("none" as const),
      amount: Math.abs(diff),
    }
  }, [])

  // Fetch user data from Firestore
  const fetchUserData = useCallback(async () => {
    setLoading(true)
    try {
      const user = auth.currentUser

      if (user) {
        // Fetch user goal data
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        if (userSnap.exists()) {
          const userData = userSnap.data()
          const onboardingData = userData.onboarding || {}
          const createdDate = userData.createdAt || {}

          const calculateDuration = () => {
            const { weight, targetWeight, weeklyRate } = onboardingData
            if (weight && targetWeight && weeklyRate) {
              return Math.ceil(Math.abs(weight - targetWeight) / weeklyRate)
            }
            return 90 // default
          }

          // Set goal data
          const goalInfo = {
            startWeight: onboardingData.weight || 0,
            targetWeight: onboardingData.targetWeight || 0,
            goal: onboardingData.goal || "maintain_weight",
            startDate: new Date(createdDate) || new Date(),
            duration: calculateDuration(),
            weeklyRate: onboardingData.weeklyRate || 0.5,
          }

          setGoalData(goalInfo)

          // Fetch weight history
          const weightRef = collection(db, "users", user.uid, "weight")
          const weightQuery = query(weightRef, orderBy("timestamp", "asc"))

          const weightSnap = await getDocs(weightQuery)
          const weightData: any[] = []

          weightSnap.forEach((doc) => {
            const data = doc.data()
            weightData.push({
              id: doc.id,
              weight: data.weight,
              timestamp: data.timestamp.toDate(),
            })
          })

          // Add the starting weight to the weight history if it doesn't exist yet
          if (
            weightData.length === 0 ||
            (weightData.length > 0 &&
              new Date(weightData[0].timestamp).getTime() > new Date(goalInfo.startDate).getTime())
          ) {
            // Add starting weight at the account creation date
            weightData.unshift({
              id: "starting-weight",
              weight: goalInfo.startWeight,
              timestamp: goalInfo.startDate,
            })
          }

          setWeightHistory(weightData)

          // Set current weight (most recent entry or starting weight)
          let currentWeightValue = goalInfo.startWeight
          if (weightData.length > 0) {
            currentWeightValue = weightData[weightData.length - 1].weight
          }

          setCurrentWeight(currentWeightValue)

          // Calculate progress
          const progressValue = calculateProgress(currentWeightValue, goalInfo)
          setProgress(progressValue)

          // Calculate weight change
          const { direction, amount } = calculateWeightChange(currentWeightValue, weightData)
          setWeightChangeDirection(direction)
          setWeightChangeAmount(amount)

          // Fetch last 7 days of calorie data
          const today = new Date()
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(today.getDate() - 6) // Get 7 days including today

          const mealsRef = collection(db, "users", user.uid, "meals")
          const mealsQuery = query(
            mealsRef,
            where("timestamp", ">=", Timestamp.fromDate(sevenDaysAgo)),
            orderBy("timestamp", "asc"),
          )

          const mealsSnap = await getDocs(mealsQuery)

          // Process meals data by day
          const mealsByDay: { [key: string]: any } = {}

          mealsSnap.forEach((doc) => {
            const mealData = doc.data()
            const mealDate = mealData.timestamp.toDate()
            const dateKey = mealDate.toISOString().split("T")[0]

            if (!mealsByDay[dateKey]) {
              mealsByDay[dateKey] = {
                date: mealDate,
                calories: 0,
                protein_g: 0,
                carbs_g: 0,
                fat_g: 0,
                meals: [],
              }
            }

            mealsByDay[dateKey].calories += mealData.calories || 0
            mealsByDay[dateKey].protein_g += mealData.protein_g || 0
            mealsByDay[dateKey].carbs_g += mealData.carbs_g || 0
            mealsByDay[dateKey].fat_g += mealData.fat_g || 0
            mealsByDay[dateKey].meals.push(mealData)
          })

          // Fill in missing days
          const processedData = []
          for (let i = 0; i < 7; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() - (6 - i))
            const dateKey = date.toISOString().split("T")[0]

            if (mealsByDay[dateKey]) {
              processedData.push(mealsByDay[dateKey])
            } else {
              processedData.push({
                date,
                calories: 0,
                protein_g: 0,
                carbs_g: 0,
                fat_g: 0,
                meals: [],
              })
            }
          }

          setCalorieData(processedData)
        }
      } else {
        // Handle non-authenticated user
        // For demo purposes, we'll use onboarding context data
        if (onboardingData) {
          const goalInfo = {
            startWeight: onboardingData.weight || 0,
            targetWeight: onboardingData.targetWeight || 0,
            goal: onboardingData.goal || "maintain_weight",
            startDate: new Date(),
            duration: 90, // Default 90 days
            weeklyRate: onboardingData.weeklyRate || 0.5,
          }

          setGoalData(goalInfo)
          setCurrentWeight(goalInfo.startWeight)

          // Generate mock data for demo
          const mockCalorieData = []
          const today = new Date()

          for (let i = 0; i < 7; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() - (6 - i))

            mockCalorieData.push({
              date,
              calories: Math.floor(Math.random() * 500) + 1500,
              protein_g: Math.floor(Math.random() * 30) + 70,
              carbs_g: Math.floor(Math.random() * 50) + 150,
              fat_g: Math.floor(Math.random() * 20) + 50,
              meals: [],
            })
          }

          setCalorieData(mockCalorieData)

          // Generate mock weight history
          const mockWeightHistory = []
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 30)

          for (let i = 0; i < 5; i++) {
            const date = new Date(startDate)
            date.setDate(startDate.getDate() + i * 7)

            // Simulate weight progress
            const weightProgress = (i * (goalInfo.targetWeight - goalInfo.startWeight)) / 10
            const weight = goalInfo.startWeight + weightProgress

            mockWeightHistory.push({
              id: `mock-${i}`,
              weight,
              timestamp: date,
            })
          }

          setWeightHistory(mockWeightHistory)

          // Calculate progress
          const progressValue = calculateProgress(goalInfo.startWeight, goalInfo)
          setProgress(progressValue)
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }, [calculateProgress, calculateWeightChange])

  // Fetch data on mount and when focused
  useEffect(() => {
    if (isFocused) {
      fetchUserData()
    }
  }, [isFocused, fetchUserData])

  // Update weight in Firestore
  const handleWeightUpdate = async () => {
    if (!newWeight || isNaN(Number.parseFloat(newWeight))) {
      return
    }

    const weightValue = Number.parseFloat(newWeight)

    try {
      const user = auth.currentUser
      if (!user) return

      // Add new weight entry
      const weightRef = collection(db, "users", user.uid, "weight")
      await addDoc(weightRef, {
        weight: weightValue,
        timestamp: Timestamp.now(),
      })

      // Find the previous weight (before this update)
      const previousWeight = currentWeight
      // Update current weight
      setCurrentWeight(weightValue)

      // Update weight history
      const newEntry = {
        id: `new-${Date.now()}`,
        weight: weightValue,
        timestamp: new Date(),
      }

      const updatedHistory = [...weightHistory, newEntry]
      setWeightHistory(updatedHistory)

      // Recalculate progress
      if (goalData) {
        const progressValue = calculateProgress(weightValue, goalData)
        setProgress(progressValue)

        // Calculate weight change
        const { direction, amount } = calculateWeightChange(weightValue, updatedHistory)
        setWeightChangeDirection(direction)
        setWeightChangeAmount(amount)
      }

      // Close modal and reset input
      setWeightModalVisible(false)
      setNewWeight("")
    } catch (error) {
      console.error("Error updating weight:", error)
    }
  }

  // Handle bar press to show daily macros
  const handleBarPress = (index: number) => {
    console.log("Bar pressed at index:", index)
    if (index >= 0 && index < calorieData.length) {
      setSelectedDay(calorieData[index])
      setModalVisible(true)
    }
  }

  // Prepare chart data
  const barChartData = {
    labels: calorieData.map((day, index) => {
        const localDate = new Date(day.date.getTime() + day.date.getTimezoneOffset() * 60000); // Convert to local time
        const oneDay = localDate.getDay();
        const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
        return hebrewDays[oneDay];
    }),
    datasets: [
      {
        data: calorieData.map((day) => day.calories),
      },
    ],
  }

  const lineChartData = {
    labels: weightHistory.map((entry) => formatDate(entry.timestamp)),
    datasets: [
      {
        data: weightHistory.map((entry) => entry.weight),
        color: (opacity = 1) => `rgba(50, 203, 198, ${opacity})`,
        strokeWidth: 2,
      },
    ],
    legend: ["משקל (ק״ג)"],
  }

  // If target weight exists, add it as a dotted line
  if (goalData && goalData.targetWeight) {
    lineChartData.datasets.push({
      data: Array(weightHistory.length).fill(goalData.targetWeight),
      color: (opacity = 1) => `rgba(233, 88, 153, ${opacity})`,
      strokeWidth: 2,
      // Use a custom property that will be passed to the SVG path
      // The library will pass this through even if TypeScript doesn't recognize it
      // @ts-ignore - strokeDashArray is supported by the SVG renderer but not typed correctly
      strokeDashArray: [5, 5],
    })
  }

  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(50, 203, 198, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#ffa726",
    },
  }

  // Get goal description
  const getGoalDescription = () => {
    if (!goalData || !currentWeight) return ""

    let description = ""
    const weightDiff = Math.abs(goalData.targetWeight - currentWeight).toFixed(1)

    switch (goalData.goal) {
      case "lose_weight":
        description = `ירידה במשקל ${weightDiff} ק״ג`
        if (goalData.weeklyRate) {
          const weeksRemaining = Math.ceil(Number.parseFloat(weightDiff) / goalData.weeklyRate)
          description += ` (${goalData.weeklyRate} ק״ג בשבוע, ${weeksRemaining} שבועות)`
        }
        break
      case "gain_weight":
        description = `עלייה במשקל ${weightDiff} ק״ג`
        if (goalData.weeklyRate) {
          const weeksRemaining = Math.ceil(Number.parseFloat(weightDiff) / goalData.weeklyRate)
          description += ` (${goalData.weeklyRate} ק״ג בשבוע, ${weeksRemaining} שבועות)`
        }
        break
      case "build_muscle":
        description = `בניית שריר ושיפור הרכב גוף`
        break
      default:
        description = `שמירה על משקל`
    }

    return description
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          title: "תהליך",
        }}
      />

      {loading ? (
        <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0891b2" />
          <Text style={styles.loadingText}>טוען נתונים...</Text>
        </LinearGradient>
      ) : (
        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]} style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Animatable.View animation="fadeInDown" duration={800} style={styles.header}>
                  <Text style={styles.title}>ההתקדמות שלך</Text>
                </Animatable.View>

                {/* Weight Summary Card - New prominent display at the top */}
                <Animatable.View animation="fadeInUp" delay={100} duration={800} style={styles.weightSummaryCard}>
                  <View style={styles.weightSummaryContent}>
                    <View style={styles.currentWeightContainer}>
                      <Text style={styles.weightSummaryLabel}>משקל נוכחי</Text>
                      <Text style={styles.currentWeightValue}>
                        {currentWeight ? `${currentWeight}` : "0"}
                        <Text style={styles.weightUnit}> ק״ג</Text>
                      </Text>

                      {weightChangeDirection !== "none" && (
                        <View style={styles.weightChangeContainer}>
                          <Ionicons
                            name={weightChangeDirection === "down" ? "arrow-down" : "arrow-up"}
                            size={16}
                            color={weightChangeDirection === "down" ? "#10b981" : "#ef4444"}
                          />
                          <Text
                            style={[
                              styles.weightChangeText,
                              { color: weightChangeDirection === "down" ? "#10b981" : "#ef4444" },
                            ]}
                          >
                            {weightChangeAmount.toFixed(1)} ק״ג
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.weightSeparator} />

                    <View style={styles.targetWeightContainer}>
                      <Text style={styles.weightSummaryLabel}>משקל יעד</Text>
                      <Text style={styles.targetWeightValue}>
                        {goalData?.targetWeight ? `${goalData.targetWeight}` : "0"}
                        <Text style={styles.weightUnit}> ק״ג</Text>
                      </Text>

                      {currentWeight && goalData?.targetWeight && (
                        <Text style={styles.remainingWeightText}>
                          {getRemainingWeight(currentWeight, goalData.targetWeight)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.updateWeightButtonProminent}
                    onPress={() => setWeightModalVisible(true)}
                  >
                    <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.updateWeightTextProminent}>עדכון משקל</Text>
                  </TouchableOpacity>
                </Animatable.View>

                {/* Goal Card */}
                <Animatable.View animation="fadeInUp" delay={200} duration={800} style={styles.card}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>היעד שלך</Text>
                    <Ionicons name="flag" size={24} color="#0891b2" />
                  </View>

                  <Text style={styles.goalDescription}>{getGoalDescription()}</Text>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{progress.toFixed(0)}% הושלם</Text>
                  </View>

                  <Text style={styles.motivationalText}>{getMotivationalMessage(progress)}</Text>
                </Animatable.View>

                {/* Weight Tracking Chart */}
                <Animatable.View animation="fadeInUp" delay={300} duration={800} style={styles.card}>
                  <View style={styles.weightHeader}>
                    <Text style={styles.weightTitle}>מעקב משקל</Text>
                    <Ionicons name="trending-down" size={24} color="#0891b2" />
                  </View>

                  {weightHistory.length > 1 ? (
                    <View style={styles.chartContainer}>
                      <LineChart
                        data={lineChartData}
                        width={width - 60}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.lineChart}
                      />
                    </View>
                  ) : (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>אין מספיק נתונים להצגת גרף</Text>
                      <Text style={styles.noDataSubtext}>עדכן את המשקל שלך באופן קבוע כדי לראות את ההתקדמות</Text>
                    </View>
                  )}
                </Animatable.View>

                {/* Calorie Chart */}
                <Animatable.View animation="fadeInUp" delay={400} duration={800} style={styles.card}>
                  <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>צריכת קלוריות - 7 ימים אחרונים</Text>
                    <Ionicons name="bar-chart" size={24} color="#0891b2" />
                  </View>

                  <Text style={styles.chartSubtitle}>לחץ על העמודה לפרטים נוספים</Text>

                  <View style={styles.chartContainer}>
                    <BarChart
                      data={barChartData}
                      width={width - 60}
                      height={220}
                      yAxisLabel=""
                      yAxisSuffix=""
                      chartConfig={{
                        ...chartConfig,
                        barPercentage: 0.7,
                        color: (opacity = 1, index) => {
                          // Color bars based on calorie target
                          if (dailyCalories && typeof index === "number") {
                            const dayCalories = calorieData[index]?.calories || 0
                            if (dayCalories > dailyCalories * 1.1) return `rgba(239, 68, 68, ${opacity})` // Red for over target
                            if (dayCalories < dailyCalories * 0.9) return `rgba(249, 115, 22, ${opacity})` // Orange for under target
                            return `rgba(16, 185, 129, ${opacity})` // Green for on target
                          }
                          return `rgba(50, 203, 198, ${opacity})`
                        },
                      }}
                      fromZero
                      showValuesOnTopOfBars
                      {...{
                        onDataPointClick: (data: any) => {
                          // Make sure we have the index property
                          if (data && typeof data.index === "number") {
                            handleBarPress(data.index)
                          }
                        },
                      }}
                    />
                  </View>

                  {/* Daily Average */}
                  <View style={styles.averageContainer}>
                    <Text style={styles.averageLabel}>ממוצע יומי:</Text>
                    <Text style={styles.averageValue}>
                      {Math.round(calorieData.reduce((sum, day) => sum + day.calories, 0) / calorieData.length)} קלוריות
                    </Text>

                    {dailyCalories ? (
                      <Text style={[styles.targetComparison, { color: dailyCalories > 0 ? "#10b981" : "#ef4444" }]}>
                        {dailyCalories > 0 ? `היעד היומי: ${dailyCalories} קלוריות` : ""}
                      </Text>
                    ) : null}
                  </View>
                </Animatable.View>
              </ScrollView>

              {/* Daily Macros Modal */}
              <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View
                    style={{
                      backgroundColor: "white",
                      borderRadius: 20,
                      padding: 20,
                      width: "90%",
                      maxWidth: 400,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.2,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        פירוט תזונתי - {selectedDay ? formatDate(selectedDay.date) : ""}
                      </Text>
                      <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    {selectedDay && (
                      <>
                        <View
                          style={{
                            alignItems: "center",
                            marginBottom: 20,
                            backgroundColor: "#f0f9ff",
                            padding: 12,
                            borderRadius: 12,
                            width: "100%",
                          }}
                        >
                          <Text style={styles.calorieTotal}>{selectedDay.calories} קלוריות</Text>
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-around",
                            marginBottom: 24,
                            backgroundColor: "#f8fafc",
                            padding: 16,
                            borderRadius: 12,
                          }}
                        >
                          <View
                            style={{
                              alignItems: "center",
                              backgroundColor: "white",
                              padding: 10,
                              borderRadius: 10,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            <View style={[styles.macroIcon, { backgroundColor: "#e9d5ff" }]}>
                              <Ionicons name="fitness" size={20} color="#9333ea" />
                            </View>
                            <Text style={styles.macroValue}>{Math.round(selectedDay.protein_g)}g</Text>
                            <Text style={styles.macroLabel}>חלבון</Text>
                          </View>

                          <View
                            style={{
                              alignItems: "center",
                              backgroundColor: "white",
                              padding: 10,
                              borderRadius: 10,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            <View style={[styles.macroIcon, { backgroundColor: "#fed7aa" }]}>
                              <Ionicons name="leaf" size={20} color="#f97316" />
                            </View>
                            <Text style={styles.macroValue}>{Math.round(selectedDay.carbs_g)}g</Text>
                            <Text style={styles.macroLabel}>פחמימות</Text>
                          </View>

                          <View
                            style={{
                              alignItems: "center",
                              backgroundColor: "white",
                              padding: 10,
                              borderRadius: 10,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 1,
                            }}
                          >
                            <View style={[styles.macroIcon, { backgroundColor: "#fecdd3" }]}>
                              <Ionicons name="water" size={20} color="#e11d48" />
                            </View>
                            <Text style={styles.macroValue}>{Math.round(selectedDay.fat_g)}g</Text>
                            <Text style={styles.macroLabel}>שומנים</Text>
                          </View>
                        </View>

                        {selectedDay.meals && selectedDay.meals.length > 0 ? (
                          <>
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "700",
                                color: "#0f172a",
                                marginBottom: 12,
                                textAlign: "right",
                                fontFamily: "Heebo-Regular",
                                backgroundColor: "#f0f9ff",
                                padding: 10,
                                borderRadius: 8,
                              }}
                            >
                              ארוחות
                            </Text>
                            {selectedDay.meals.map((meal: any, index: number) => (
                              <View
                                key={index}
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  paddingVertical: 12,
                                  paddingHorizontal: 10,
                                  borderBottomWidth: 1,
                                  borderBottomColor: "#f1f5f9",
                                  backgroundColor: "#ffffff",
                                  marginBottom: 8,
                                  borderRadius: 8,
                                }}
                              >
                                <Text style={styles.mealName}>{meal.name || `ארוחה ${index + 1}`}</Text>
                                <Text style={styles.mealCalories}>{meal.calories} קלוריות</Text>
                              </View>
                            ))}
                          </>
                        ) : (
                          <Text style={styles.noMealsText}>לא נמצאו ארוחות ביום זה</Text>
                        )}
                      </>
                    )}

                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                      <Text style={styles.closeButtonText}>סגור</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Weight Update Modal */}
              <Modal
                animationType="slide"
                transparent={true}
                visible={weightModalVisible}
                onRequestClose={() => setWeightModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>עדכון משקל</Text>
                      <TouchableOpacity onPress={() => setWeightModalVisible(false)}>
                        <Ionicons name="close" size={24} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.weightInputLabel}>הכנס את המשקל הנוכחי שלך (ק״ג)</Text>

                    <TextInput
                      style={styles.weightInput}
                      value={newWeight}
                      onChangeText={setNewWeight}
                      keyboardType="numeric"
                      placeholder="משקל בק״ג"
                      placeholderTextColor="#94a3b8"
                    />

                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelButton} onPress={() => setWeightModalVisible(false)}>
                        <Text style={styles.cancelButtonText}>ביטול</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.saveButton} onPress={handleWeightUpdate}>
                        <Text style={styles.saveButtonText}>שמור</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </KeyboardAvoidingView>
          </LinearGradient>
        </SafeAreaView>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 0 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#0891b2",
    fontFamily: "Heebo-Regular",
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  // New weight summary card styles
  weightSummaryCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weightSummaryContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  currentWeightContainer: {
    flex: 1,
    alignItems: "center",
  },
  targetWeightContainer: {
    flex: 1,
    alignItems: "center",
  },
  weightSummaryLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
    fontFamily: "Heebo-Regular",
  },
  currentWeightValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  targetWeightValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0891b2",
    fontFamily: "Heebo-Regular",
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  weightSeparator: {
    width: 1,
    height: "100%",
    backgroundColor: "#e2e8f0",
    marginHorizontal: 15,
  },
  weightChangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  weightChangeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  remainingWeightText: {
    fontSize: 14,
    color: "#0891b2",
    fontWeight: "500",
    marginTop: 4,
  },
  updateWeightButtonProminent: {
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  updateWeightTextProminent: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Heebo-Regular",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  goalDescription: {
    fontSize: 16,
    color: "#334155",
    fontFamily: "Heebo-Regular",
    marginBottom: 16,
    textAlign: "right",
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0891b2",
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
    fontFamily: "Heebo-Regular",
  },
  motivationalText: {
    fontSize: 16,
    color: "#0891b2",
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
    fontFamily: "Heebo-Regular",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
    textAlign: "right",
    fontFamily: "Heebo-Regular",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  averageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    flexWrap: "wrap",
  },
  averageLabel: {
    fontSize: 16,
    color: "#334155",
    fontFamily: "Heebo-Regular",
    marginRight: 6,
  },
  averageValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0891b2",
    fontFamily: "Heebo-Regular",
  },
  targetComparison: {
    fontSize: 14,
    marginTop: 4,
    width: "100%",
    textAlign: "center",
    fontFamily: "Heebo-Regular",
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  weightTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  weightInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  weightInfo: {
    alignItems: "center",
    flex: 1,
  },
  weightLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
    fontFamily: "Heebo-Regular",
  },
  weightValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  updateWeightButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  updateWeightText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Heebo-Regular",
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
    fontFamily: "Heebo-Regular",
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    fontFamily: "Heebo-Regular",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    fontFamily: "Heebo-Regular",
  },
  macroSummary: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 12,
    width: "100%",
  },
  calorieTotal: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0891b2",
    fontFamily: "Heebo-Regular",
  },
  macroGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
  },
  macroItem: {
    alignItems: "center",
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    fontFamily: "Heebo-Regular",
  },
  macroLabel: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Heebo-Regular",
  },
  mealsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "right",
    fontFamily: "Heebo-Regular",
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
    marginBottom: 8,
    borderRadius: 8,
  },
  mealName: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Heebo-Regular",
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0891b2",
    fontFamily: "Heebo-Regular",
  },
  noMealsText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginVertical: 20,
    fontFamily: "Heebo-Regular",
  },
  closeButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Heebo-Regular",
  },
  weightInputLabel: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 12,
    textAlign: "right",
    fontFamily: "Heebo-Regular",
  },
  weightInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    fontSize: 16,
    textAlign: "right",
    fontFamily: "Heebo-Regular",
    direction: "rtl",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Heebo-Regular",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Heebo-Regular",
  },
})
