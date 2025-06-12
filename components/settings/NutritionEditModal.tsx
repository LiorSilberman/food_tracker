"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ScrollView,
} from "react-native"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import { useUserStore } from "@/stores/userStore"
import { saveCustomNutrition, getCustomNutrition } from "@/services/nutritionService"
import { auth } from "@/firebase"

type NutritionEditModalProps = {
  visible: boolean
  onClose: () => void
}

const NutritionEditModal = ({ visible, onClose }: NutritionEditModalProps) => {
  // Get current values from store
  const { dailyCalories, dailyProtein, dailyCarbs, dailyFat, setNutritionValues } = useUserStore()

  // Local state for form values
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [carbs, setCarbs] = useState("")
  const [fat, setFat] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isCustomValues, setIsCustomValues] = useState(false)

  // Update local state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setLoading(true)
      setErrors({})

      // Check for custom nutrition values in SQLite
      const checkForCustomValues = async () => {
        try {
          const user = auth.currentUser
          if (!user) {
            setDefaultValues()
            setLoading(false)
            return
          }

          const customNutrition = await getCustomNutrition(user.uid)

          if (customNutrition) {
            console.log("NutritionEditModal - Using custom nutrition values from SQLite:", customNutrition)
            setCalories(customNutrition.calories.toString())
            setProtein(customNutrition.protein.toString())
            setCarbs(customNutrition.carbs.toString())
            setFat(customNutrition.fat.toString())
            setIsCustomValues(true)
          } else {
            console.log("NutritionEditModal - No custom values found, using calculated values")
            setDefaultValues()
            setIsCustomValues(false)
          }
        } catch (err) {
          console.error("Error fetching custom nutrition values:", err)
          setDefaultValues()
        } finally {
          setLoading(false)
        }
      }

      checkForCustomValues()
    }
  }, [visible])

  // Set default values from the store
  const setDefaultValues = () => {
    setCalories(dailyCalories ? dailyCalories.toString() : "2000")
    setProtein(dailyProtein ? dailyProtein.toString() : "120")
    setCarbs(dailyCarbs ? dailyCarbs.toString() : "200")
    setFat(dailyFat ? dailyFat.toString() : "70")
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validate calories (must be between 1000-5000)
    const caloriesNum = Number(calories)
    if (isNaN(caloriesNum) || caloriesNum < 1000 || caloriesNum > 5000) {
      newErrors.calories = "קלוריות חייבות להיות בין 1000 ל-5000"
    }

    // Validate protein (must be between 20-300)
    const proteinNum = Number(protein)
    if (isNaN(proteinNum) || proteinNum < 20 || proteinNum > 300) {
      newErrors.protein = "חלבון חייב להיות בין 20 ל-300 גרם"
    }

    // Validate carbs (must be between 20-500)
    const carbsNum = Number(carbs)
    if (isNaN(carbsNum) || carbsNum < 20 || carbsNum > 500) {
      newErrors.carbs = "פחמימות חייבות להיות בין 20 ל-500 גרם"
    }

    // Validate fat (must be between 20-200)
    const fatNum = Number(fat)
    if (isNaN(fatNum) || fatNum < 20 || fatNum > 200) {
      newErrors.fat = "שומן חייב להיות בין 20 ל-200 גרם"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Update the handleSave function to refresh the parent component
  const handleSave = async () => {
    if (!validateForm()) return

    setSaving(true)

    try {
      // Convert string values to numbers
      const caloriesNum = Number(calories)
      const proteinNum = Number(protein)
      const carbsNum = Number(carbs)
      const fatNum = Number(fat)

      // Create nutrition values object
      const nutritionValues = {
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      }

      // Save to SQLite and Firestore
      await saveCustomNutrition({
        calories: caloriesNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
      })

      // Use the convenience function to update all values at once
      // Pass true as the second argument to indicate this is a manual edit
      setNutritionValues(nutritionValues, true)

      // Log the values after setting them
      console.log("NutritionEditModal - Set values in store:", nutritionValues)

      // Show success message
      Alert.alert(
        "ערכים תזונתיים עודכנו",
        `קלוריות: ${caloriesNum}
חלבון: ${proteinNum}g
פחמימות: ${carbsNum}g
שומן: ${fatNum}g`,
      )

      // Close the modal
      onClose()
    } catch (error) {
      console.error("Error saving nutrition values:", error)
      Alert.alert("שגיאה", "אירעה שגיאה בשמירת הערכים התזונתיים")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.centeredView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <BlurView intensity={40} tint="dark" style={styles.blur}>
            <View style={styles.modalView}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>עריכת ערכים תזונתיים</Text>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0891b2" />
                  <Text style={styles.loadingText}>טוען ערכים תזונתיים...</Text>
                </View>
              ) : (
                <>
                  {isCustomValues && (
                    <View style={styles.customValuesIndicator}>
                      <Ionicons name="star" size={18} color="#0891b2" />
                      <Text style={styles.customValuesText}>ערכים מותאמים אישית</Text>
                    </View>
                  )}

                  <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.formContainer}>
                      <View style={styles.inputGroup}>
                        <View style={styles.labelContainer}>
                          <Ionicons name="flame" size={20} color="#ef4444" style={styles.inputIcon} />
                          <Text style={styles.inputLabel}>קלוריות יומיות</Text>
                        </View>
                        <TextInput
                          style={[styles.input, errors.calories && styles.inputError]}
                          value={calories}
                          onChangeText={setCalories}
                          keyboardType="numeric"
                          placeholder="קלוריות"
                          placeholderTextColor="#94a3b8"
                          returnKeyType="done"
                          onSubmitEditing={Keyboard.dismiss}
                        />
                        {errors.calories && <Text style={styles.errorText}>{errors.calories}</Text>}
                      </View>

                      <View style={styles.macrosContainer}>
                        <View style={styles.inputGroup}>
                          <View style={styles.labelContainer}>
                            <Ionicons name="fitness" size={20} color="#0891b2" style={styles.inputIcon} />
                            <Text style={styles.inputLabel}>חלבון (גרם)</Text>
                          </View>
                          <TextInput
                            style={[styles.input, errors.protein && styles.inputError]}
                            value={protein}
                            onChangeText={setProtein}
                            keyboardType="numeric"
                            placeholder="חלבון"
                            placeholderTextColor="#94a3b8"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                          {errors.protein && <Text style={styles.errorText}>{errors.protein}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                          <View style={styles.labelContainer}>
                            <Ionicons name="restaurant" size={20} color="#f59e0b" style={styles.inputIcon} />
                            <Text style={styles.inputLabel}>פחמימות (גרם)</Text>
                          </View>
                          <TextInput
                            style={[styles.input, errors.carbs && styles.inputError]}
                            value={carbs}
                            onChangeText={setCarbs}
                            keyboardType="numeric"
                            placeholder="פחמימות"
                            placeholderTextColor="#94a3b8"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                          {errors.carbs && <Text style={styles.errorText}>{errors.carbs}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                          <View style={styles.labelContainer}>
                            <Ionicons name="water" size={20} color="#22c55e" style={styles.inputIcon} />
                            <Text style={styles.inputLabel}>שומן (גרם)</Text>
                          </View>
                          <TextInput
                            style={[styles.input, errors.fat && styles.inputError]}
                            value={fat}
                            onChangeText={setFat}
                            keyboardType="numeric"
                            placeholder="שומן"
                            placeholderTextColor="#94a3b8"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                          />
                          {errors.fat && <Text style={styles.errorText}>{errors.fat}</Text>}
                        </View>
                      </View>

                      <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={24} color="#0891b2" style={styles.infoIcon} />
                        <Text style={styles.infoText}>
                          שינוי הערכים התזונתיים באופן ידני יעקוף את החישובים האוטומטיים. שינויים אלו יישמרו עד לחישוב
                          מחדש.
                        </Text>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
                      <Text style={styles.cancelButtonText}>ביטול</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.saveButtonText}>שמור</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </BlurView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "90%",
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0c4a6e",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#0891b2",
  },
  customValuesIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(8, 145, 178, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  customValuesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0891b2",
    marginLeft: 8,
  },
  scrollView: {
    width: "100%",
    maxHeight: 400,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    width: "100%",
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
    width: "100%",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#0f172a",
    textAlign: "right",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.05)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
  },
  macrosContainer: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: "flex-start",
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: "#0c4a6e",
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#0891b2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.7,
  },
})

export default NutritionEditModal
