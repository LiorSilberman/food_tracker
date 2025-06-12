"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Pressable } from "react-native"
import { useRouter } from "expo-router"
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
  withSpring,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import AnimatedProgressBar from "../../components/ui/AnimatedProgressBar"
import AnimatedBackButton from "@/components/ui/AnimatedBackButton"

export default function WelcomeCompleteScreen() {
  const router = useRouter()
  const [buttonPressed, setButtonPressed] = useState(false)

  // Animation values
  const titleScale = useSharedValue(0.8)
  const checkmarkScale = useSharedValue(0)

  useEffect(() => {
    // Start animations
    titleScale.value = withSequence(
      withDelay(500, withTiming(1.1, { duration: 300 })),
      withTiming(1, { duration: 300 }),
    )

    checkmarkScale.value = withDelay(800, withSpring(1, { damping: 12 }))
  }, [])

  // const handleStart = () => {
  //   console.log("Start button pressed")
  //   setButtonPressed(true)

  //   // Show immediate feedback
  //   Alert.alert("Button Pressed", "Attempting to navigate...", [
  //     {
  //       text: "OK",
  //       onPress: () => {
  //         // Try navigation after alert is dismissed
  //         navigateToHome()
  //       },
  //     },
  //   ])
  // }

  const handleStart = () => {

    try {
      router.push("/auth/signup")
    } catch (error2) {
      console.log("Second navigation error:", error2)
    }
  }

  const titleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: titleScale.value }],
    }
  })

  const checkmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: checkmarkScale.value }],
    }
  })

  return (
    <LinearGradient colors={["#ecfdf5", "#d1fae5", "#a7f3d0"]} style={styles.gradient}>
      <View style={styles.container}>
      <AnimatedBackButton onPress={() => router.replace("/onboarding/goal")} />
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={11} totalSteps={11} accentColor="#10b981" />
          </Animated.View>

          <Animated.View style={[styles.checkmarkContainer, checkmarkAnimatedStyle]}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={80} color="#10b981" />
            </View>
          </Animated.View>

          <Animated.Text style={[styles.title, titleAnimatedStyle]}>הכל מוכן!</Animated.Text>

          <Animated.Text entering={FadeInDown.delay(1000).duration(800)} style={styles.subtitle}>
            פרופיל התזונה שלך הוגדר בהצלחה
          </Animated.Text>

          <Animated.View entering={SlideInDown.delay(1200).duration(800)} style={styles.featuresContainer}>
            {[
              { icon: "camera", text: "צלם את הארוחות שלך לזיהוי אוטומטי" },
              { icon: "analytics", text: "עקוב אחר הקלוריות והערכים התזונתיים" },
              { icon: "trending-up", text: "ראה את ההתקדמות שלך לעבר המטרות" },
              { icon: "trophy", text: "קבל הישגים ותגמולים על התקדמות" },
            ].map((feature, index) => (
              <Animated.View
                key={index}
                entering={FadeInDown.delay(1400 + index * 200).duration(500)}
                style={styles.featureItem}
              >
                <View style={styles.featureIconContainer}>
                  <Ionicons name={feature.icon as any} size={24} color="#10b981" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </Animated.View>
            ))}
          </Animated.View>
        </ScrollView>

        {/* Button outside ScrollView to ensure it's always clickable */}
        <View style={styles.fixedButtonContainer}>
          {/* First button option - TouchableOpacity with LinearGradient */}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            activeOpacity={0.6}
        
          >
            <LinearGradient
              colors={[buttonPressed ? "#059669" : "#10b981", "#047857"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>התחל להשתמש באפליקציה</Text>
              <Ionicons name="rocket" size={20} color="#fff" style={styles.buttonIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120, // Extra padding to account for fixed button
  },
  progressContainer: {
    marginTop: 100,
    width: "100%",
  },
  checkmarkContainer: {
    marginTop: 60,
    alignItems: "center",
  },
  checkmarkCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginTop: 30,
    textAlign: "center",
    color: "#065f46",
  },
  subtitle: {
    fontSize: 18,
    marginTop: 12,
    marginBottom: 40,
    textAlign: "center",
    color: "#047857",
  },
  featuresContainer: {
    width: "100%",
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: "#065f46",
    flex: 1,
    textAlign: "right",
  },
  fixedButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "rgba(236, 253, 245, 0.9)",
    zIndex: 100,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(16, 185, 129, 0.2)",
  },
  startButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 10,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  fallbackButton: {
    width: "100%",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  fallbackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
})
