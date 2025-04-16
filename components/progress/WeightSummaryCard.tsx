// components/Progress/WeightSummaryCard.tsx
import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface WeightSummaryCardProps {
  currentWeight: number | null
  goalData: { targetWeight: number } | null
  weightChangeDirection: "up" | "down" | "none"
  weightChangeAmount: number
  onPressUpdate: () => void
  getRemainingWeight: (current: number, target: number) => string
}

const WeightSummaryCard: React.FC<WeightSummaryCardProps> = ({
  currentWeight,
  goalData,
  weightChangeDirection,
  weightChangeAmount,
  onPressUpdate,
  getRemainingWeight,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>משקל נוכחי</Text>
          <Text style={styles.value}>
            {currentWeight ? `${currentWeight}` : "0"}<Text style={styles.unit}> ק״ג</Text>
          </Text>
          {weightChangeDirection !== "none" && (
            <View style={styles.changeContainer}>
              <Ionicons
                name={weightChangeDirection === "down" ? "arrow-down" : "arrow-up"}
                size={16}
                color={weightChangeDirection === "down" ? "#10b981" : "#ef4444"}
              />
              <Text style={[
                styles.changeText,
                { color: weightChangeDirection === "down" ? "#10b981" : "#ef4444" },
              ]}>
                {weightChangeAmount.toFixed(1)} ק״ג
              </Text>
            </View>
          )}
        </View>
        <View style={styles.separator} />
        <View style={styles.section}>
          <Text style={styles.label}>משקל יעד</Text>
          <Text style={styles.value}>
            {goalData?.targetWeight ? `${goalData.targetWeight}` : "0"}<Text style={styles.unit}> ק״ג</Text>
          </Text>
          {currentWeight && goalData?.targetWeight && (
            <Text style={styles.remainingText}>
              {getRemainingWeight(currentWeight, goalData.targetWeight)}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={onPressUpdate}>
        <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>עדכון משקל</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  section: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
  },
  unit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  separator: {
    width: 1,
    height: "100%",
    backgroundColor: "#e2e8f0",
    marginHorizontal: 15,
  },
  remainingText: {
    fontSize: 14,
    color: "#0891b2",
    fontWeight: "500",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#0891b2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default WeightSummaryCard
