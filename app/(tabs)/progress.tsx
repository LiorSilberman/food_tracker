"use client"

import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Stack, useRouter } from "expo-router"
import { useIsFocused } from "@react-navigation/native"
import { formatDate } from "@/utils/dateHelpers"
import { Ionicons } from "@expo/vector-icons"
import * as Animatable from "react-native-animatable"

import WeightSummaryCard from "@/components/progress/WeightSummaryCard"
import GoalCard from "@/components/progress/GoalCard"
import WeightTrackingChart from "@/components/progress/WeightTrackingChart"
import DailyMacrosModal from "@/components/progress/DailyMacrosModal"
import WeightUpdateModal from "@/components/progress/WeightUpdateModal"
import TimeRangeBarChart, { type DayData } from "@/components/ui/TimeRangeBarChart"
import { fetchOnboardingData } from "@/onboardingDB"
import { auth } from "@/firebase"
import { getFirestore } from "firebase/firestore"
import { saveWeightToFirestoreAndSQLite } from "@/services/weightService"
import { useUserStore } from "@/stores/userStore"
import {
  fetchWeightHistoryFromSQLite,
  fetchMealsPastYearFromSQLite,
  fetchHourlyCaloriesFromSQLite,
} from "@/services/sqliteService"
import { db as sqliteDb } from "@/dbInit"

const db = getFirestore()
const { width } = Dimensions.get("window")

const ProgressScreen = () => {
  const [loading, setLoading] = useState(true)
  const [goalData, setGoalData] = useState<any>(null)
  const [weightHistory, setWeightHistory] = useState<any[]>([])
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [weightChangeDirection, setWeightChangeDirection] = useState<"up" | "down" | "none">("none")
  const [weightChangeAmount, setWeightChangeAmount] = useState<number>(0)
  const [timeRangeData, setTimeRangeData] = useState<{ [key: string]: DayData[] }>({})
  const [calorieData, setCalorieData] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [weightModalVisible, setWeightModalVisible] = useState(false)
  const [newWeight, setNewWeight] = useState("")
  const dailyCalories = useUserStore((s) => s.dailyCalories)

  const isFocused = useIsFocused()
  const router = useRouter()

  const calculateProgress = useCallback((current: number | null, goal: any) => {
    if (!current || !goal || goal.startWeight === goal.targetWeight) return 0
    const weightDiff = Math.abs(goal.startWeight - goal.targetWeight)
    const currentDiff = Math.abs(current - goal.targetWeight)
    const progressPercent = ((weightDiff - currentDiff) / weightDiff) * 100
    return Math.min(100, Math.max(0, progressPercent))
  }, [])

  const calculateWeightChange = useCallback(
    (current: number | null, history: { timestamp: Date; weight: number }[]) => {
      if (!current || history.length < 2) {
        return { direction: "none", amount: 0 } as const
      }
      const sorted = [...history].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      const prev = sorted[1].weight
      const diff = current - prev
      const direction = diff > 0 ? "up" : diff < 0 ? "down" : "none"
      return { direction, amount: Math.abs(diff) } as const
    },
    [],
  )

  const fetchUserData = useCallback(async () => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) return

      // 1) Grab onboarding from local SQLite
      const onboard = await fetchOnboardingData(user.uid)
      const startWeight = onboard.weight ?? 0
      const startDateStr = onboard.createdAt ?? new Date().toISOString()
      const startDate = new Date(startDateStr)

      // Build your goalData from that
      const goal = {
        startWeight,
        targetWeight: onboard.targetWeight ?? 0,
        goal: onboard.goal ?? "maintain_weight",
        startDate,
        weeklyRate: onboard.weeklyRate ?? 0.5,
      }
      setGoalData(goal)

      // 2) Load any existing weight history
      let weights = await fetchWeightHistoryFromSQLite(user.uid)

      // 3) If none, fall back to onboarding values
      if (weights.length === 0) {
        weights = [
          {
            id: "onboarding-weight",
            weight: startWeight,
            timestamp: startDate,
          },
        ]
        // (optionally seed into SQLite as well)
        await sqliteDb.runAsync(`INSERT INTO weight (id, user_id, weight, timestamp) VALUES (?, ?, ?, ?);`, [
          "onboarding-weight",
          user.uid,
          startWeight,
          startDate.toISOString(),
        ])
      }

      // 4) Store in state and compute currentWeight, progress, etc.
      setWeightHistory(weights)
      const current = weights[weights.length - 1].weight
      setCurrentWeight(current)
      setProgress(calculateProgress(current, goal))
      const { direction, amount } = calculateWeightChange(current, weights)
      setWeightChangeDirection(direction)
      setWeightChangeAmount(amount)

      // Use SQLite to fetch meal data
      const mealRows = await fetchMealsPastYearFromSQLite(user.uid)
      const mealsByDay: { [key: string]: any } = {}
      for (const meal of mealRows) {
        const dateKey = meal.timestamp.toISOString().split("T")[0]
        if (!mealsByDay[dateKey]) {
          mealsByDay[dateKey] = {
            date: meal.timestamp,
            calories: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            meals: [],
          }
        }
        mealsByDay[dateKey].calories += meal.calories || 0
        mealsByDay[dateKey].protein_g += meal.protein_g || 0
        mealsByDay[dateKey].carbs_g += meal.carbs_g || 0
        mealsByDay[dateKey].fat_g += meal.fat_g || 0
        mealsByDay[dateKey].meals.push(meal)
      }

      const sortedCalorieData = Object.keys(mealsByDay)
        .sort()
        .map((key) => mealsByDay[key])

      setCalorieData(sortedCalorieData)

      // Use SQLite to fetch hourly calorie data
      const hourly = await fetchHourlyCaloriesFromSQLite(user.uid)
      setTimeRangeData({ day: hourly })
    } catch (e) {
      console.error("Error fetching user data:", e)
    } finally {
      setLoading(false)
    }
  }, [calculateProgress, calculateWeightChange, router])

  useEffect(() => {
    if (isFocused) fetchUserData()
  }, [isFocused, fetchUserData])

  const lineChartData = {
    labels: weightHistory.map((e) => formatDate(e.timestamp)),
    datasets: [
      { data: weightHistory.map((e) => e.weight) },
      ...(goalData?.targetWeight ? [{ data: Array(weightHistory.length).fill(goalData.targetWeight) }] : []),
    ],
    legend: ["משקל (ק״ג)"],
  }

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (o = 1) => `rgba(50,203,198,${o})`,
    labelColor: (o = 1) => `rgba(0,0,0,${o})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "6", strokeWidth: "2", stroke: "#ffa726" },
  }

  const handleBarPress = (d: DayData) => {
    const key = new Date(d.date).toISOString().split("T")[0]
    const info = calorieData.find((c) => new Date(c.date).toISOString().split("T")[0] === key)
    if (info) {
      setSelectedDay(info)
      setModalVisible(true)
    }
  }

  const handleWeightUpdate = async () => {
    if (!newWeight) return
    try {
      const w = Number.parseFloat(newWeight)
      await saveWeightToFirestoreAndSQLite(w)
      await fetchUserData()
      setWeightModalVisible(false)
      setNewWeight("")
    } catch (e) {
      console.error("Error updating weight:", e)
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "תהליך" }} />

      {loading ? (
        <LinearGradient
          colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]}
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#0891b2" />
          <Text style={{ marginTop: 12, fontSize: 16, color: "#0891b2" }}>טוען נתונים...</Text>
        </LinearGradient>
      ) : (
        <LinearGradient
          colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]}
          style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 40 }}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <View
              style={{
                paddingHorizontal: 20,
                paddingBottom: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",

              }}
            >
              <TouchableOpacity
                style={{
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
                }}
                onPress={() => router.replace("/home")}
              >
                <Ionicons name="chevron-back" size={28} color="#0891b2" />
              </TouchableOpacity>

              <Animatable.View animation="fadeIn" duration={800}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#0f172a", textAlign: "right" }}>
                  ההתקדמות שלך
                </Text>
                <Text style={{ fontSize: 14, color: "#64748b", textAlign: "right", marginTop: 4 }}>
                  {new Date().toLocaleDateString("he-IL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </Text>
              </Animatable.View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
              <WeightSummaryCard
                currentWeight={currentWeight}
                goalData={goalData}
                weightChangeDirection={weightChangeDirection}
                weightChangeAmount={weightChangeAmount}
                onPressUpdate={() => setWeightModalVisible(true)}
                getRemainingWeight={(cur, tgt) => {
                  const diff = Math.abs(cur - tgt).toFixed(1)
                  return cur > tgt ? `נותרו ${diff} ק"ג להורדה` : `נותרו ${diff} ק"ג לעלייה`
                }}
              />

              <GoalCard
                goalData={goalData}
                progress={progress}
                getGoalDescription={() => {
                  if (!goalData || !currentWeight) return ""
                  const d = Math.abs(goalData.targetWeight - currentWeight).toFixed(1)
                  switch (goalData.goal) {
                    case "lose_weight":
                      return `ירידה במשקל ${d} ק״ג`
                    case "gain_weight":
                      return `עלייה במשקל ${d} ק״ג`
                    case "build_muscle":
                      return "בניית שריר ושיפור הרכב גוף"
                    default:
                      return "שמירה על משקל"
                  }
                }}
                getMotivationalMessage={(p) => {
                  if (p >= 100) return "כל הכבוד! השגת את היעד שלך! 🎉"
                  if (p >= 75) return "כמעט שם! עוד קצת מאמץ ותגיע ליעד! 💪"
                  if (p >= 50) return "חצי דרך! אתה עושה עבודה נהדרת! 🌟"
                  if (p >= 25) return "התחלה מצוינת! המשך כך! 🚀"
                  return "כל מסע מתחיל בצעד קטן. אתה בדרך הנכונה! 👣"
                }}
              />

              <WeightTrackingChart
                lineChartData={lineChartData}
                chartConfig={chartConfig}
                weightHistory={weightHistory}
              />

              <TimeRangeBarChart title="צריכת קלוריות" valueLabel="קלוריות" targetCaloriesValue={dailyCalories} />
            </ScrollView>

            <DailyMacrosModal visible={modalVisible} selectedDay={selectedDay} onClose={() => setModalVisible(false)} />

            <WeightUpdateModal
              visible={weightModalVisible}
              newWeight={newWeight}
              onChangeWeight={setNewWeight}
              onUpdate={handleWeightUpdate}
              onCancel={() => setWeightModalVisible(false)}
            />
          </KeyboardAvoidingView>
        </LinearGradient>
      )}
    </>
  )
}

export default ProgressScreen
