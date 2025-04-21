"use client"
import { useRef, useEffect, useState } from "react"
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  Alert,
} from "react-native"
import { useRouter } from "expo-router"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

export type ActionListProps = {
  onTakePhoto: () => void
  onPickFromGallery: () => void
  onScanWithCamera: () => void
  onScanFromGallery: () => void
  onCustomMeal: () => void
  onClose: () => void
}

// Define types for the ActionButton component
interface ActionButtonProps {
  icon: any // Using any for icon name to accommodate both Ionicons and MaterialCommunityIcons
  iconProvider?: "Ionicons" | "MaterialCommunityIcons"
  title: string
  description?: string
  onPress: () => void
  colors?: readonly [string, string]
  delay?: number
}

export default function ActionList({
  onTakePhoto,
  onPickFromGallery,
  onScanWithCamera,
  onScanFromGallery,
  onCustomMeal,
  onClose,
}: ActionListProps) {
  const router = useRouter()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Helper function to handle navigation after action
  const handleAction = (action: () => void) => {
    // Clear any previous error messages
    setErrorMessage(null)

    // Animate out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Execute action and navigate
    try {
      action()
      setTimeout(() => {
        router.replace("/(tabs)/home")
      }, 300)
    } catch (error: any) {
      // If there's an error, show it
      setErrorMessage(error.message || "אירעה שגיאה. אנא נסה שוב.")

      // Animate back in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }

  // Handle barcode scanning with error handling
  const handleBarcodeScanning = (scanAction: () => void) => {
    try {
      scanAction()
    } catch (error: any) {
      Alert.alert("שגיאה בסריקת ברקוד", "לא ניתן לזהות ברקוד בתמונה. אנא נסה שוב עם תמונה ברורה יותר.", [
        { text: "אישור", style: "default" },
      ])
    }
  }

  const ActionButton = ({
    icon,
    iconProvider = "Ionicons",
    title,
    description,
    onPress,
    colors = ["#0891b2", "#0e7490"] as const,
    delay = 0,
  }: ActionButtonProps) => {
    const buttonFade = useRef(new Animated.Value(0)).current
    const buttonSlide = useRef(new Animated.Value(20)).current

    useEffect(() => {
      Animated.parallel([
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 400,
          delay: 100 + delay,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 400,
          delay: 100 + delay,
          useNativeDriver: true,
        }),
      ]).start()
    }, [])

    return (
      <Animated.View
        style={[styles.actionButtonContainer, { opacity: buttonFade, transform: [{ translateY: buttonSlide }] }]}
      >
        <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.8}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGradient}>
            <View style={styles.actionContent}>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>{title}</Text>
                {description && <Text style={styles.actionDescription}>{description}</Text>}
              </View>
              <View style={styles.actionIconContainer}>
                {iconProvider === "Ionicons" ? (
                  <Ionicons name={icon} size={28} color="#fff" />
                ) : (
                  <MaterialCommunityIcons name={icon} size={28} color="#fff" />
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // Define color constants as readonly tuples to satisfy TypeScript
  const blueGradient = ["#0ea5e9", "#0284c7"] as const
  const purpleGradient = ["#8b5cf6", "#7c3aed"] as const
  const orangeGradient = ["#f59e0b", "#d97706"] as const

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient colors={["#ffffff", "#f8fafc"] as const} style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>בחר פעולה</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Error message display */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Food Photo Analysis Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ניתוח תמונת מזון</Text>

            <ActionButton
              icon="camera-outline"
              title="צלם תמונה של מזון"
              description="צלם ארוחה לניתוח מיידי"
              onPress={() => handleAction(onTakePhoto)}
              colors={blueGradient}
              delay={0}
            />

            <ActionButton
              icon="image-outline"
              title="בחר תמונה מהגלריה"
              description="בחר תמונת מזון קיימת"
              onPress={() => handleAction(onPickFromGallery)}
              colors={blueGradient}
              delay={50}
            />
          </View>

          {/* Barcode Scanning Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>סריקת ברקוד</Text>

            <ActionButton
              icon="barcode-outline"
              title="סרוק ברקוד עם המצלמה"
              description="סרוק מוצר מזון"
              onPress={() => handleAction(onScanWithCamera)}
              colors={purpleGradient}
              delay={100}
            />

            <ActionButton
              icon="scan-outline"
              title="סרוק ברקוד מתמונה"
              description="בחר תמונת ברקוד מהגלריה"
              onPress={() => handleAction(onScanFromGallery)}
              colors={purpleGradient}
              delay={150}
            />
          </View>

          {/* Custom Meal Section */}
          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>יצירת ארוחה</Text>

            <ActionButton
              icon="restaurant-outline"
              title="הכן ארוחה מותאמת אישית"
              description="צור ארוחה מרכיבים שונים"
              onPress={() => handleAction(onCustomMeal)}
              colors={orangeGradient}
              delay={200}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "90%",
    maxWidth: 500,
    maxHeight: Math.min(height * 0.85, 600), // Limit height to 85% of screen or 600px
  },
  card: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    height: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  // Error message styles
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
    textAlign: "right",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  lastSection: {
    paddingBottom: 16, // Extra padding at the bottom
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textAlign: "right",
  },
  actionButtonContainer: {
    marginBottom: 12,
  },
  actionButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionGradient: {
    borderRadius: 16,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  actionTextContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    textAlign: "right",
  },
  actionDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "right",
    marginTop: 2,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
})
