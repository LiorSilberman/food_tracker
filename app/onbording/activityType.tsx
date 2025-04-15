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

export default function ActivityTypeScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const handleNext = () => {
    if (!selected) {
      alert("אנא בחר את סוג הפעילות שלך")
      return
    }

    setOnboardingData((prev) => ({
      ...prev,
      activityType: selected,
    }))
    router.push("/onbording/goal")
  }

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/onbording/activityLevel")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={4} totalSteps={7} accentColor="#0ea5e9" />
          </Animated.View>

          <Animated.Text entering={FadeInDown.delay(300).duration(800).springify()} style={styles.title}>
            איזה סוג פעילות גופנית אתה מבצע?
          </Animated.Text>

          <Animated.View entering={SlideInDown.delay(500).duration(800).springify()} style={styles.optionsContainer}>
            <Animated.View entering={FadeInDown.delay(600).duration(500)}>
              <AnimatedOption
                label="אירובי (ריצה, שחייה, אופניים)"
                icon="bicycle"
                isSelected={selected === "aerobic"}
                onSelect={() => setSelected("aerobic")}
                accentColor="#0ea5e9"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(500)}>
              <AnimatedOption
                label="אנאירובי (משקולות, כוח)"
                icon="barbell"
                isSelected={selected === "anaerobic"}
                onSelect={() => setSelected("anaerobic")}
                accentColor="#0ea5e9"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(800).duration(500)}>
              <AnimatedOption
                label="משולב (אירובי ואנאירובי)"
                icon="fitness"
                isSelected={selected === "mixed"}
                onSelect={() => setSelected("mixed")}
                accentColor="#0ea5e9"
              />
            </Animated.View>
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
