"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native"
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
import AnimatedOption from "../../components/ui/AnimatedOption"
import AnimatedButton from "../../components/ui/AnimatedButton"
import AnimatedBackButton from "../../components/ui/AnimatedBackButton"
import AnimatedProgressBar from "../../components/ui/AnimatedProgressBar"

export default function MuscleGoalScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null)
  const [targetWeight, setTargetWeight] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackColor, setFeedbackColor] = useState("#0ea5e9")

  // Get current user data
  const currentWeight = onboardingData.weight || 70
  const height = onboardingData.height || 170
  const heightInMeters = height / 100
  const bmi = currentWeight / (heightInMeters * heightInMeters)

  // Calculate evidence-based weight targets
  const calculateWeightTargets = (weight: number, level: string | null, heightCm: number) => {
    // Default to 12-week program
    const timeframeWeeks = 12

    // Calculate BMI to determine healthy weight range
    const heightM = heightCm / 100
    const bmi = weight / (heightM * heightM)

    // Calculate minimum healthy weight (BMI 18.5)
    const minHealthyWeight = Math.round(18.5 * heightM * heightM)

    // Calculate maximum healthy weight (BMI 24.9)
    const maxHealthyWeight = Math.round(24.9 * heightM * heightM)

    // Safe weight loss (maximum 10% over 12 weeks)
    const maxWeightLoss = Math.max(
      Math.round(weight * 0.9), // 10% loss maximum
      minHealthyWeight, // Never go below minimum healthy weight
    )

    // Safe weight gain based on experience level
    let monthlyGainRate = 0.01 // Default to 1% per month

    if (level === "beginner") {
      monthlyGainRate = 0.015 // 1.5% per month for beginners
    } else if (level === "advanced") {
      monthlyGainRate = 0.005 // 0.5% per month for advanced
    }

    // Convert monthly rate to total gain over timeframe
    const maxWeightGain = Math.min(
      Math.round(weight * (1 + (monthlyGainRate * timeframeWeeks) / 4)),
      Math.max(weight * 1.1, maxHealthyWeight), // Cap at 10% gain or max healthy weight
    )

    return {
      minTargetWeight: maxWeightLoss,
      maxTargetWeight: maxWeightGain,
      currentBmi: bmi,
    }
  }

  // Calculate targets based on experience level
  const { minTargetWeight, maxTargetWeight, currentBmi } = calculateWeightTargets(
    currentWeight,
    experienceLevel || "beginner",
    height,
  )

  // Animation values
  const weightDisplayOpacity = useSharedValue(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
      weightDisplayOpacity.value = withTiming(1, { duration: 500 })

      // Set default target weight based on BMI
      if (!targetWeight) {
        // If overweight, default to weight loss
        if (currentBmi > 25) {
          setTargetWeight(Math.round(currentWeight * 0.95)) // 5% loss
        }
        // If underweight, default to weight gain
        else if (currentBmi < 18.5) {
          setTargetWeight(Math.round(currentWeight * 1.05)) // 5% gain
        }
        // Otherwise, default to current weight
        else {
          setTargetWeight(currentWeight)
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Update feedback when target weight changes
  useEffect(() => {
    if (!targetWeight) return

    const weightDiff = targetWeight - currentWeight
    const percentChange = (weightDiff / currentWeight) * 100

    // Calculate BMI at target weight
    const targetBmi = targetWeight / (heightInMeters * heightInMeters)

    if (weightDiff < 0) {
      // Weight loss feedback
      if (percentChange < -10) {
        setFeedbackMessage("ירידה משמעותית במשקל. שים לב שבניית שריר דורשת קלוריות.")
        setFeedbackColor("#f97316") // Orange warning
      } else if (targetBmi < 18.5) {
        setFeedbackMessage("משקל היעד נמוך מדי ועלול להיות מתחת לטווח הבריא.")
        setFeedbackColor("#ef4444") // Red warning
      } else {
        setFeedbackMessage("ירידה במשקל תוך בניית שריר (רקומפוזיציה) אפשרית במיוחד למתחילים.")
        setFeedbackColor("#0ea5e9") // Blue info
      }
    } else if (weightDiff > 0) {
      // Weight gain feedback
      if (percentChange > 10) {
        setFeedbackMessage("עלייה משמעותית במשקל. שים לב לעלייה הדרגתית לבניית שריר איכותית.")
        setFeedbackColor("#f97316") // Orange warning
      } else if (targetBmi > 25) {
        setFeedbackMessage("משקל היעד גבוה ועלול להוביל ל-BMI בטווח עודף משקל.")
        setFeedbackColor("#f97316") // Orange warning
      } else {
        setFeedbackMessage("עלייה מתונה במשקל מתאימה לבניית מסת שריר.")
        setFeedbackColor("#10b981") // Green positive
      }
    } else {
      // Maintenance
      setFeedbackMessage("שמירה על המשקל הנוכחי תוך שינוי הרכב הגוף (פחות שומן, יותר שריר).")
      setFeedbackColor("#0ea5e9") // Blue info
    }
  }, [targetWeight])

  const handleNext = () => {
    if (!experienceLevel) {
      alert("אנא בחר את רמת הניסיון שלך")
      return
    }

    if (!targetWeight) {
      alert("אנא בחר משקל יעד")
      return
    }

    setOnboardingData((prev) => ({
      ...prev,
      experienceLevel,
      targetWeight,
    }))
    router.push("/onbording/welcomeComplete")
  }

  const weightDisplayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: weightDisplayOpacity.value,
    }
  })

  const openLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
    } else {
      alert("לא ניתן לפתוח את הקישור")
    }
  }

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/onbording/goal")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={6} totalSteps={7} accentColor="#0ea5e9" />
          </Animated.View>

          {/* Experience Level Section */}
          <Animated.Text entering={FadeInDown.delay(300).duration(800)} style={styles.sectionTitle}>
            רמת ניסיון באימוני כוח
          </Animated.Text>

          <Animated.View entering={SlideInDown.delay(500).duration(800)} style={styles.optionsContainer}>
            <AnimatedOption
              label="מתחיל (פחות משנה)"
              icon="star-outline"
              isSelected={experienceLevel === "beginner"}
              onSelect={() => setExperienceLevel("beginner")}
              accentColor="#0ea5e9"
            />

            <AnimatedOption
              label="מתקדם (שנה ומעלה)"
              icon="star"
              isSelected={experienceLevel === "advanced"}
              onSelect={() => setExperienceLevel("advanced")}
              accentColor="#0ea5e9"
            />
          </Animated.View>

          {/* Target Weight Section */}
          <Animated.Text
            entering={FadeInDown.delay(800).duration(800)}
            style={[styles.sectionTitle, styles.weightTitle]}
          >
            משקל יעד (ק״ג)
          </Animated.Text>

          <Animated.View style={[styles.weightDisplayContainer, weightDisplayAnimatedStyle]}>
            <Text style={styles.weightDisplayText}>{targetWeight || currentWeight} ק״ג</Text>
            <Text style={styles.currentWeightText}>(משקל נוכחי: {currentWeight} ק״ג)</Text>
          </Animated.View>

          {targetWeight && (
            <Animated.View entering={FadeIn.delay(900).duration(500)} style={styles.feedbackContainer}>
              <Text style={[styles.feedbackText, { color: feedbackColor }]}>{feedbackMessage}</Text>
            </Animated.View>
          )}

          {/* Add a spacer to ensure separation */}
          <View style={{ height: 10 }} />

          <Animated.View entering={SlideInDown.delay(1000).duration(800)} style={styles.pickerContainer}>
            <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
              {isReady && (
                <Picker
                  selectedValue={targetWeight || currentWeight}
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
            <Ionicons name="information-circle" size={24} color="#0ea5e9" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>
                המלצות משקל היעד מבוססות על מחקרים מדעיים: מתחילים יכולים לצפות לעלייה של עד 1.5% במשקל בחודש, מתקדמים
                עד 0.5%. רקומפוזיציה (בניית שריר תוך ירידה בשומן) אפשרית במיוחד למתאמנים חדשים.
              </Text>

              <Text style={styles.referencesTitle}>מקורות מדעיים:</Text>

              <TouchableOpacity
                onPress={() => openLink("https://pubmed.ncbi.nlm.nih.gov/23679146/")}
                style={styles.referenceLink}
              >
                <Text style={styles.linkText}>• קצב בניית שריר למתחילים ומתקדמים</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openLink("https://pubmed.ncbi.nlm.nih.gov/31497878/")}
                style={styles.referenceLink}
              >
                <Text style={styles.linkText}>• רקומפוזיציה והשפעת רמת הניסיון</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => openLink("https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6710320/")}
                style={styles.referenceLink}
              >
                <Text style={styles.linkText}>• המלצות תזונה לבניית שריר</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(1400).duration(600)} style={styles.buttonContainer}>
            <AnimatedButton
              label="המשך"
              onPress={handleNext}
              disabled={!experienceLevel || !targetWeight}
              icon="arrow-forward"
              accentColor="#0ea5e9"
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
  optionsContainer: {
    marginTop: 10,
  },
  weightDisplayContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  weightDisplayText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  currentWeightText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  feedbackContainer: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 12,
    width: "90%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 24, // Add more bottom margin
    zIndex: 10, // Ensure it's above other elements
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  pickerContainer: {
    alignItems: "center",
    marginTop: 10, // Add top margin
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
    backgroundColor: "rgba(14, 165, 233, 0.1)",
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
  infoTextContainer: {
    flex: 1,
  },
  referencesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0c4a6e",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "right",
  },
  referenceLink: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 13,
    color: "#0284c7",
    textDecorationLine: "underline",
    textAlign: "right",
  },
})
