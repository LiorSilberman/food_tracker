"use client"

import { useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from "react-native"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  FadeIn,
  FadeInDown,
  SlideInDown,
} from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import { BlurView } from "expo-blur"


const { width, height } = Dimensions.get("window")
const isIOS = Platform.OS === "ios"

export default function VisitorHome() {
  const router = useRouter()

  // Animation values
  const logoScale = useSharedValue(0.8)
  const buttonScale = useSharedValue(0.95)
  const circleScale1 = useSharedValue(0)
  const circleScale2 = useSharedValue(0)
  const circleScale3 = useSharedValue(0)

  useEffect(() => {
    // Start animations when component mounts
    logoScale.value = withSequence(withDelay(300, withTiming(1.1, { duration: 600 })), withTiming(1, { duration: 300 }))

    buttonScale.value = withDelay(1200, withTiming(1, { duration: 500 }))

    // Animate decorative circles
    circleScale1.value = withDelay(200, withTiming(1, { duration: 800 }))
    circleScale2.value = withDelay(400, withTiming(1, { duration: 800 }))
    circleScale3.value = withDelay(600, withTiming(1, { duration: 800 }))
  }, [])

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }))

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))

  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale1.value }],
    opacity: circleScale1.value * 0.7,
  }))

  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale2.value }],
    opacity: circleScale2.value * 0.5,
  }))

  const circle3Style = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale3.value }],
    opacity: circleScale3.value * 0.3,
  }))

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient colors={["#f0fdfa", "#ccfbf1", "#99f6e4"]} style={StyleSheet.absoluteFillObject} />

      {/* Decorative circles */}
      <Animated.View style={[styles.circle1, circle1Style]} />
      <Animated.View style={[styles.circle2, circle2Style]} />
      <Animated.View style={[styles.circle3, circle3Style]} />

      {/* Food illustrations */}
      <Animated.View entering={FadeIn.delay(800).duration(1000)}>
        <Animated.Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/5787/5787908.png" }}
          style={[styles.foodIcon1]}
        />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1000).duration(1000)}>
        <Animated.Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/2515/2515183.png" }}
          style={[styles.foodIcon2]}
        />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(1200).duration(1000)}>
        <Animated.Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/1147/1147805.png" }}
          style={[styles.foodIcon3]}
        />
      </Animated.View>

      <View style={styles.contentContainer}>
        {/* Logo and app name */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoCircle}>
            <Ionicons name="nutrition-outline" size={64} color="#0d9488" />
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(600).duration(800)} style={styles.title}>
          FoodTracker
        </Animated.Text>

        <Animated.Text entering={FadeInDown.delay(800).duration(800)} style={styles.subtitle}>
          הדרך החכמה לתזונה בריאה ומאוזנת
        </Animated.Text>

        {/* Features list */}
        <Animated.View entering={SlideInDown.delay(1000).duration(800)} style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="camera" size={22} color="#0d9488" />
            <Text style={styles.featureText}>צלם את האוכל שלך לזיהוי אוטומטי</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="analytics" size={22} color="#0d9488" />
            <Text style={styles.featureText}>קבל ניתוח תזונתי מדויק ומיידי</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="trending-up" size={22} color="#0d9488" />
            <Text style={styles.featureText}>עקוב אחר ההתקדמות שלך לעבר המטרות</Text>
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View style={[styles.buttonsContainer, buttonAnimatedStyle]}>
          {isIOS ? (
            <BlurView intensity={80} tint="light" style={styles.blurContainer}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push("/(onbording)/genderNAge")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#14b8a6", "#0d9488"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.startButtonText}>התחל עכשיו</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push("/auth/login")}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>כבר יש לך חשבון? התחבר</Text>
              </TouchableOpacity>
            </BlurView>
          ) : (
            <View style={styles.androidButtonsContainer}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push("/(onbording)/genderNAge")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#14b8a6", "#0d9488"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.startButtonText}>התחל עכשיו</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push("/auth/login")}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>כבר יש לך חשבון? התחבר</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  // Decorative elements
  circle1: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: "#5eead4",
    top: -width * 0.2,
    right: -width * 0.2,
  },
  circle2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: "#2dd4bf",
    bottom: height * 0.15,
    left: -width * 0.3,
  },
  circle3: {
    position: "absolute",
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    backgroundColor: "#14b8a6",
    top: height * 0.3,
    right: -width * 0.2,
  },
  foodIcon1: {
    position: "absolute",
    width: 60,
    height: 60,
    top: height * 0.15,
    left: width * 0.2,
    opacity: 0.8,
  },
  foodIcon2: {
    position: "absolute",
    width: 70,
    height: 70,
    bottom: height * 0.25,
    right: width * 0.15,
    opacity: 0.8,
  },
  foodIcon3: {
    position: "absolute",
    width: 50,
    height: 50,
    top: height * 0.4,
    left: width * 0.1,
    opacity: 0.8,
  },
  // Logo and title
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
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
    fontWeight: "800",
    color: "#0f766e",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#115e59",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 26,
  },
  // Features
  featuresContainer: {
    width: "100%",
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 16,
    color: "#134e4a",
    marginRight: 12,
    textAlign: "right",
    flex: 1,
  },
  // Buttons
  buttonsContainer: {
    width: "100%",
    alignItems: "center",
  },
  blurContainer: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    padding: 20,
  },
  androidButtonsContainer: {
    width: "100%",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 20,
  },
  startButton: {
    width: "100%",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonIcon: {
    marginRight: 8,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 16,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#0f766e",
    fontSize: 16,
    fontWeight: "600",
  },
})
