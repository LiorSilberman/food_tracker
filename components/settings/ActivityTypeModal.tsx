"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import AnimatedOption from "@/components/ui/AnimatedOption"

type ActivityTypeModalProps = {
  visible: boolean
  currentType: string
  onClose: () => void
  onSave: (type: string) => void
}

const ActivityTypeModal = ({ visible, currentType, onClose, onSave }: ActivityTypeModalProps) => {
  const [selectedType, setSelectedType] = useState(currentType)
  const [saving, setSaving] = useState(false)

  const activityTypes = [
    {
      label: "אירובי (ריצה, שחייה, אופניים)",
      value: "aerobic",
      icon: "bicycle",
    },
    {
      label: "אנאירובי (משקולות, כוח)",
      value: "anaerobic",
      icon: "barbell",
    },
    {
      label: "גם וגם – לדוגמה קרוספיט",
      value: "mixed",
      icon: "fitness",
    },
    {
      label: "לא מתאמן באופן קבוע ",
      value: "no-sport",
      icon: "tv",
    },
  ]

  // Ensure the selected type is always set to a valid value when modal opens
  useEffect(() => {
    if (visible) {
      // Set to current type if valid, otherwise default to "mixed"
      const isValidType = activityTypes.some((option) => option.value === currentType)
      setSelectedType(isValidType ? currentType : "mixed")
    }
  }, [visible, currentType])

  const handleSave = async () => {
    setSaving(true)
    await onSave(selectedType)
    setSaving(false)
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>סוג פעילות גופנית</Text>

            <ScrollView style={styles.optionsContainer}>
              {activityTypes.map((option) => (
                <AnimatedOption
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  isSelected={selectedType === option.value}
                  onSelect={() => setSelectedType(option.value)}
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

export default ActivityTypeModal
