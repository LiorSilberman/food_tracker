"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import { Picker } from "@react-native-picker/picker"
import { Ionicons } from "@expo/vector-icons"

type HeightUpdateModalProps = {
  visible: boolean
  currentHeight: number
  onClose: () => void
  onSave: (height: number) => void
}

const HeightUpdateModal = ({ visible, currentHeight, onClose, onSave }: HeightUpdateModalProps) => {
  const [height, setHeight] = useState(currentHeight)
  const [saving, setSaving] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (visible) {
      // Always set the height to the current height when modal opens
      // This ensures the state matches what's displayed in the picker
      setHeight(currentHeight || 170) // Default to 170cm if no current height

      // Small delay to ensure picker is ready after modal animation
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setIsReady(false)
    }
  }, [visible, currentHeight])

  const handleSave = async () => {
    setSaving(true)
    await onSave(height)
    setSaving(false)
  }

  // Calculate BMI if we have height
  const calculateBMI = (heightCm: number) => {
    // This is just a placeholder - in a real app you'd use the actual weight
    const placeholderWeight = 70 // kg
    const heightM = heightCm / 100
    const bmi = placeholderWeight / (heightM * heightM)
    return bmi.toFixed(1)
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>עדכון גובה</Text>

            <View style={styles.heightDisplayContainer}>
              <Text style={styles.heightDisplayText}>{height} ס״מ</Text>
            </View>

            <View style={styles.heightContentContainer}>
              <View style={styles.heightPickerContainer}>
                <View style={[styles.pickerBackground, !isReady && styles.pickerDisabled]}>
                  {isReady && (
                    <Picker
                      selectedValue={height}
                      onValueChange={(value) => setHeight(value)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {Array.from({ length: 100 }, (_, i) => i + 130).map((val) => (
                        <Picker.Item key={val} label={`${val} ס״מ`} value={val} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              <View style={styles.humanIconContainer}>
                <Ionicons name="body" size={80} color="#0ea5e9" />
                <Text style={styles.heightMarker}>{height}</Text>
              </View>
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
  heightDisplayContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  heightDisplayText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  heightContentContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginVertical: 10, // Add vertical margin
  },
  heightPickerContainer: {
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
  humanIconContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heightMarker: {
    position: "absolute",
    top: "50%",
    right: "30%",
    backgroundColor: "rgba(14, 165, 233, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#0ea5e9",
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

export default HeightUpdateModal
