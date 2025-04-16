// app/(tabs)/progress.tsx
"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { Stack } from "expo-router"
import { useIsFocused } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import { formatDate, getDayName } from "@/utils/dateHelpers" // Date helper functions
import WeightSummaryCard from "@/components/progress/WeightSummaryCard"
import GoalCard from "@/components/progress/GoalCard"
import WeightTrackingChart from "@/components/progress/WeightTrackingChart"
import DailyMacrosModal from "@/components/progress/DailyMacrosModal"
import WeightUpdateModal from "@/components/progress/WeightUpdateModal"
import TimeRangeBarChart, { type DayData } from "@/components/ui/TimeRangeBarChart"

// Import Firestore and authentication from Firebase
import { auth } from "@/firebase"
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc,
    addDoc,
    Timestamp,
} from "firebase/firestore"

const db = getFirestore()
const { width } = Dimensions.get("window")

const ProgressScreen = () => {
    // State variables
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

    const isFocused = useIsFocused()

    // Helper function: Calculate progress percentage
    const calculateProgress = useCallback((current: number | null, goal: any) => {
        if (!current || !goal || goal.startWeight === goal.targetWeight) return 0
        const weightDiff = Math.abs(goal.startWeight - goal.targetWeight)
        const currentDiff = Math.abs(current - goal.targetWeight)
        const progressPercent = ((weightDiff - currentDiff) / weightDiff) * 100
        return Math.min(100, Math.max(0, progressPercent))
    }, [])

    // Helper function: Calculate weight change from history
    const calculateWeightChange = useCallback((current: number | null, history: any[]) => {
        if (!current || history.length < 2) return { direction: "none" as const, amount: 0 }
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
                // Fetch user goal data from "users" collection
                const userRef = doc(db, "users", user.uid)
                const userSnap = await getDoc(userRef)

                if (userSnap.exists()) {
                    const userData = userSnap.data()
                    const onboardingData = userData.onboarding || {}
                    // Assuming createdAt is a Firestore Timestamp; if not, adjust accordingly
                    const createdDate = new Date(userData.createdAt)

                    const goalInfo = {
                        startWeight: onboardingData.weight || 0,
                        targetWeight: onboardingData.targetWeight || 0,
                        goal: onboardingData.goal || "maintain_weight",
                        startDate: createdDate,
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

                    // Add starting weight if not present
                    if (
                        weightData.length === 0 ||
                        (weightData.length > 0 &&
                            weightData[0].timestamp.getTime() > goalInfo.startDate.getTime())
                    ) {
                        weightData.unshift({
                            id: "starting-weight",
                            weight: goalInfo.startWeight,
                            timestamp: goalInfo.startDate,
                        })
                    }
                    setWeightHistory(weightData)

                    const currentWeightValue = weightData[weightData.length - 1].weight
                    setCurrentWeight(currentWeightValue)
                    setProgress(calculateProgress(currentWeightValue, goalInfo))

                    const { direction, amount } = calculateWeightChange(currentWeightValue, weightData)
                    setWeightChangeDirection(direction)
                    setWeightChangeAmount(amount)

                    // Fetch meal data (for calorie consumption) for the past year
                    const today = new Date()
                    const oneYearAgo = new Date(today)
                    oneYearAgo.setFullYear(today.getFullYear() - 1)
                    const mealsRef = collection(db, "users", user.uid, "meals")
                    const mealsQuery = query(
                        mealsRef,
                        where("timestamp", ">=", Timestamp.fromDate(oneYearAgo)),
                        orderBy("timestamp", "asc")
                    )
                    const mealsSnap = await getDocs(mealsQuery)
                    const mealsByDay: { [key: string]: any } = {}

                    mealsSnap.forEach((doc) => {
                        const mealData = doc.data()
                        const mealDate = mealData.timestamp.toDate()
                        const dateKey = mealDate.toISOString().split("T")[0]
                        if (!mealsByDay[dateKey]) {
                            mealsByDay[dateKey] = { date: mealDate, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meals: [] }
                        }
                        mealsByDay[dateKey].calories += mealData.calories || 0
                        mealsByDay[dateKey].protein_g += mealData.protein_g || 0
                        mealsByDay[dateKey].carbs_g += mealData.carbs_g || 0
                        mealsByDay[dateKey].fat_g += mealData.fat_g || 0
                        mealsByDay[dateKey].meals.push(mealData)
                    })

                    // Inside your fetchUserData function after fetching meals for the day
                    // const today = new Date();
                    const startOfDay = new Date(today);
                    startOfDay.setHours(0, 0, 0, 0);

                    // Query today's meals by hour: fetch meals since startOfDay until now
                    const mealsDayQuery = query(
                        mealsRef,
                        where("timestamp", ">=", Timestamp.fromDate(startOfDay)),
                        where("timestamp", "<=", Timestamp.fromDate(today)),
                        orderBy("timestamp", "asc")
                    );
                    const mealsDaySnap = await getDocs(mealsDayQuery);

                    // Initialize an object to store total calories for each hour
                    const hourlyCaloriesMap: { [hour: number]: number } = {};

                    // Iterate over each meal document and accumulate calories by hour
                    mealsDaySnap.forEach((doc) => {
                        const data = doc.data();
                        const mealDate = data.timestamp.toDate();
                        const hour = mealDate.getHours();
                        if (!hourlyCaloriesMap[hour]) {
                            hourlyCaloriesMap[hour] = 0;
                        }
                        hourlyCaloriesMap[hour] += data.calories || 0;
                    });

                    // Build the dayData array with 24 data points – one for each hour of the day
                    const dayData: DayData[] = [];
                    for (let i = 0; i < 24; i++) {
                        const hourTimestamp = new Date(startOfDay);
                        hourTimestamp.setHours(i);
                        dayData.push({
                            date: hourTimestamp.toISOString(), // ISO string representing that hour
                            value: hourlyCaloriesMap[i] || 0,    // Total calories for that hour or 0 if none
                        });
                    }

                    // Set the "day" range data in state
                    setTimeRangeData({
                        ...timeRangeData,  // in case you have other ranges
                        day: dayData,
                    });

                    // For legacy calorie data (optional): sort and convert the mealsByDay data to an array
                    const sortedCalorieData = Object.keys(mealsByDay)
                        .sort()
                        .map((dateKey) => {
                            const dayMeal = mealsByDay[dateKey]
                            return {
                                date: new Date(dayMeal.date),
                                calories: dayMeal.calories,
                                protein_g: dayMeal.protein_g,
                                carbs_g: dayMeal.carbs_g,
                                fat_g: dayMeal.fat_g,
                                meals: dayMeal.meals,
                            }
                        })
                    setCalorieData(sortedCalorieData)
                } else {
                    console.error("User document not found")
                }
            } else {
                console.log("No authenticated user, falling back to demo data")
                // Optionally, set demo data when the user is not logged in.
            }
        } catch (error) {
            console.error("Error fetching user data:", error)
        } finally {
            setLoading(false)
        }
    }, [calculateProgress, calculateWeightChange])

    useEffect(() => {
        if (isFocused) {
            fetchUserData()
        }
    }, [isFocused, fetchUserData])

    // Prepare line chart data using date helper (formatDate)
    const lineChartData = {
        labels: weightHistory.map((entry) => formatDate(entry.timestamp)),
        datasets: [
            {
                data: weightHistory.map((entry) => entry.weight),
                color: (opacity = 1) => `rgba(50,203,198,${opacity})`,
                strokeWidth: 2,
            },
            ...(goalData && goalData.targetWeight
                ? [
                    {
                        data: Array(weightHistory.length).fill(goalData.targetWeight),
                        color: (opacity = 1) => `rgba(233,88,153,${opacity})`,
                        strokeWidth: 2,
                        // @ts-ignore
                        strokeDashArray: [5, 5],
                    },
                ]
                : []),
        ],
        legend: ["משקל (ק״ג)"],
    }

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

    // Handler for bar press on TimeRangeBarChart
    const handleBarPress = (dayData: DayData) => {
        const dayStr = new Date(dayData.date).toISOString().split("T")[0]
        const dayInfo = calorieData.find((d) => new Date(d.date).toISOString().split("T")[0] === dayStr)
        if (dayInfo) {
            setSelectedDay(dayInfo)
            setModalVisible(true)
        }
    }

    const handleWeightUpdate = async () => {
        if (!newWeight) return;

        try {
            const weightValue = parseFloat(newWeight);
            const user = auth.currentUser;
            if (!user) return;

            const weightRef = collection(db, "users", user.uid, "weight");
            await addDoc(weightRef, {
                weight: weightValue,
                timestamp: Timestamp.now(),
            });

            // Optionally, re-fetch user data to update weight history and progress
            await fetchUserData();

            setWeightModalVisible(false);
            setNewWeight("");
        } catch (error) {
            console.error("Error updating weight:", error);
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false, title: "תהליך" }} />

            {loading ? (
                <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]} style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0891b2" />
                    <Text style={styles.loadingText}>טוען נתונים...</Text>
                </LinearGradient>
            ) : (
                <SafeAreaView style={{ flex: 1 }}>
                    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#d8f3dc"]} style={styles.container}>
                        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                            <ScrollView contentContainerStyle={styles.scrollContent}>
                                {/* Header */}
                                <View style={styles.header}>
                                    <Text style={styles.title}>ההתקדמות שלך</Text>
                                    <Text style={styles.dayName}>{getDayName(new Date())}</Text>
                                </View>

                                {/* Weight Summary Card */}
                                <WeightSummaryCard
                                    currentWeight={currentWeight}
                                    goalData={goalData}
                                    weightChangeDirection={weightChangeDirection}
                                    weightChangeAmount={weightChangeAmount}
                                    onPressUpdate={() => setWeightModalVisible(true)}
                                    getRemainingWeight={(cur, target) => {
                                        const diff = Math.abs(cur - target).toFixed(1)
                                        return cur > target
                                            ? `נותרו ${diff} ק"ג להורדה`
                                            : `נותרו ${diff} ק"ג לעלייה`
                                    }}
                                />

                                {/* Goal Card */}
                                <GoalCard
                                    goalData={goalData}
                                    progress={progress}
                                    getGoalDescription={() => {
                                        if (!goalData || !currentWeight) return ""
                                        let description = ""
                                        const weightDiff = Math.abs(goalData.targetWeight - currentWeight).toFixed(1)
                                        switch (goalData.goal) {
                                            case "lose_weight":
                                                description = `ירידה במשקל ${weightDiff} ק״ג`
                                                break
                                            case "gain_weight":
                                                description = `עלייה במשקל ${weightDiff} ק״ג`
                                                break
                                            case "build_muscle":
                                                description = `בניית שריר ושיפור הרכב גוף`
                                                break
                                            default:
                                                description = `שמירה על משקל`
                                        }
                                        return description
                                    }}
                                    getMotivationalMessage={(prog) => {
                                        if (prog >= 100) return "כל הכבוד! השגת את היעד שלך! 🎉"
                                        if (prog >= 75) return "כמעט שם! עוד קצת מאמץ ותגיע ליעד! 💪"
                                        if (prog >= 50) return "חצי דרך! אתה עושה עבודה נהדרת! 🌟"
                                        if (prog >= 25) return "התחלה מצוינת! המשך כך! 🚀"
                                        return "כל מסע מתחיל בצעד קטן. אתה בדרך הנכונה! 👣"
                                    }}
                                />

                                {/* Weight Tracking Chart */}
                                <WeightTrackingChart
                                    lineChartData={lineChartData}
                                    chartConfig={chartConfig}
                                    weightHistory={weightHistory}
                                />

                                {/* Calorie Chart */}
                                <TimeRangeBarChart
                                    // dataByRange={timeRangeData}
                                    // onBarPress={handleBarPress}
                                    // dailyTarget={2000} // Replace with the user's actual daily target if available
                                    title="צריכת קלוריות"
                                    valueLabel="קלוריות"
                                />
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
    },
    dayName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#64748b",
        marginTop: 4,
    },
})

export default ProgressScreen
