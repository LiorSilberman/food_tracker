"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import AnimatedOption from "@/components/ui/AnimatedOption"

type ActivityLevelModalProps = {
  visible: boolean
  currentLevel: string
  onClose: () => void
  onSave: (level: string) => void
}

const ActivityLevelModal = ({ visible, currentLevel, onClose, onSave }: ActivityLevelModalProps) => {
  const [selectedLevel, setSelectedLevel] = useState(currentLevel)
  const [saving, setSaving] = useState(false)

  const activityOptions = [
    {
      label: "לא עושה ספורט (0-1 פעמים בשבוע)",
      value: "sedentary",
      icon: "bed",
    },
    {
      label: "פעילות בינונית (2-4 פעמים בשבוע)",
      value: "moderate",
      icon: "walk",
    },
    {
      label: "פעילות גבוהה (5-7 פעמים בשבוע)",
      value: "active",
      icon: "fitness",
    },
  ]

  // Ensure the selected level is always set to a valid value when modal opens
  useEffect(() => {
    if (visible) {
      // Set to current level if valid, otherwise default to "moderate"
      const isValidLevel = activityOptions.some((option) => option.value === currentLevel)
      setSelectedLevel(isValidLevel ? currentLevel : "moderate")
    }
  }, [visible, currentLevel])

  const handleSave = async () => {
    setSaving(true)
    await onSave(selectedLevel)
    setSaving(false)
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>רמת פעילות גופנית</Text>

            <ScrollView style={styles.optionsContainer}>
              {activityOptions.map((option) => (
                <AnimatedOption
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  isSelected={selectedLevel === option.value}
                  onSelect={() => setSelectedLevel(option.value)}
                  accentColor="#0ea5e9"
                />
              ))}
            </ScrollView>

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
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0c4a6e",
    marginBottom: 20,
    textAlign: "center",
  },
  optionsContainer: {
    width: "100%",
    maxHeight: 350,
    paddingHorizontal: 4,
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

export default ActivityLevelModal
