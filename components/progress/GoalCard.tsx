// components/Progress/GoalCard.tsx
import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface GoalCardProps {
  goalData: any
  progress: number
  getGoalDescription: () => string
  getMotivationalMessage: (progress: number) => string
}

const GoalCard: React.FC<GoalCardProps> = ({
  goalData,
  progress,
  getGoalDescription,
  getMotivationalMessage,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>היעד שלך</Text>
        <Ionicons name="flag" size={24} color="#0891b2" />
      </View>
      <Text style={styles.description}>{getGoalDescription()}</Text>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarForeground, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(0)}% הושלם</Text>
      </View>
      <Text style={styles.motivationalText}>{getMotivationalMessage(progress)}</Text>
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
  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  description: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 16,
    textAlign: "right",
  },
  progressContainer: {
    marginVertical: 12,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarForeground: {
    height: "100%",
    backgroundColor: "#0891b2",
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "right",
  },
  motivationalText: {
    fontSize: 15,
    color: "#0891b2",
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
})

export default GoalCard
