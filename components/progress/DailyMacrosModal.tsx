// components/Progress/DailyMacrosModal.tsx
import React from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { formatDate } from "@/utils/dateHelpers"

interface DailyMacrosModalProps {
  visible: boolean
  selectedDay: any
  onClose: () => void
}

const DailyMacrosModal: React.FC<DailyMacrosModalProps> = ({ visible, selectedDay, onClose }) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              פירוט תזונתי - {selectedDay ? formatDate(new Date(selectedDay.date)) : ""}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          {selectedDay && (
            <>
              <View style={styles.calorieContainer}>
                <Text style={styles.calorieText}>{selectedDay.calories} קלוריות</Text>
              </View>
              <View style={styles.macrosContainer}>
                {/* Protein */}
                <View style={styles.macroItem}>
                  <View style={[styles.iconContainer, { backgroundColor: "#e9d5ff" }]}>
                    <Ionicons name="fitness" size={20} color="#9333ea" />
                  </View>
                  <Text style={styles.macroValue}>{Math.round(selectedDay.protein_g)}g</Text>
                  <Text style={styles.macroLabel}>חלבון</Text>
                </View>
                {/* Carbs */}
                <View style={styles.macroItem}>
                  <View style={[styles.iconContainer, { backgroundColor: "#fed7aa" }]}>
                    <Ionicons name="leaf" size={20} color="#f97316" />
                  </View>
                  <Text style={styles.macroValue}>{Math.round(selectedDay.carbs_g)}g</Text>
                  <Text style={styles.macroLabel}>פחמימות</Text>
                </View>
                {/* Fat */}
                <View style={styles.macroItem}>
                  <View style={[styles.iconContainer, { backgroundColor: "#fecdd3" }]}>
                    <Ionicons name="water" size={20} color="#e11d48" />
                  </View>
                  <Text style={styles.macroValue}>{Math.round(selectedDay.fat_g)}g</Text>
                  <Text style={styles.macroLabel}>שומנים</Text>
                </View>
              </View>
              {selectedDay.meals && selectedDay.meals.length > 0 ? (
                <>
                  <Text style={styles.mealsTitle}>ארוחות</Text>
                  {selectedDay.meals.map((meal: any, index: number) => (
                    <View key={index} style={styles.mealRow}>
                      <Text style={styles.mealName}>{meal.name || `ארוחה ${index + 1}`}</Text>
                      <Text style={styles.mealCalories}>{meal.calories} קלוריות</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.noMealsText}>לא נמצאו ארוחות ביום זה</Text>
              )}
            </>
          )}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  calorieContainer: {
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 12,
  },
  calorieText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0891b2",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
  },
  macroItem: {
    alignItems: "center",
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  macroLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  mealsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
    textAlign: "right",
  },
  mealRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
    marginBottom: 8,
    borderRadius: 8,
  },
  mealName: {
    fontSize: 14,
    color: "#334155",
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0891b2",
  },
  noMealsText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginVertical: 20,
  },
  closeButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default DailyMacrosModal
