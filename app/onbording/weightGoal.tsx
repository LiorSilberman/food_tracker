"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { useOnboarding } from "../../context/OnboardingContext"
import { LinearGradient } from "expo-linear-gradient"
import { Picker } from "@react-native-picker/picker"
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import AnimatedButton from "../../components/ui/AnimatedButton"
import AnimatedBackButton from "../../components/ui/AnimatedBackButton"
import AnimatedProgressBar from "../../components/ui/AnimatedProgressBar"

export default function WeightGoalScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()
  const [weeklyRate, setWeeklyRate] = useState<number | null>(null)
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Calculate min and max target weight based on user data
  const currentWeight = onboardingData.weight || 70
  const isLoseWeight = onboardingData.goal === "lose_weight"

  // For weight loss: target between 80% and 95% of current weight
  // For weight gain: target between 105% and 120% of current weight
  const minTargetWeight = isLoseWeight ? Math.round(currentWeight * 0.8) : Math.round(currentWeight * 1.05)

  const maxTargetWeight = isLoseWeight ? Math.round(currentWeight * 0.95) : Math.round(currentWeight * 1.2)

  // Weekly rate options (kg per week)
  const rateOptions = isLoseWeight ? [0.25, 0.5, 0.75, 1.0] : [0.25, 0.5, 0.75]

  // Animation values
  const weightDisplayOpacity = useSharedValue(0)
  const rateDisplayOpacity = useSharedValue(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
      weightDisplayOpacity.value = withTiming(1, { duration: 500 })
      rateDisplayOpacity.value = withTiming(1, { duration: 500 })

      // Set default values
      if (!weeklyRate) {
        setWeeklyRate(isLoseWeight ? 0.5 : 0.25)
      }

      if (!targetWeight) {
        setTargetWeight(isLoseWeight ? Math.round(currentWeight * 0.9) : Math.round(currentWeight * 1.1))
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleNext = () => {
    if (!weeklyRate) {
      alert("אנא בחר קצב שבועי")
      return
    }

    if (!targetWeight) {
      alert("אנא בחר משקל יעד")
      return
    }

    setOnboardingData((prev) => ({
      ...prev,
      weeklyRate,
      targetWeight,
    }))
    router.push("/onbording/welcomeComplete")
  }

  const weightDisplayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: weightDisplayOpacity.value,
    }
  })

  const rateDisplayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: rateDisplayOpacity.value,
    }
  })

  // Calculate estimated weeks to reach goal
  const weeksToGoal = weeklyRate
    ? Math.abs(Math.round((currentWeight - (targetWeight || currentWeight)) / weeklyRate))
    : 0

  return (
    <LinearGradient
      colors={isLoseWeight ? ["#f0f9ff", "#e0f2fe", "#bae6fd"] : ["#fff7ed", "#ffedd5", "#fed7aa"]}
      style={styles.gradient}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/onbording/goal")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={6} totalSteps={7} accentColor={isLoseWeight ? "#0ea5e9" : "#f97316"} />
          </Animated.View>

          {/* Weekly Rate Section */}
          <Animated.Text entering={FadeInDown.delay(300).duration(800)} style={styles.sectionTitle}>
            {isLoseWeight ? "קצב ירידה במשקל" : "קצב עלייה במשקל"}
          </Animated.Text>

          <Animated.View style={[styles.rateDisplayContainer, rateDisplayAnimatedStyle]}>
            <Text style={[styles.rateDisplayText, { color: isLoseWeight ? "#0ea5e9" : "#f97316" }]}>
              {weeklyRate} ק״ג בשבוע
            </Text>
          </Animated.View>

          <Animated.View entering={SlideInDown.delay(500).duration(800)} style={styles.pickerContainer}>
            <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
              {isReady && (
                <Picker
                  selectedValue={weeklyRate}
                  onValueChange={(value) => setWeeklyRate(value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  enabled={isReady}
                >
                  {rateOptions.map((value) => (
                    <Picker.Item key={value} label={`${value} ק״ג בשבוע`} value={value} />
                  ))}
                </Picker>
              )}
            </View>
          </Animated.View>

          {/* Target Weight Section */}
          <Animated.Text
            entering={FadeInDown.delay(800).duration(800)}
            style={[styles.sectionTitle, styles.weightTitle]}
          >
            משקל יעד (ק״ג)
          </Animated.Text>

          <Animated.View style={[styles.weightDisplayContainer, weightDisplayAnimatedStyle]}>
            <Text style={[styles.weightDisplayText, { color: isLoseWeight ? "#0ea5e9" : "#f97316" }]}>
              {targetWeight || (isLoseWeight ? Math.round(currentWeight * 0.9) : Math.round(currentWeight * 1.1))} ק״ג
            </Text>
            <Text style={styles.currentWeightText}>(משקל נוכחי: {currentWeight} ק״ג)</Text>
          </Animated.View>

          <Animated.View entering={SlideInDown.delay(1000).duration(800)} style={styles.pickerContainer}>
            <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
              {isReady && (
                <Picker
                  selectedValue={
                    targetWeight || (isLoseWeight ? Math.round(currentWeight * 0.9) : Math.round(currentWeight * 1.1))
                  }
                  onValueChange={(value) => setTargetWeight(value)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  enabled={isReady}
                >
                  {Array.from({ length: maxTargetWeight - minTargetWeight + 1 }, (_, i) => i + minTargetWeight).map(
                    (value) => (
                      <Picker.Item key={value} label={`${value} ק״ג`} value={value} />
                    ),
                  )}
                </Picker>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(1200).duration(800)} style={styles.infoCard}>
            <Ionicons
              name="information-circle"
              size={24}
              color={isLoseWeight ? "#0ea5e9" : "#f97316"}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              {isLoseWeight
                ? `ירידה במשקל בקצב בריא ומומלץ. בקצב הנוכחי, תגיע למשקל היעד תוך כ-${weeksToGoal} שבועות.`
                : `עלייה במשקל בקצב בריא ומומלץ. בקצב הנוכחי, תגיע למשקל היעד תוך כ-${weeksToGoal} שבועות.`}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(1400).duration(600)} style={styles.buttonContainer}>
            <AnimatedButton
              label="המשך"
              onPress={handleNext}
              disabled={!weeklyRate || !targetWeight}
              icon="arrow-forward"
              accentColor={isLoseWeight ? "#0ea5e9" : "#f97316"}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  progressContainer: {
    marginTop: 100,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 24,
    textAlign: "center",
    color: "#0c4a6e",
  },
  weightTitle: {
    marginTop: 40,
  },
  rateDisplayContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  rateDisplayText: {
    fontSize: 36,
    fontWeight: "700",
  },
  weightDisplayContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  weightDisplayText: {
    fontSize: 48,
    fontWeight: "700",
  },
  currentWeightText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  pickerContainer: {
    alignItems: "center",
  },
  pickerBackground: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 180,
    width: "80%",
  },
  pickerDisabled: {
    opacity: 0.8,
  },
  picker: {
    height: 180,
    width: "100%",
  },
  pickerItem: {
    color: "#333",
    fontSize: 22,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 16,
    padding: 16,
    marginTop: 30,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#0c4a6e",
    flex: 1,
    textAlign: "right",
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: 40,
  },
})
