"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import { Picker } from "@react-native-picker/picker"
import { Ionicons } from "@expo/vector-icons"

type WeightUpdateModalProps = {
  visible: boolean
  currentWeight: number
  onClose: () => void
  onSave: (weight: number) => void
}

const WeightUpdateModal = ({ visible, currentWeight, onClose, onSave }: WeightUpdateModalProps) => {
  const [weight, setWeight] = useState(currentWeight)
  const [saving, setSaving] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (visible) {
      // Always set the weight to the current weight when modal opens
      setWeight(currentWeight || 70) // Default to 70kg if no current weight

      // Small delay to ensure picker is ready after modal animation
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setIsReady(false)
    }
  }, [visible, currentWeight])

  const handleSave = async () => {
    setSaving(true)
    await onSave(weight)
    setSaving(false)
  }

  // Generate weight options from 30kg to 200kg
  const weightOptions = Array.from({ length: 171 }, (_, i) => i + 30)

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>עדכון משקל</Text>

            <View style={styles.weightDisplayContainer}>
              <Text style={styles.weightDisplayText}>{weight} ק״ג</Text>
              {currentWeight !== weight && (
                <Text style={styles.weightChangeText}>
                  {weight > currentWeight ? "+" : ""}
                  {(weight - currentWeight).toFixed(1)} ק״ג מהמשקל הקודם
                </Text>
              )}
            </View>

            <View style={styles.weightContentContainer}>
              <View style={styles.weightPickerContainer}>
                <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                  {isReady && (
                    <Picker
                      selectedValue={weight}
                      onValueChange={(value) => setWeight(value)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {weightOptions.map((val) => (
                        <Picker.Item key={val} label={`${val} ק״ג`} value={val} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              <View style={styles.scaleIconContainer}>
                <Ionicons name="scale" size={80} color="#0ea5e9" />
                <Text style={styles.todayText}>היום</Text>
              </View>
            </View>

            <View style={styles.noteContainer}>
              <Ionicons name="information-circle-outline" size={20} color="#64748b" style={styles.infoIcon} />
              <Text style={styles.noteText}>עדכון המשקל יישמר גם במעקב המשקל שלך ויעדכן את חישובי התזונה.</Text>
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
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    paddingHorizontal: 20,
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
    color: "#0ea5e9",
  },
  weightChangeText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
  },
  weightContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 10,
  },
  weightPickerContainer: {
    flex: 1,
    alignItems: "center",
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
    width: "100%",
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
  scaleIconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  todayText: {
    marginTop: 8,
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    width: "100%",
  },
  infoIcon: {
    marginRight: 8,
  },
  noteText: {
    fontSize: 14,
    color: "#64748b",
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

export default WeightUpdateModal
