// components/Progress/WeightTrackingChart.tsx
import React from "react"
import { View, Text, StyleSheet, Dimensions } from "react-native"
import { LineChart } from "react-native-chart-kit"

interface WeightTrackingChartProps {
  lineChartData: any
  chartConfig: any
  weightHistory: any[]
}

const { width } = Dimensions.get("window")

const WeightTrackingChart: React.FC<WeightTrackingChartProps> = ({
  lineChartData,
  chartConfig,
  weightHistory,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>מעקב משקל</Text>
      </View>
      {weightHistory.length > 1 ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={lineChartData}
            width={width - 60}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chartStyle}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>אין מספיק נתונים להצגת גרף</Text>
          <Text style={styles.noDataSubtext}>עדכן את המשקל שלך באופן קבוע כדי לראות את ההתקדמות</Text>
        </View>
      )}
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
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noData: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
})

export default WeightTrackingChart
