"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Stack, useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as Animatable from "react-native-animatable"

import SettingsCard from "@/components/settings/SettingsCard"
import HeightUpdateModal from "@/components/settings/HeightUpdateModal"
import ActivityLevelModal from "@/components/settings/ActivityLevelModal"
import ActivityTypeModal from "@/components/settings/ActivityTypeModal"
import GoalSelectionModal from "@/components/settings/GoalSelectionModal"
import WeeklyRateModal from "@/components/settings/WeeklyRateModal"
import TargetWeightModal from "@/components/settings/TargetWeightModal"
import WeightUpdateModal from "@/components/settings/WeightUpdateModal"
import WeightHistoryModal from "@/components/settings/WeightHistoryModal"
import NutritionEditModal from "@/components/settings/NutritionEditModal"
import DisplayPreferencesModal from "@/components/settings/DisplayPreferencesModal"
import { fetchOnboardingData, updateFieldAndFetchOnboarding } from "@/onboardingDB"
import { auth } from "@/firebase"
import { useUserStore } from "@/stores/userStore"
import { calculateDailyCalories, calculateDailyMacros } from "@/utils/nutritionCalculator"
import { getCurrentWeight, addWeightEntryAndSync } from "@/services/weightService"
import { deleteCustomNutrition, getCustomNutrition } from "@/services/nutritionService"

const SettingsScreen = () => {
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [heightModalVisible, setHeightModalVisible] = useState(false)
  const [weightModalVisible, setWeightModalVisible] = useState(false)
  const [weightHistoryModalVisible, setWeightHistoryModalVisible] = useState(false)
  const [nutritionEditModalVisible, setNutritionEditModalVisible] = useState(false)
  const [activityLevelModalVisible, setActivityLevelModalVisible] = useState(false)
  const [activityTypeModalVisible, setActivityTypeModalVisible] = useState(false)
  const [goalModalVisible, setGoalModalVisible] = useState(false)
  const [weeklyRateModalVisible, setWeeklyRateModalVisible] = useState(false)
  const [targetWeightModalVisible, setTargetWeightModalVisible] = useState(false)
  const [displayPreferencesModalVisible, setDisplayPreferencesModalVisible] = useState(false)
  const [recalculateLoading, setRecalculateLoading] = useState(false)

  // New state to track follow-up modals
  const [pendingFollowUpModals, setPendingFollowUpModals] = useState<{
    showTargetWeight: boolean
    showWeeklyRate: boolean
    newGoal: string
  } | null>(null)

  const router = useRouter()
  const dailyCalories = useUserStore((s) => s.dailyCalories)
  const dailyProtein = useUserStore((s) => s.dailyProtein)
  const dailyCarbs = useUserStore((s) => s.dailyCarbs)
  const dailyFat = useUserStore((s) => s.dailyFat)
  const setNutritionValues = useUserStore((s) => s.setNutritionValues)
  const setUserGender = useUserStore((s) => s.setUserGender)

  useEffect(() => {
    fetchUserData()
  }, [])

  // Effect to handle follow-up modals
  useEffect(() => {
    if (pendingFollowUpModals) {
      if (pendingFollowUpModals.showTargetWeight) {
        setTargetWeightModalVisible(true)
      } else if (pendingFollowUpModals.showWeeklyRate) {
        setWeeklyRateModalVisible(true)
      }
    }
  }, [pendingFollowUpModals])

  // Update the fetchUserData function to respect custom values
  const fetchUserData = async () => {
    setLoading(true)
    try {
      const user = auth.currentUser
      if (!user) return

      // Grab onboarding data from local SQLite
      const onboardData = await fetchOnboardingData(user.uid)

      // Get the current weight from the weight table
      const weight = await getCurrentWeight(user.uid)
      setCurrentWeight(weight)

      // If we have a weight from the weight table, use it instead of the onboarding weight
      if (weight !== null) {
        onboardData.weight = weight
      }

      setUserData(onboardData)

      // Check for custom nutrition values first
      const customNutrition = await getCustomNutrition(user.uid)
      if (customNutrition) {
        console.log("Settings: Using custom nutrition values from SQLite:", customNutrition)

        // Update global state with custom values
        setNutritionValues(
          {
            calories: customNutrition.calories,
            protein: customNutrition.protein,
            carbs: customNutrition.carbs,
            fat: customNutrition.fat,
          },
          true,
        )
      } else {
        // Only recalculate if no custom values exist
        await recalculateNutrition(onboardData)
      }
    } catch (e) {
      console.error("Error fetching user data:", e)
    } finally {
      setLoading(false)
    }
  }

  const updateUserData = async (field: string, value: any) => {
    try {
      const user = auth.currentUser
      if (!user) return

      // Update the field in SQLite and get updated data
      const updatedData = await updateFieldAndFetchOnboarding(user.uid, field, value)

      // If we're updating the weight field, make sure to update our currentWeight state
      if (field === "weight") {
        setCurrentWeight(value)
      }

      setUserData(updatedData)

      // Show success message
      Alert.alert("עודכן בהצלחה", `${field} עודכן ל-${value}`)

      return updatedData
    } catch (e) {
      console.error(`Error updating ${field}:`, e)
      Alert.alert("שגיאה", `אירעה שגיאה בעדכון ${field}`)
      return null
    }
  }

  // New function to handle weight updates
  const handleWeightUpdate = async (newWeight: number) => {
    try {
      // Save the weight to both Firestore and SQLite, and sync to onboarding
      await addWeightEntryAndSync(newWeight)

      // Update our local state
      setCurrentWeight(newWeight)
      setUserData({ ...userData, weight: newWeight })

      // Close the modal
      setWeightModalVisible(false)

      // Show success message
      Alert.alert("משקל עודכן", `המשקל הנוכחי עודכן ל-${newWeight} ק״ג`)

      // Recalculate nutrition values based on the new weight
      recalculateNutrition()
    } catch (e) {
      console.error("Error updating weight:", e)
      Alert.alert("שגיאה", "אירעה שגיאה בעדכון המשקל")
    }
  }

  // Handle weight deletion from history
  const handleWeightDeleted = () => {
    // Refresh current weight and user data
    fetchUserData()
  }

  // Handle goal change that requires follow-up updates
  const handleGoalChangeWithFollowUps = (
    newGoal: string,
    requiresTargetUpdate: boolean,
    requiresRateUpdate: boolean,
  ) => {
    setPendingFollowUpModals({
      showTargetWeight: requiresTargetUpdate,
      showWeeklyRate: requiresRateUpdate,
      newGoal: newGoal,
    })
  }

  // Handle target weight update after goal change
  const handleTargetWeightAfterGoalChange = async (targetWeight: number) => {
    await updateUserData("targetWeight", targetWeight)

    // Check if we need to show weekly rate modal next
    if (pendingFollowUpModals?.showWeeklyRate) {
      setTargetWeightModalVisible(false)
      setWeeklyRateModalVisible(true)
    } else {
      // We're done with the follow-up modals
      setTargetWeightModalVisible(false)
      setPendingFollowUpModals(null)

      // Recalculate nutrition since we've made significant changes
      recalculateNutrition()
    }
  }

  // Handle weekly rate update after goal change
  const handleWeeklyRateAfterGoalChange = async (rate: number) => {
    await updateUserData("weeklyRate", rate)

    // We're done with the follow-up modals
    setWeeklyRateModalVisible(false)
    setPendingFollowUpModals(null)

    // Recalculate nutrition since we've made significant changes
    recalculateNutrition()
  }

  // Update the recalculateNutrition function to respect manually edited values
  const recalculateNutrition = async (data = userData) => {
    try {
      if (!data) return

      setRecalculateLoading(true)

      // Check if this is a manual recalculation (user clicked the button)
      const isManualRecalculation = data === userData && !loading

      // If this is a manual recalculation, delete custom values
      if (isManualRecalculation) {
        await deleteCustomNutrition()
        console.log("Manual recalculation - deleted custom nutrition values")
      }
      // If not a manual recalculation, check for custom values first
      else {
        const user = auth.currentUser
        if (user) {
          const customNutrition = await getCustomNutrition(user.uid)
          if (customNutrition) {
            console.log("Settings: Using custom nutrition values from SQLite:", customNutrition)

            // Update global state with custom values
            setNutritionValues(
              {
                calories: customNutrition.calories,
                protein: customNutrition.protein,
                carbs: customNutrition.carbs,
                fat: customNutrition.fat,
              },
              true,
            )

            setRecalculateLoading(false)
            return {
              calories: customNutrition.calories,
              proteinG: customNutrition.protein,
              carbsG: customNutrition.carbs,
              fatG: customNutrition.fat,
            }
          }
        }
      }

      // Handle age parameter properly
      let ageParam: number | Date = new Date()
      if (typeof data.age === "string") ageParam = new Date(data.age)
      else if (typeof data.age === "number") ageParam = data.age

      // 1) Daily calories
      const calories = calculateDailyCalories({
        gender: data.gender,
        age: ageParam || 30,
        weight: data.weight, // This now uses the weight from the weight table if available
        height: data.height,
        activityLevel: data.activityLevel,
        activityType: data.activityType,
        goal: data.goal,
        weeklyRate: data.weeklyRate,
        experienceLevel: data.experienceLevel,
        targetWeight: data.targetWeight,
      })
      setUserGender(data.gender)

      // 2) Daily macros
      const { proteinG, fatG, carbsG } = calculateDailyMacros({
        weight: data.weight, // This now uses the weight from the weight table if available
        dailyCalories: calories,
        activityLevel: data.activityLevel,
        activityType: data.activityType,
        goal: data.goal,
      })

      console.log("Recalculated nutrition values:", { calories, proteinG, carbsG, fatG, weight: data.weight })

      // Update global state with all values at once
      // This is an automatic recalculation, so we reset the manually edited flag
      setNutritionValues(
        {
          calories: calories,
          protein: proteinG,
          carbs: carbsG,
          fat: fatG,
        },
        false,
      )

      // Reset the manually edited flag to allow future automatic calculations
      useUserStore.getState().resetManuallyEdited()

      // Only show alert if this was triggered by the user (not during initial load)
      if (isManualRecalculation) {
        Alert.alert(
          "עודכן בהצלחה",
          `הערכים התזונתיים עודכנו:
` +
            `קלוריות: ${calories}
` +
            `חלבון: ${proteinG}g
` +
            `פחמימות: ${carbsG}g
` +
            `שומן: ${fatG}g`,
        )
      }

      return { calories, proteinG, carbsG, fatG }
    } catch (e) {
      console.error("Error recalculating nutrition:", e)
      if (data === userData && !loading) {
        Alert.alert("שגיאה", "אירעה שגיאה בחישוב הערכים התזונתיים")
      }
      return null
    } finally {
      setRecalculateLoading(false)
    }
  }

  const handleOpenNutritionModal = () => {
    // Just open the modal directly - no need to recalculate first
    setNutritionEditModalVisible(true)
  }

  const getActivityLevelText = (level: string) => {
    switch (level) {
      case "sedentary":
        return "לא פעיל"
      case "moderate":
        return "פעילות בינונית"
      case "active":
        return "פעילות גבוהה"
      default:
        return "לא ידוע"
    }
  }

  const getActivityTypeText = (type: string) => {
    switch (type) {
      case "aerobic":
        return "אירובי"
      case "anaerobic":
        return "אנאירובי"
      case "mixed":
        return "משולב"
      case "no-sport":
        return "לא מתאמן"
      default:
        return "לא ידוע"
    }
  }

  const getGoalText = (goal: string) => {
    switch (goal) {
      case "lose_weight":
        return "ירידה במשקל"
      case "maintain_weight":
        return "שמירה על משקל"
      case "gain_weight":
        return "עלייה במשקל"
      case "build_muscle":
        return "בניית שריר"
      default:
        return "לא ידוע"
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "הגדרות" }} />

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
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/home")}>
                <Ionicons name="chevron-back" size={28} color="#0891b2" />
              </TouchableOpacity>

              <Animatable.View animation="fadeIn" duration={800}>
                <Text style={styles.headerTitle}>הגדרות</Text>
                <Text style={styles.headerSubtitle}>
                  {new Date().toLocaleDateString("he-IL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </Text>
              </Animatable.View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Animatable.View animation="fadeInUp" duration={800} delay={100}>
                <SettingsCard
                  title="נתונים אישיים"
                  items={[
                    {
                      label: "משקל נוכחי",
                      value: userData?.weight ? `${userData.weight} ק״ג` : "לא הוגדר",
                      onPress: () => setWeightModalVisible(true),
                    },
                    {
                      label: "היסטוריית משקל",
                      value: "צפייה ועריכה",
                      onPress: () => setWeightHistoryModalVisible(true),
                    },
                    {
                      label: "גובה",
                      value: userData?.height ? `${userData.height} ס״מ` : "לא הוגדר",
                      onPress: () => setHeightModalVisible(true),
                    },
                    {
                      label: "רמת פעילות",
                      value: userData?.activityLevel ? getActivityLevelText(userData.activityLevel) : "לא הוגדר",
                      onPress: () => setActivityLevelModalVisible(true),
                    },
                    {
                      label: "סוג פעילות",
                      value: userData?.activityType ? getActivityTypeText(userData.activityType) : "לא הוגדר",
                      onPress: () => setActivityTypeModalVisible(true),
                    },
                  ]}
                />
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={200}>
                <SettingsCard
                  title="יעדים"
                  items={[
                    {
                      label: "מטרה",
                      value: userData?.goal ? getGoalText(userData.goal) : "לא הוגדר",
                      onPress: () => setGoalModalVisible(true),
                    },
                    {
                      label: "קצב שבועי",
                      value: userData?.weeklyRate ? `${userData.weeklyRate} ק״ג בשבוע` : "לא הוגדר",
                      onPress: () => setWeeklyRateModalVisible(true),
                      hidden: userData?.goal === "maintain_weight" || userData?.goal === "build_muscle",
                    },
                    {
                      label: "משקל יעד",
                      value: userData?.targetWeight ? `${userData.targetWeight} ק״ג` : "לא הוגדר",
                      onPress: () => setTargetWeightModalVisible(true),
                      hidden: userData?.goal === "maintain_weight",
                    },
                  ]}
                />
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={250}>
                <SettingsCard
                  title="תזונה"
                  items={[
                    {
                      label: "קלוריות יומיות",
                      value: dailyCalories ? `${dailyCalories} קלוריות` : "לא הוגדר",
                      onPress: handleOpenNutritionModal,
                    },
                    {
                      label: "חלבון",
                      value: dailyProtein ? `${dailyProtein}g` : "לא הוגדר",
                      onPress: handleOpenNutritionModal,
                    },
                    {
                      label: "פחמימות",
                      value: dailyCarbs ? `${dailyCarbs}g` : "לא הוגדר",
                      onPress: handleOpenNutritionModal,
                    },
                    {
                      label: "שומן",
                      value: dailyFat ? `${dailyFat}g` : "לא הוגדר",
                      onPress: handleOpenNutritionModal,
                    },
                  ]}
                />
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={275}>
                <SettingsCard
                  title="התאמה אישית"
                  items={[
                    {
                      label: "מסך ראשי",
                      value: "בחר רכיבים להצגה",
                      onPress: () => setDisplayPreferencesModalVisible(true),
                    },
                  ]}
                />
              </Animatable.View>

              <Animatable.View animation="fadeInUp" duration={800} delay={300}>
                <TouchableOpacity
                  style={[styles.recalculateButton, recalculateLoading && styles.recalculateButtonDisabled]}
                  onPress={() => recalculateNutrition()}
                  disabled={recalculateLoading}
                >
                  {recalculateLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.recalculateButtonText}>חשב מחדש ערכים תזונתיים</Text>
                  )}
                </TouchableOpacity>
              </Animatable.View>
            </ScrollView>

            {/* Modals */}
            <WeightUpdateModal
              visible={weightModalVisible}
              currentWeight={userData?.weight || 70}
              onClose={() => setWeightModalVisible(false)}
              onSave={handleWeightUpdate}
            />

            <WeightHistoryModal
              visible={weightHistoryModalVisible}
              onClose={() => setWeightHistoryModalVisible(false)}
              onWeightDeleted={handleWeightDeleted}
            />

            <NutritionEditModal
              visible={nutritionEditModalVisible}
              onClose={() => setNutritionEditModalVisible(false)}
            />

            <DisplayPreferencesModal
              visible={displayPreferencesModalVisible}
              onClose={() => setDisplayPreferencesModalVisible(false)}
            />

            <HeightUpdateModal
              visible={heightModalVisible}
              currentHeight={userData?.height || 170}
              onClose={() => setHeightModalVisible(false)}
              onSave={(height) => {
                updateUserData("height", height)
                setHeightModalVisible(false)
              }}
            />

            <ActivityLevelModal
              visible={activityLevelModalVisible}
              currentLevel={userData?.activityLevel || "moderate"}
              onClose={() => setActivityLevelModalVisible(false)}
              onSave={(level) => {
                updateUserData("activityLevel", level)
                setActivityLevelModalVisible(false)
              }}
            />

            <ActivityTypeModal
              visible={activityTypeModalVisible}
              currentType={userData?.activityType || "mixed"}
              onClose={() => setActivityTypeModalVisible(false)}
              onSave={(type) => {
                updateUserData("activityType", type)
                setActivityTypeModalVisible(false)
              }}
            />

            <GoalSelectionModal
              visible={goalModalVisible}
              currentGoal={userData?.goal || "maintain_weight"}
              currentWeight={userData?.weight || 70}
              currentTargetWeight={userData?.targetWeight || 65}
              currentWeeklyRate={userData?.weeklyRate || 0.5}
              onClose={() => setGoalModalVisible(false)}
              onSave={async (goal) => {
                const updated = await updateUserData("goal", goal)
                setGoalModalVisible(false)
                if (updated) {
                  setUserData(updated)
                }
              }}
              onGoalChangeRequiresUpdate={handleGoalChangeWithFollowUps}
            />

            <WeeklyRateModal
              visible={weeklyRateModalVisible}
              currentRate={userData?.weeklyRate || 0.5}
              goalType={pendingFollowUpModals?.newGoal || userData?.goal || "lose_weight"}
              onClose={() => {
                setWeeklyRateModalVisible(false)
                // If this was part of a follow-up sequence, clear it
                if (pendingFollowUpModals) {
                  setPendingFollowUpModals(null)
                }
              }}
              onSave={
                pendingFollowUpModals
                  ? handleWeeklyRateAfterGoalChange
                  : (rate) => {
                      updateUserData("weeklyRate", rate)
                      setWeeklyRateModalVisible(false)
                    }
              }
            />

            <TargetWeightModal
              visible={targetWeightModalVisible}
              currentWeight={userData?.weight || 70}
              currentTarget={userData?.targetWeight || 65}
              goalType={pendingFollowUpModals?.newGoal || userData?.goal || "lose_weight"}
              onClose={() => {
                setTargetWeightModalVisible(false)
                // If this was part of a follow-up sequence, clear it
                if (pendingFollowUpModals) {
                  setPendingFollowUpModals(null)
                }
              }}
              onSave={
                pendingFollowUpModals
                  ? handleTargetWeightAfterGoalChange
                  : (target) => {
                      updateUserData("targetWeight", target)
                      setTargetWeightModalVisible(false)
                    }
              }
            />
          </KeyboardAvoidingView>
        </LinearGradient>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 120, // Increased bottom padding to prevent tab bar overlap
    paddingHorizontal: 20,
    gap: 16,
  },
  recalculateButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: 20, // Added extra bottom margin
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recalculateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  recalculateButtonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.7,
  },
})

export default SettingsScreen
