"use client"

import { useState } from "react"
import { View, StyleSheet, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { useOnboarding } from "../../context/OnboardingContext"
import { LinearGradient } from "expo-linear-gradient"
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated"
import AnimatedOption from "../../components/ui/AnimatedOption"
import AnimatedButton from "../../components/ui/AnimatedButton"
import AnimatedBackButton from "../../components/ui/AnimatedBackButton"
import AnimatedProgressBar from "../../components/ui/AnimatedProgressBar"

const activityOptions = [
  {
    label: "לא עושה ספורט (0-1 פעמים בשבוע)",
    value: "sedentary",
    icon: "bed",
  },
  {
    label: "פעילות בינונית (2-4 פעמים בשבוע)",
    value: "moderate",
    icon: "walk",
  },
  {
    label: "פעילות גבוהה (5-7 פעמים בשבוע)",
    value: "active",
    icon: "fitness",
  },
]

export default function ActivityScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const handleNext = () => {
    if (!selected) {
      alert("אנא בחר את רמת הפעילות שלך")
      return
    }

    setOnboardingData((prev) => ({
      ...prev,
      activityLevel: selected,
    }))
    router.push("/onboarding/activityType")
  }

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/onboarding/weightNHeight")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={3} totalSteps={7} accentColor="#0ea5e9" />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(300).duration(800).springify()} style={styles.title}>
            מה רמת הפעילות הגופנית שלך?
          </Animated.Text>

          <Animated.View entering={SlideInDown.delay(500).duration(800).springify()} style={styles.optionsContainer}>
            {activityOptions.map((option, index) => (
              <Animated.View key={option.value} entering={FadeInDown.delay(600 + index * 100).duration(500)}>
                <AnimatedOption
                  label={option.label}
                  icon={option.icon}
                  isSelected={selected === option.value}
                  onSelect={() => setSelected(option.value)}
                  accentColor="#0ea5e9"
                />
              </Animated.View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeIn.delay(1000).duration(600)} style={styles.buttonContainer}>
            <AnimatedButton
              label="המשך"
              onPress={handleNext}
              disabled={!selected}
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
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 30,
    textAlign: "center",
    color: "#0c4a6e",
  },
  optionsContainer: {
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: 40,
  },
})
