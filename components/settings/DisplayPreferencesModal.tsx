"use client"

import { useState, useEffect } from "react"
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Switch } from "react-native"
import { BlurView } from "expo-blur"
import { Ionicons } from "@expo/vector-icons"
import {
  getDisplayPreferences,
  saveDisplayPreferences,
  type DisplayPreferences,
  DEFAULT_DISPLAY_PREFERENCES,
} from "@/services/displayPreferencesService"

type DisplayPreferencesModalProps = {
  visible: boolean
  onClose: () => void
}

const DisplayPreferencesModal = ({ visible, onClose }: DisplayPreferencesModalProps) => {
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_DISPLAY_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      loadPreferences()
    }
  }, [visible])

  const loadPreferences = async () => {
    setLoading(true)
    try {
      const userPreferences = await getDisplayPreferences()
      setPreferences(userPreferences)
    } catch (error) {
      console.error("Error loading display preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveDisplayPreferences(preferences)
      onClose()
    } catch (error) {
      console.error("Error saving display preferences:", error)
    } finally {
      setSaving(false)
    }
  }

  const toggleSwitch = (key: keyof DisplayPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <BlurView intensity={40} tint="dark" style={styles.blur}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>התאמה אישית של המסך הראשי</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0891b2" />
                <Text style={styles.loadingText}>טוען הגדרות...</Text>
              </View>
            ) : (
              <>
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={24} color="#0891b2" style={styles.infoIcon} />
                  <Text style={styles.infoText}>בחר אילו רכיבים תזונתיים יוצגו במסך הראשי של האפליקציה.</Text>
                </View>

                <View style={styles.optionsContainer}>
                  <View style={styles.optionItem}>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>מעגל קלוריות</Text>
                      <Text style={styles.optionDescription}>הצג את מעגל הקלוריות היומיות</Text>
                    </View>
                    <Switch
                      trackColor={{ false: "#cbd5e1", true: "#0891b2" }}
                      thumbColor={preferences.showCaloriesCircle ? "#ffffff" : "#f4f3f4"}
                      ios_backgroundColor="#cbd5e1"
                      onValueChange={() => toggleSwitch("showCaloriesCircle")}
                      value={preferences.showCaloriesCircle}
                    />
                  </View>

                  <View style={styles.optionItem}>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>חלבון</Text>
                      <Text style={styles.optionDescription}>הצג את סרגל החלבון היומי</Text>
                    </View>
                    <Switch
                      trackColor={{ false: "#cbd5e1", true: "#e95899" }}
                      thumbColor={preferences.showProteinBar ? "#ffffff" : "#f4f3f4"}
                      ios_backgroundColor="#cbd5e1"
                      onValueChange={() => toggleSwitch("showProteinBar")}
                      value={preferences.showProteinBar}
                    />
                  </View>

                  <View style={styles.optionItem}>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>שומנים</Text>
                      <Text style={styles.optionDescription}>הצג את סרגל השומנים היומי</Text>
                    </View>
                    <Switch
                      trackColor={{ false: "#cbd5e1", true: "#fc9e7f" }}
                      thumbColor={preferences.showFatBar ? "#ffffff" : "#f4f3f4"}
                      ios_backgroundColor="#cbd5e1"
                      onValueChange={() => toggleSwitch("showFatBar")}
                      value={preferences.showFatBar}
                    />
                  </View>

                  <View style={styles.optionItem}>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>פחמימות</Text>
                      <Text style={styles.optionDescription}>הצג את סרגל הפחמימות היומי</Text>
                    </View>
                    <Switch
                      trackColor={{ false: "#cbd5e1", true: "#32cbc6" }}
                      thumbColor={preferences.showCarbsBar ? "#ffffff" : "#f4f3f4"}
                      ios_backgroundColor="#cbd5e1"
                      onValueChange={() => toggleSwitch("showCarbsBar")}
                      value={preferences.showCarbsBar}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveButtonText}>שמור שינויים</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
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
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#0891b2",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "flex-start",
    width: "100%",
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    color: "#0c4a6e",
    flex: 1,
    textAlign: "right",
    lineHeight: 20,
  },
  optionsContainer: {
    width: "100%",
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    width: "100%",
  },
  optionTextContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "right",
  },
  optionDescription: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#0891b2",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.7,
  },
})

export default DisplayPreferencesModal
