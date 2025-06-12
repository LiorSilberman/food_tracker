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
  withSequence,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import AnimatedButton from "../../components/ui/AnimatedButton"
import AnimatedBackButton from "../../components/ui/AnimatedBackButton"
import AnimatedProgressBar from "../../components/ui/AnimatedProgressBar"

export default function WeightHeightScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()

  // Weight state
  const [weightWhole, setWeightWhole] = useState(70)
  const [weightDecimal, setWeightDecimal] = useState(0)

  // Height state
  const [height, setHeight] = useState(170)

  const [isReady, setIsReady] = useState(false)

  // Animation values
  const scaleValue = useSharedValue(0.9)
  const weightDisplayOpacity = useSharedValue(0)
  const heightDisplayOpacity = useSharedValue(0)

  // Set isReady to true after initial animations would have completed
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)

      // Start animations
      scaleValue.value = withSequence(withTiming(1.05, { duration: 300 }), withTiming(1, { duration: 300 }))
      weightDisplayOpacity.value = withTiming(1, { duration: 500 })
      heightDisplayOpacity.value = withTiming(1, { duration: 500 })
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleNext = () => {
    const combinedWeight = Number.parseFloat(`${weightWhole}.${weightDecimal}`)

    setOnboardingData((prev) => ({
      ...prev,
      weight: combinedWeight,
      height: height,
    }))
    router.push("/onboarding/activityLevel")
  }

  const scaleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    }
  })

  const weightDisplayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: weightDisplayOpacity.value,
    }
  })

  const heightDisplayAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: heightDisplayOpacity.value,
    }
  })

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/onboarding/genderNAge")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={2} totalSteps={7} accentColor="#0ea5e9" />
          </Animated.View>

          {/* Weight Section */}
          <Animated.Text entering={FadeInDown.delay(300).duration(800)} style={styles.sectionTitle}>
            כמה אתה שוקל?
          </Animated.Text>

          <Animated.View style={[styles.weightDisplayContainer, weightDisplayAnimatedStyle]}>
            <Text style={styles.weightDisplayText}>
              {weightWhole}.{weightDecimal} ק״ג
            </Text>
          </Animated.View>

          <Animated.View
            entering={SlideInDown.delay(500).duration(800)}
            style={[styles.pickerContainer, scaleAnimatedStyle]}
          >
            <View style={styles.dualPickerContainer}>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>ק״ג</Text>
                <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                  {isReady && (
                    <Picker
                      selectedValue={weightWhole}
                      onValueChange={(itemValue) => setWeightWhole(itemValue)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      enabled={isReady}
                    >
                      {Array.from({ length: 151 }, (_, i) => i + 30).map((value) => (
                        <Picker.Item key={value} label={`${value}`} value={value} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              <Text style={styles.dot}>.</Text>

              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>עשרוניות</Text>
                <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                  {isReady && (
                    <Picker
                      selectedValue={weightDecimal}
                      onValueChange={(itemValue) => setWeightDecimal(itemValue)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      enabled={isReady}
                    >
                      {Array.from({ length: 10 }, (_, i) => i).map((value) => (
                        <Picker.Item key={value} label={`${value}`} value={value} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Height Section */}
          <Animated.Text
            entering={FadeInDown.delay(800).duration(800)}
            style={[styles.sectionTitle, styles.heightTitle]}
          >
            מה הגובה שלך? (ס״מ)
          </Animated.Text>

          <Animated.View style={[styles.heightDisplayContainer, heightDisplayAnimatedStyle]}>
            <Text style={styles.heightDisplayText}>{height} ס״מ</Text>
          </Animated.View>
          {isReady && (
            <View style={styles.bmiContainer}>
              {(() => {
                const combinedWeight = Number.parseFloat(`${weightWhole}.${weightDecimal}`);
                const heightM = height / 100;
                const bmi = combinedWeight / (heightM * heightM);
                const minWeight = (18.5 * heightM * heightM).toFixed(1);
                const maxWeight = (24.9 * heightM * heightM).toFixed(1);

                return (
                  <>
                    <Text style={styles.bmiText}>
                      BMI נוכחי: {bmi.toFixed(1)}
                    </Text>
                    <Text style={styles.bmiRangeText}>
                      טווח משקל תקין עבורך: {minWeight} - {maxWeight} ק״ג
                    </Text>
                  </>
                );
              })()}
            </View>
          )}
          <View style={styles.heightContentContainer}>
            <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.heightPickerContainer}>
              <View style={styles.heightPickerWrapper}>
                <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                  {isReady && (
                    <Picker
                      selectedValue={height}
                      onValueChange={(value) => setHeight(value)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                      enabled={isReady}
                    >
                      {Array.from({ length: 100 }, (_, i) => i + 130).map((val) => (
                        <Picker.Item key={val} label={`${val} ס״מ`} value={val} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(1200).duration(800)} style={styles.humanIconContainer}>
              <Ionicons name="body" size={80} color="#0ea5e9" />
              <Text style={styles.heightMarker}>{height}</Text>
            </Animated.View>
          </View>

          <Animated.View entering={FadeIn.delay(1400).duration(600)} style={styles.buttonContainer}>
            <AnimatedButton label="המשך" onPress={handleNext} icon="arrow-forward" accentColor="#0ea5e9" />
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
    fontSize: 32,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 24,
    textAlign: "center",
    color: "#0c4a6e",
  },
  heightTitle: {
    marginTop: 50,
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
  heightDisplayContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  heightDisplayText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  pickerContainer: {
    alignItems: "center",
  },
  dualPickerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerWrapper: {
    width: 120,
    alignItems: "center",
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0c4a6e",
    marginBottom: 8,
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
    width: "100%",
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
  dot: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#0ea5e9",
    marginHorizontal: 8,
  },
  heightContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  heightPickerContainer: {
    flex: 1,
    alignItems: "center",
  },
  heightPickerWrapper: {
    width: "80%",
  },
  humanIconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heightMarker: {
    position: "absolute",
    top: "50%",
    right: "30%",
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: 40,
  },
  bmiContainer: {
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  bmiText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0c4a6e",
  },
  bmiRangeText: {
    fontSize: 16,
    color: "#0369a1",
    marginTop: 4,
  },
})
