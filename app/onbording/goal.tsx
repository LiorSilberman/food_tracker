"use client"

import { useState, useEffect } from "react"
import { View, StyleSheet, ScrollView, Text } from "react-native"
import { useRouter } from "expo-router"
import { useOnboarding } from "../../context/OnboardingContext"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated"
import AnimatedOption from "../../components/ui/AnimatedOption"
import AnimatedButton from "../../components/ui/AnimatedButton"
import AnimatedBackButton from "../../components/ui/AnimatedBackButton"
import AnimatedProgressBar from "../../components/ui/AnimatedProgressBar"

export default function GoalScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  // Animation values
  const titleScale = useSharedValue(0.9)

  const goals = [
    {
      id: "lose_weight",
      label: "ירידה במשקל",
      icon: "trending-down",
      description: "לרדת באחוזי שומן ולהיראות חטוב יותר",
    },
    {
      id: "gain_weight",
      label: "עלייה במשקל",
      icon: "trending-up",
      description: "להעלות במשקל בצורה מבוקרת ובריאה",
    },
    {
      id: "build_muscle",
      label: "העלאת מסת שריר",
      icon: "barbell",
      description: "להתחזק, לפתח שרירים ולשפר ביצועים",
    },
    {
      id: "maintain_weight",
      label: "שימור משקל",
      icon: "scale-balance",
      description: "לשמור על הקיים ולחזק את אורח החיים הבריא",
    },
  ]

  useEffect(() => {
    titleScale.value = withSequence(
      withTiming(1.05, { duration: 300 }),
      withDelay(200, withTiming(1, { duration: 300 })),
    )
  }, [])

  const handleSelect = (goal: string) => {
    setSelected(goal)
  }

  const handleNext = () => {
    if (!selected) {
      alert("אנא בחר מטרה")
      return
    }

    setOnboardingData((prev) => ({
      ...prev,
      goal: selected,
    }))

    // Navigate based on goal
    if (selected === "build_muscle") {
      router.push("/onbording/muscleGoal")
    } else if (selected === "maintain_weight") {
      router.push("/onbording/welcomeComplete")
    } else {
      router.push("/onbording/weightGoal")
    }
  }

  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: titleScale.value }],
    }
  })

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/onbording/activityType")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={5} totalSteps={7} accentColor="#0ea5e9" />
          </Animated.View>

          <Animated.Text style={[styles.title, titleAnimatedStyle]}>מה המטרה שלך?</Animated.Text>

          <Animated.View entering={SlideInDown.delay(500).duration(800).springify()} style={styles.optionsContainer}>
            {goals.map((goal, index) => (
              <Animated.View key={goal.id} entering={FadeInDown.delay(600 + index * 100).duration(500)}>
                <AnimatedOption
                  label={goal.label}
                  icon={goal.icon}
                  isSelected={selected === goal.id}
                  onSelect={() => handleSelect(goal.id)}
                  accentColor="#22c55e"
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
              accentColor="#22c55e"
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
    color: "#166534",
  },
  optionsContainer: {
    marginTop: 10,
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: 40,
  },
})
