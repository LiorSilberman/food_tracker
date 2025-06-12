"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Pressable } from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useRouter } from "expo-router"
import { useOnboarding } from "../../context/OnboardingContext"
import { LinearGradient } from "expo-linear-gradient"
import { Timestamp } from "firebase/firestore"
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker"
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

export function calculateAge(date: Date): number {
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
    age--
  }
  return age
}

export default function GenderAgeScreen() {
  const { onboardingData, setOnboardingData } = useOnboarding()
  const router = useRouter()

  // Gender state
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | "other" | null>(null)

  // Age state
  const [birthDate, setBirthDate] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 10, today.getMonth(), today.getDate())
  const minDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())

  // Animation values
  const calendarOpacity = useSharedValue(0)

  // Set isReady to true after initial animations would have completed
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleGenderSelect = (gender: "male" | "female" | "other") => {
    setSelectedGender(gender)
  }

  const handleNext = () => {
    if (!selectedGender) {
      alert("אנא בחר מין")
      return
    }

    const age = calculateAge(date)
    if (birthDate === "" || age < 10 || age > 100) {
      alert("אנא בחר תאריך לידה תקין (גיל בין 10 ל-100)")
      return
    }

    setOnboardingData((prev) => ({
      ...prev,
      gender: selectedGender,
      age: Timestamp.fromDate(date),
    }))
    router.push("/onbording/weightNHeight")
  }

  const toggleDatePicker = () => {
    if (!isReady) return
    setShowPicker(!showPicker)

    if (!showPicker) {
      calendarOpacity.value = withTiming(1, { duration: 300 })
    } else {
      calendarOpacity.value = withTiming(0, { duration: 200 })
    }
  }

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "set" && selectedDate) {
      setDate(selectedDate)

      if (Platform.OS === "android") {
        toggleDatePicker()
        setBirthDate(formatDate(selectedDate))
      }
    } else {
      toggleDatePicker()
    }
  }

  const confirmIOSDate = () => {
    setBirthDate(formatDate(date))
    toggleDatePicker()
  }

  const formatDate = (rawDate: Date) => {
    const date = new Date(rawDate)

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")

    return `${day}/${month}/${year}`
  }

  const calendarAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: calendarOpacity.value,
    }
  })

  return (
    <LinearGradient colors={["#f0f9ff", "#e0f2fe", "#bae6fd"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AnimatedBackButton onPress={() => router.replace("/auth/visitor-home")} />

          <Animated.View entering={FadeIn.delay(100).duration(600)} style={styles.progressContainer}>
            <AnimatedProgressBar step={1} totalSteps={7} accentColor="#0ea5e9" />
          </Animated.View>

          {/* Gender Section */}
          <Animated.Text entering={FadeInDown.delay(300).duration(800).springify()} style={styles.sectionTitle}>
            מה המין שלך?
          </Animated.Text>

          <Animated.View entering={SlideInDown.delay(500).duration(800).springify()} style={styles.optionsContainer}>
            <AnimatedOption
              label="זכר"
              icon="male"
              isSelected={selectedGender === "male"}
              onSelect={() => handleGenderSelect("male")}
              accentColor="#0ea5e9"
            />

            <AnimatedOption
              label="נקבה"
              icon="female"
              isSelected={selectedGender === "female"}
              onSelect={() => handleGenderSelect("female")}
              accentColor="#0ea5e9"
            />

            <AnimatedOption
              label="אחר"
              icon="people"
              isSelected={selectedGender === "other"}
              onSelect={() => handleGenderSelect("other")}
              accentColor="#0ea5e9"
            />
          </Animated.View>

          {/* Age Section */}
          <Animated.Text entering={FadeInDown.delay(800).duration(800)} style={[styles.sectionTitle, styles.ageTitle]}>
            מתי נולדת? 🎂
          </Animated.Text>

          <Animated.View entering={SlideInDown.delay(1000).duration(800)} style={styles.dateContainer}>
            {!showPicker && (
              <Pressable
                style={[styles.datePickerButton, !isReady && styles.datePickerButtonDisabled]}
                onPress={toggleDatePicker}
                disabled={!isReady}
              >
                <Ionicons name="calendar" size={22} color="#0ea5e9" style={styles.calendarIcon} />
                <Text style={styles.dateText}>{birthDate || "בחר תאריך לידה"}</Text>
              </Pressable>
            )}

            {showPicker && (
              <Animated.View style={[styles.datePickerWrapper, calendarAnimatedStyle]}>
                <DateTimePicker
                  mode="date"
                  display="spinner"
                  value={date}
                  onChange={onChange}
                  maximumDate={maxDate}
                  minimumDate={minDate}
                  themeVariant="light"
                  style={styles.datePicker}
                />

                {Platform.OS === "ios" && (
                  <View style={styles.iosPickerButtonsContainer}>
                    <TouchableOpacity style={[styles.pickerButton, styles.cancelButton]} onPress={toggleDatePicker}>
                      <Text style={styles.cancelButtonText}>סגור</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.pickerButton} onPress={confirmIOSDate}>
                      <Text style={styles.pickerButtonText}>אשר</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            )}

            {birthDate && (
              <Animated.View entering={FadeIn.duration(500)} style={styles.ageDisplay}>
                <Text style={styles.ageText}>גיל: {calculateAge(date)} שנים</Text>
              </Animated.View>
            )}
          </Animated.View>

          <Animated.View entering={FadeIn.delay(1400).duration(600)} style={styles.buttonContainer}>
            <AnimatedButton
              label="המשך"
              onPress={handleNext}
              disabled={!selectedGender || !birthDate}
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
    fontSize: 32,
    fontWeight: "700",
    marginTop: 40,
    marginBottom: 30,
    textAlign: "center",
    color: "#0c4a6e",
  },
  ageTitle: {
    marginTop: 50,
  },
  optionsContainer: {
    marginTop: 10,
  },
  dateContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: "100%",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  datePickerButtonDisabled: {
    opacity: 0.8,
  },
  calendarIcon: {
    marginLeft: 12,
  },
  dateText: {
    fontSize: 18,
    color: "#333",
    textAlign: "center",
  },
  datePickerWrapper: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 16,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  datePicker: {
    height: 180,
    width: "100%",
  },
  iosPickerButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  pickerButton: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  ageDisplay: {
    marginTop: 16,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  ageText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0ea5e9",
  },
  buttonContainer: {
    marginTop: "auto",
    marginBottom: 40,
  },
})
