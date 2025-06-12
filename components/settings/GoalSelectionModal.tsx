"use client"

import { useState } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { BlurView } from "expo-blur"
import AnimatedOption from "@/components/ui/AnimatedOption"

type GoalSelectionModalProps = {
  visible: boolean
  currentGoal: string
  currentWeight: number
  currentTargetWeight: number
  currentWeeklyRate: number
  onClose: () => void
  onSave: (goal: string) => void
  onGoalChangeRequiresUpdate: (newGoal: string, requiresTargetUpdate: boolean, requiresRateUpdate: boolean) => void
}

const GoalSelectionModal = ({
  visible,
  currentGoal,
  currentWeight,
  currentTargetWeight,
  currentWeeklyRate,
  onClose,
  onSave,
  onGoalChangeRequiresUpdate,
}: GoalSelectionModalProps) => {
  const [selectedGoal, setSelectedGoal] = useState(currentGoal)
  const [saving, setSaving] = useState(false)

  const goals = [
    {
      id: "lose_weight",
      label: "ירידה במשקל",
      icon: "trending-down",
      description: "לרדת באחוזי שומן ולהיראות חטוב יותר",
    },
    {
      id: "gain_weight",
      label: "עלייה במשקל",
      icon: "trending-up",
      description: "להעלות במשקל בצורה מבוקרת ובריאה",
    },
    {
      id: "build_muscle",
      label: "העלאת מסת שריר",
      icon: "barbell",
      description: "להתחזק, לפתח שרירים ולשפר ביצועים",
    },
    {
      id: "maintain_weight",
      label: "שימור משקל",
      icon: "scale-balance",
      description: "לשמור על הקיים ולחזק את אורח החיים הבריא",
    },
  ]

  const handleSave = async () => {
    setSaving(true)

    // Check if the goal change requires updates to other settings
    const requiresTargetWeightUpdate = needsTargetWeightUpdate(
      currentGoal,
      selectedGoal,
      currentWeight,
      currentTargetWeight,
    )
    const requiresWeeklyRateUpdate = needsWeeklyRateUpdate(currentGoal, selectedGoal)

    // First save the goal
    await onSave(selectedGoal)
    setSaving(false)

    // If we need follow-up updates, notify the parent component
    if (requiresTargetWeightUpdate || requiresWeeklyRateUpdate) {
      onGoalChangeRequiresUpdate(selectedGoal, requiresTargetWeightUpdate, requiresWeeklyRateUpdate)
    }
  }

  // Determine if target weight needs update based on goal change
  const needsTargetWeightUpdate = (
    oldGoal: string,
    newGoal: string,
    currentWeight: number,
    targetWeight: number,
  ): boolean => {
    // If switching from lose_weight to gain_weight and target is less than current
    if (oldGoal === "lose_weight" && newGoal === "gain_weight" && targetWeight < currentWeight) {
      return true
    }

    // If switching from gain_weight to lose_weight and target is more than current
    if (oldGoal === "gain_weight" && newGoal === "lose_weight" && targetWeight > currentWeight) {
      return true
    }

    // If switching to/from maintain_weight
    if (
      (oldGoal === "maintain_weight" && (newGoal === "lose_weight" || newGoal === "gain_weight")) ||
      ((oldGoal === "lose_weight" || oldGoal === "gain_weight") && newGoal === "maintain_weight")
    ) {
      return true
    }

    return false
  }

  // Determine if weekly rate needs update based on goal change
  const needsWeeklyRateUpdate = (oldGoal: string, newGoal: string): boolean => {
    // If switching between lose_weight and gain_weight
    if (
      (oldGoal === "lose_weight" && newGoal === "gain_weight") ||
      (oldGoal === "gain_weight" && newGoal === "lose_weight")
    ) {
      return true
    }

    // If switching from maintain_weight to a goal that needs weekly rate
    if (oldGoal === "maintain_weight" && (newGoal === "lose_weight" || newGoal === "gain_weight")) {
      return true
    }

    return false
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>מטרה</Text>

            <ScrollView style={styles.optionsContainer}>
              {goals.map((goal) => (
                <AnimatedOption
                  key={goal.id}
                  label={goal.label}
                  icon={goal.icon}
                  isSelected={selectedGoal === goal.id}
                  onSelect={() => setSelectedGoal(goal.id)}
                  accentColor="#22c55e"
                  style={{ paddingVertical: 18 }}
                  textStyle={{ fontSize: 16 }}
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
    color: "#166534",
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
    backgroundColor: "#22c55e",
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

export default GoalSelectionModal
