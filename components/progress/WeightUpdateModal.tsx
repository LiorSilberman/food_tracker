// components/Progress/WeightUpdateModal.tsx
import React from "react"
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Platform } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface WeightUpdateModalProps {
  visible: boolean
  newWeight: string
  onChangeWeight: (text: string) => void
  onUpdate: () => void
  onCancel: () => void
}

const WeightUpdateModal: React.FC<WeightUpdateModalProps> = ({
  visible,
  newWeight,
  onChangeWeight,
  onUpdate,
  onCancel,
}) => {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>עדכון משקל</Text>
            <TouchableOpacity onPress={onCancel}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>הכנס את המשקל הנוכחי שלך (ק״ג)</Text>
          <TextInput
            style={styles.input}
            value={newWeight}
            onChangeText={onChangeWeight}
            keyboardType="numeric"
            placeholder="משקל בק״ג"
            placeholderTextColor="#94a3b8"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={onUpdate}>
              <Text style={styles.saveButtonText}>שמור</Text>
            </TouchableOpacity>
          </View>
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
  modalContent: {
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
  inputLabel: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 12,
    textAlign: "right",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    fontSize: 16,
    textAlign: "right",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 6,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 6,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
})

export default WeightUpdateModal
