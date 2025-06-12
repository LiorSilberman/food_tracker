"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import { auth } from "@/firebase"
import { getWeightHistoryFromSQLite, deleteWeightEntryAndSync } from "@/services/weightService"

type WeightEntry = {
  id: string
  weight: number
  timestamp: Date
}

type WeightHistoryModalProps = {
  visible: boolean
  onClose: () => void
  onWeightDeleted: () => void
}

const WeightHistoryModal = ({ visible, onClose, onWeightDeleted }: WeightHistoryModalProps) => {
  const [loading, setLoading] = useState(true)
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      fetchWeightHistory()
    }
  }, [visible])

  const fetchWeightHistory = async () => {
    try {
      setLoading(true)
      const user = auth.currentUser
      if (!user) return

      const history = await getWeightHistoryFromSQLite(user.uid)
      setWeightHistory(history)
    } catch (e) {
      console.error("Error fetching weight history:", e)
      Alert.alert("שגיאה", "אירעה שגיאה בטעינת היסטוריית המשקל")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: string, weight: number, date: Date) => {
    const formattedDate = date.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    Alert.alert(
      "מחיקת רשומת משקל",
      `האם אתה בטוח שברצונך למחוק את רשומת המשקל ${weight} ק״ג מתאריך ${formattedDate}?`,
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: () => deleteWeightEntry(id),
        },
      ],
    )
  }

  const deleteWeightEntry = async (id: string) => {
    try {
      setDeletingId(id)
      const success = await deleteWeightEntryAndSync(id)

      if (success) {
        // Remove the entry from the local state
        setWeightHistory(weightHistory.filter((entry) => entry.id !== id))
        Alert.alert("נמחק בהצלחה", "רשומת המשקל נמחקה בהצלחה")
        onWeightDeleted() // Notify parent component that a weight was deleted
      } else {
        Alert.alert("שגיאה", "אירעה שגיאה במחיקת רשומת המשקל")
      }
    } catch (e) {
      console.error("Error deleting weight entry:", e)
      Alert.alert("שגיאה", "אירעה שגיאה במחיקת רשומת המשקל")
    } finally {
      setDeletingId(null)
    }
  }

  const renderWeightItem = ({ item }: { item: WeightEntry }) => {
    const formattedDate = item.timestamp.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    const formattedTime = item.timestamp.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })

    // Find the previous entry to calculate difference
    const currentIndex = weightHistory.findIndex((entry) => entry.id === item.id)
    const nextEntry = weightHistory[currentIndex + 1]
    const weightDiff = nextEntry ? (item.weight - nextEntry.weight).toFixed(1) : null

    return (
      <View style={styles.weightItem}>
        <View style={styles.weightInfo}>
          <Text style={styles.weightValue}>{item.weight} ק״ג</Text>

          {weightDiff && (
            <Text
              style={[
                styles.weightDiff,
                Number.parseFloat(weightDiff) > 0
                  ? styles.weightIncrease
                  : Number.parseFloat(weightDiff) < 0
                    ? styles.weightDecrease
                    : styles.weightSame,
              ]}
            >
              {Number.parseFloat(weightDiff) > 0 ? "+" : ""}
              {weightDiff} ק״ג
            </Text>
          )}

          <Text style={styles.weightDate}>{formattedDate}</Text>
          <Text style={styles.weightTime}>{formattedTime}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item.id, item.weight, item.timestamp)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>היסטוריית משקל</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0891b2" />
                <Text style={styles.loadingText}>טוען היסטוריית משקל...</Text>
              </View>
            ) : weightHistory.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="scale-outline" size={64} color="#94a3b8" />
                <Text style={styles.emptyText}>אין רשומות משקל</Text>
                <Text style={styles.emptySubtext}>הוסף משקל חדש מהמסך הקודם</Text>
              </View>
            ) : (
              <>
                <Text style={styles.instructionText}>לחץ על סמל הפח כדי למחוק רשומה</Text>
                <FlatList
                  data={weightHistory}
                  renderItem={renderWeightItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  style={styles.list}
                />
              </>
            )}

            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>סגור</Text>
            </TouchableOpacity>
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "80%",
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
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#0891b2",
  },
  emptyContainer: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
  },
  instructionText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 12,
    textAlign: "center",
  },
  list: {
    width: "100%",
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 20,
  },
  weightItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weightInfo: {
    flex: 1,
    alignItems: "flex-end",
  },
  weightValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  weightDiff: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  weightIncrease: {
    color: "#ef4444", // Red for weight gain
  },
  weightDecrease: {
    color: "#22c55e", // Green for weight loss
  },
  weightSame: {
    color: "#64748b", // Gray for no change
  },
  weightDate: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  weightTime: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  doneButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    width: "100%",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default WeightHistoryModal
