"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import { Picker } from "@react-native-picker/picker"

type TargetWeightModalProps = {
  visible: boolean
  currentWeight: number
  currentTarget: number
  goalType: string
  onClose: () => void
  onSave: (target: number) => void
}

const TargetWeightModal = ({
  visible,
  currentWeight,
  currentTarget,
  goalType,
  onClose,
  onSave,
}: TargetWeightModalProps) => {
  const [targetWeight, setTargetWeight] = useState(currentTarget)
  const [saving, setSaving] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState("")
  const [feedbackColor, setFeedbackColor] = useState("#0ea5e9")

  const isLoseWeight = goalType === "lose_weight"
  const isGainWeight = goalType === "gain_weight"

  // Define a broad range of weights (30kg to 200kg)
  const weightOptions = Array.from({ length: 171 }, (_, i) => i + 30)

  // Filter options based on goal
  const targetOptions = isLoseWeight
    ? weightOptions.filter((w) => w < currentWeight)
    : isGainWeight
      ? weightOptions.filter((w) => w > currentWeight)
      : weightOptions

  useEffect(() => {
    if (visible) {
      // Set an appropriate default target weight based on the goal type
      if (isLoseWeight && currentTarget >= currentWeight) {
        // For weight loss, set target 5kg below current weight by default
        setTargetWeight(Math.max(30, currentWeight - 5))
      } else if (isGainWeight && currentTarget <= currentWeight) {
        // For weight gain, set target 5kg above current weight by default
        setTargetWeight(currentWeight + 5)
      } else {
        // Otherwise use the current target
        setTargetWeight(currentTarget)
      }

      // Small delay to ensure picker is ready after modal animation
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setIsReady(false)
    }
  }, [visible, currentTarget, currentWeight, isLoseWeight, isGainWeight])

  // Update feedback when target weight changes
  useEffect(() => {
    if (!targetWeight) return

    const weightDiff = targetWeight - currentWeight
    const percentChange = (weightDiff / currentWeight) * 100

    if (weightDiff < 0) {
      // Weight loss feedback
      if (percentChange < -10) {
        setFeedbackMessage("ירידה משמעותית במשקל. שים לב לירידה הדרגתית ובריאה.")
        setFeedbackColor("#f97316") // Orange warning
      } else {
        setFeedbackMessage("ירידה במשקל בטווח בריא ומומלץ.")
        setFeedbackColor("#0ea5e9") // Blue info
      }
    } else if (weightDiff > 0) {
      // Weight gain feedback
      if (percentChange > 10) {
        setFeedbackMessage("עלייה משמעותית במשקל. שים לב לעלייה הדרגתית ובריאה.")
        setFeedbackColor("#f97316") // Orange warning
      } else {
        setFeedbackMessage("עלייה במשקל בטווח בריא ומומלץ.")
        setFeedbackColor("#10b981") // Green positive
      }
    } else {
      // Maintenance
      setFeedbackMessage("שמירה על המשקל הנוכחי.")
      setFeedbackColor("#0ea5e9") // Blue info
    }
  }, [targetWeight, currentWeight])

  const handleSave = async () => {
    setSaving(true)
    await onSave(targetWeight)
    setSaving(false)
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>משקל יעד</Text>

            <View style={styles.weightDisplayContainer}>
              <Text style={[styles.weightDisplayText, { color: isLoseWeight ? "#0ea5e9" : "#f97316" }]}>
                {targetWeight} ק״ג
              </Text>
              <Text style={styles.currentWeightText}>(משקל נוכחי: {currentWeight} ק״ג)</Text>
            </View>

            {feedbackMessage && (
              <View style={[styles.feedbackContainer, { borderColor: feedbackColor }]}>
                <Text style={[styles.feedbackText, { color: feedbackColor }]}>{feedbackMessage}</Text>
              </View>
            )}

            <View style={styles.pickerContainer}>
              <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                {isReady && targetOptions.length > 0 && (
                  <Picker
                    selectedValue={targetWeight}
                    onValueChange={(value) => setTargetWeight(value)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {targetOptions.map((value) => (
                      <Picker.Item key={value} label={`${value} ק״ג`} value={value} />
                    ))}
                  </Picker>
                )}
                {isReady && targetOptions.length === 0 && (
                  <Text style={styles.noOptionsText}>
                    {isLoseWeight
                      ? "אין אפשרויות למשקל יעד נמוך יותר מהמשקל הנוכחי"
                      : "אין אפשרויות למשקל יעד גבוה יותר מהמשקל הנוכחי"}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={onClose} disabled={saving}>
                <Text style={styles.buttonCancelText}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSave, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving || targetOptions.length === 0}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.buttonSaveText}>שמור</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
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
    width: "90%", // Increased from 85%
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    paddingHorizontal: 20, // Ensure horizontal padding
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0c4a6e",
    marginBottom: 20,
    textAlign: "center",
  },
  weightDisplayContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  weightDisplayText: {
    fontSize: 36,
    fontWeight: "700",
  },
  currentWeightText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  feedbackContainer: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    width: "90%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  pickerContainer: {
    alignItems: "center",
    width: "100%",
    marginVertical: 10, // Add vertical margin
  },
  pickerBackground: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 180,
    width: "80%",
    justifyContent: "center",
    alignItems: "center",
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
  noOptionsText: {
    color: "#64748b",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: "#f1f5f9",
  },
  buttonCancelText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonSave: {
    backgroundColor: "#0891b2",
  },
  buttonSaveText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.7,
  },
})

export default TargetWeightModal
