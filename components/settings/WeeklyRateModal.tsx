"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import { Picker } from "@react-native-picker/picker"
import { Ionicons } from "@expo/vector-icons"

type WeeklyRateModalProps = {
  visible: boolean
  currentRate: number
  goalType: string
  onClose: () => void
  onSave: (rate: number) => void
}

const WeeklyRateModal = ({ visible, currentRate, goalType, onClose, onSave }: WeeklyRateModalProps) => {
  const [weeklyRate, setWeeklyRate] = useState(currentRate)
  const [saving, setSaving] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const isLoseWeight = goalType === "lose_weight"

  useEffect(() => {
    if (visible) {
      // Set appropriate default rate based on goal type
      if (isLoseWeight) {
        // For weight loss, default to 0.5 kg/week if current rate is inappropriate
        setWeeklyRate(currentRate > 0 ? currentRate : 0.5)
      } else {
        // For weight gain, default to 0.25 kg/week if current rate is inappropriate
        setWeeklyRate(currentRate > 0 ? currentRate : 0.25)
      }

      // Small delay to ensure picker is ready after modal animation
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setIsReady(false)
    }
  }, [visible, currentRate, goalType, isLoseWeight])

  const handleSave = async () => {
    setSaving(true)
    await onSave(weeklyRate)
    setSaving(false)
  }

  // Calculate estimated weeks to reach goal (placeholder)
  const weeksToGoal = 12 // This would be calculated based on current weight, target weight, and rate

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{isLoseWeight ? "קצב ירידה במשקל" : "קצב עלייה במשקל"}</Text>

            <View style={styles.rateDisplayContainer}>
              <Text style={[styles.rateDisplayText, { color: isLoseWeight ? "#0ea5e9" : "#f97316" }]}>
                {weeklyRate} ק״ג בשבוע
              </Text>
            </View>

            <View style={styles.pickerContainer}>
              <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                {isReady && (
                  <Picker
                    selectedValue={weeklyRate}
                    onValueChange={(value) => setWeeklyRate(value)}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {(isLoseWeight ? [0.25, 0.5, 0.75, 1.0] : [0.25, 0.5, 0.75]).map((value) => (
                      <Picker.Item key={value} label={`${value} ק״ג בשבוע`} value={value} />
                    ))}
                  </Picker>
                )}
              </View>
            </View>

            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle"
                size={24}
                color={isLoseWeight ? "#0ea5e9" : "#f97316"}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                {isLoseWeight
                  ? `ירידה במשקל בקצב בריא ומומלץ. בקצב הנוכחי, תגיע למשקל היעד תוך כ-${weeksToGoal} שבועות.`
                  : `עלייה במשקל בקצב בריא ומומלץ. בקצב הנוכחי, תגיע למשקל היעד תוך כ-${weeksToGoal} שבועות.`}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={onClose} disabled={saving}>
                <Text style={styles.buttonCancelText}>ביטול</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSave, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
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
  rateDisplayContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  rateDisplayText: {
    fontSize: 36,
    fontWeight: "700",
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#0c4a6e",
    flex: 1,
    textAlign: "right",
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

export default WeeklyRateModal
