"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { auth } from "@/firebase"
import { fetchHourlyCaloriesFromSQLite } from "@/services/sqliteService"
import { db } from "@/dbInit"

const { width } = Dimensions.get("window")

// Update these constants at the top of the file
const BAR_WIDTH = 50 // Increased from 40
const BAR_MARGIN = 5 // Decreased from 10
const CHART_HEIGHT = 300
const CHART_PADDING_TOP = 20
const CHART_PADDING_BOTTOM = 40
const Y_AXIS_WIDTH = 40 // Decreased from 50
const X_AXIS_HEIGHT = 40 // Height reserved for x-axis labels

// Update the interface declaration to export it
export interface DayData {
  date: string
  value: number
  isCurrentDay?: boolean
}

// Update the TimeRangeBarChartProps interface to include all required props
export type TimeRange = "day" | "week" | "month" | "6months" | "year"

export interface TimeRangeBarChartProps {
  date?: Date
  title?: string
  valueLabel?: string
  dataByRange?: { [key: string]: DayData[] }
  activeColor?: string
  targetColor?: string
  belowTargetColor?: string
  aboveTargetColor?: string
  fullWidth?: boolean
  backgroundColor?: string
  onBarPress?: (data: DayData) => void
  targetCaloriesValue?: number
}

// Helper function to check if two dates are the same day (ignoring time)
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Helper function to get a date string in YYYY-MM-DD format
const getDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

// Update the component definition to use all props
const TimeRangeBarChart: React.FC<TimeRangeBarChartProps> = ({
  date: initialDate,
  title = "Activity",
  valueLabel = "Value",
  dataByRange,
  activeColor = "#0c4a6e",
  targetColor = "#475569",
  belowTargetColor = "#0369a1",
  aboveTargetColor = "#166534",
  fullWidth = true,
  backgroundColor,
  onBarPress,
  targetCaloriesValue = 2000, // Default value if not provided
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("day")
  const [data, setData] = useState<DayData[]>([])
  const [selectedBar, setSelectedBar] = useState<DayData | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<Date>(initialDate || new Date())
  const scrollViewRef = useRef<ScrollView>(null)
  const animation = useRef(new Animated.Value(0)).current
  const today = new Date() // Today's date for comparison

  // Use external data if provided, otherwise fetch from SQLite
  useEffect(() => {
    if (dataByRange && dataByRange[timeRange]) {
      setData(dataByRange[timeRange] || [])
    } else {
      fetchData()
    }
  }, [timeRange, date, dataByRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const fetchedData = await fetchDataForRange(timeRange, date)
      setData(fetchedData)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // --- Data Fetching: Fetch meals data for a given time range ---
  // Update the fetchDataForRange function to use SQLite
  const fetchDataForRange = async (range: TimeRange, date: Date = new Date()): Promise<DayData[]> => {
    if (!auth.currentUser) return []
    const userId = auth.currentUser.uid

    switch (range) {
      case "day":
        // Use the SQLite helper function for hourly data with the specific date
        return await fetchHourlyCaloriesFromSQLite(userId, date)
      case "week":
        // For week view, we'll need to implement a new helper function
        return await fetchWeeklyCaloriesFromSQLite(userId, date)
      case "month":
        // For month view, we'll need to implement a new helper function
        return await fetchMonthlyCaloriesFromSQLite(userId, date)
      case "6months":
        // For 6 months view, we'll need to implement a new helper function
        return await fetch6MonthsCaloriesFromSQLite(userId, date)
      case "year":
        // For year view, we'll need to implement a new helper function
        return await fetchYearlyCaloriesFromSQLite(userId, date)
      default:
        return []
    }
  }

  // Helper functions for different time ranges
  const fetchWeeklyCaloriesFromSQLite = async (userId: string, date: Date = new Date()): Promise<DayData[]> => {
    try {
      // Get the current date without time component
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayString = getDateString(today)

      console.log(`Today's date: ${todayString}`)

      // Get the start of the week (Sunday) for the provided date
      const startDate = new Date(date)
      const day = startDate.getDay() // 0 is Sunday, 1 is Monday, etc.
      startDate.setDate(startDate.getDate() - day) // Go back to the previous Sunday
      startDate.setHours(0, 0, 0, 0)

      // Get the end of the week (Saturday)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6) // Saturday is 6 days after Sunday
      endDate.setHours(23, 59, 59, 999)

      const startIso = startDate.toISOString()
      const endIso = endDate.toISOString()

      console.log(`Fetching weekly data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)

      // Query SQLite for daily totals within the week
      const rows = await db.getAllAsync(
        `SELECT date(datetime(timestamp, 'localtime')) AS day, SUM(calories) AS total
         FROM meals
         WHERE user_id = ?
           AND datetime(timestamp, 'localtime') BETWEEN datetime(?, 'localtime') AND datetime(?, 'localtime')
         GROUP BY day
         ORDER BY day ASC;`,
        [userId, startIso, endIso],
      )

      // Create a map of day -> calories
      const dailyTotals: { [key: string]: number } = {}
      rows.forEach((row: any) => {
        dailyTotals[row.day] = row.total
      })

      // Create an array with all days of the week
      const result: DayData[] = []

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startDate)
        currentDay.setDate(startDate.getDate() + i)

        // Format as YYYY-MM-DD for comparison
        const dayString = getDateString(currentDay)

        // Check if this is today
        const isToday = dayString === todayString

        console.log(`Day ${i}: ${dayString}, isToday: ${isToday}, value: ${dailyTotals[dayString] || 0}`)

        result.push({
          date: currentDay.toISOString(),
          value: dailyTotals[dayString] || 0,
          isCurrentDay: isToday,
        })
      }

      return result
    } catch (err) {
      console.error("Error fetching weekly calories from SQLite:", err)
      return []
    }
  }

  const fetchMonthlyCaloriesFromSQLite = async (userId: string, date: Date = new Date()): Promise<DayData[]> => {
    try {
      // Get the current date without time component
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayString = getDateString(today)

      // Get the start and end of the month
      const year = date.getFullYear()
      const month = date.getMonth()
      const startDate = new Date(year, month, 1)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(year, month + 1, 0)
      endDate.setHours(23, 59, 59, 999)

      const startIso = startDate.toISOString()
      const endIso = endDate.toISOString()

      console.log(`Fetching monthly data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)

      // Query SQLite for daily totals within the month
      const rows = await db.getAllAsync(
        `SELECT date(datetime(timestamp, 'localtime')) AS day, SUM(calories) AS total
         FROM meals
         WHERE user_id = ?
           AND timestamp BETWEEN ? AND ?
         GROUP BY day
         ORDER BY day ASC;`,
        [userId, startIso, endIso],
      )

      // Create a map of day -> calories
      const dailyTotals: { [key: string]: number } = {}
      rows.forEach((row: any) => {
        dailyTotals[row.day] = row.total
      })

      // Create an array with all days of the month
      const daysInMonth = endDate.getDate()
      const result: DayData[] = []

      for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(year, month, i)
        const dayString = getDateString(day)

        // Check if this is today
        const isToday = dayString === todayString

        result.push({
          date: day.toISOString(),
          value: dailyTotals[dayString] || 0,
          isCurrentDay: isToday,
        })
      }

      return result
    } catch (err) {
      console.error("Error fetching monthly calories from SQLite:", err)
      return []
    }
  }

  // Update the fetch6MonthsCaloriesFromSQLite function to calculate the average across ALL days in the month
  const fetch6MonthsCaloriesFromSQLite = async (userId: string, date: Date = new Date()): Promise<DayData[]> => {
    try {
      // Get the current date's month and year
      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      // Get the start date (5 months before the current month)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate())
      endDate.setHours(23, 59, 59, 999)

      const startDate = new Date(date)
      startDate.setMonth(startDate.getMonth() - 5)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)

      const startIso = startDate.toISOString()
      const endIso = endDate.toISOString()

      console.log(`Fetching 6 months data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)

      // Query SQLite for monthly totals
      const rows = await db.getAllAsync(
        `SELECT strftime('%Y-%m', datetime(timestamp, 'localtime')) AS month, SUM(calories) AS total
       FROM meals
       WHERE user_id = ?
         AND timestamp BETWEEN ? AND ?
       GROUP BY month
       ORDER BY month ASC;`,
        [userId, startIso, endIso],
      )

      // Create a map of month -> total calories
      const monthlyTotals: { [key: string]: number } = {}

      rows.forEach((row: any) => {
        const [year, month] = row.month.split("-").map(Number)
        const monthKey = `${year}-${month - 1}` // Convert from 1-based to 0-based month
        monthlyTotals[monthKey] = row.total || 0
      })

      // Create array with all months in the 6-month period
      const result: DayData[] = []

      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(startDate)
        monthDate.setMonth(startDate.getMonth() + i)

        const year = monthDate.getFullYear()
        const month = monthDate.getMonth()

        // Calculate days in this month
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        const monthKey = `${year}-${month}`

        // Calculate average: total calories / days in month
        const totalCalories = monthlyTotals[monthKey] || 0
        const averageCalories = Math.round((totalCalories / daysInMonth) * 100) / 100

        // Check if this is the current month
        const isCurrentMonth = monthDate.getMonth() === currentMonth && monthDate.getFullYear() === currentYear

        result.push({
          date: monthDate.toISOString(),
          value: averageCalories,
          isCurrentDay: isCurrentMonth,
        })
      }

      return result
    } catch (err) {
      console.error("Error fetching 6 months calories from SQLite:", err)
      return []
    }
  }

  // Update the fetchYearlyCaloriesFromSQLite function to calculate the average across ALL days in the month
  const fetchYearlyCaloriesFromSQLite = async (userId: string, date: Date = new Date()): Promise<DayData[]> => {
    try {
      // Get the current month
      const today = new Date()
      const currentMonth = today.getMonth()

      // Get the start and end of the year
      const year = date.getFullYear()
      const startDate = new Date(year, 0, 1)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(year, 11, 31)
      endDate.setHours(23, 59, 59, 999)

      const startIso = startDate.toISOString()
      const endIso = endDate.toISOString()

      console.log(`Fetching yearly data from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`)

      // Query SQLite for monthly totals
      const rows = await db.getAllAsync(
        `SELECT strftime('%m', datetime(timestamp, 'localtime')) AS month, SUM(calories) AS total
       FROM meals
       WHERE user_id = ?
         AND timestamp BETWEEN ? AND ?
       GROUP BY month
       ORDER BY month ASC;`,
        [userId, startIso, endIso],
      )

      // Create a map of month -> total calories
      const monthlyTotals: { [key: string]: number } = {}

      rows.forEach((row: any) => {
        const monthIndex = Number.parseInt(row.month) - 1 // Convert from 1-based to 0-based month
        monthlyTotals[monthIndex] = row.total || 0
      })

      // Create an array with all months of the year
      const result: DayData[] = []

      for (let month = 0; month < 12; month++) {
        // Calculate days in this month
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        // Calculate average: total calories / days in month
        const totalCalories = monthlyTotals[month] || 0
        const averageCalories = Math.round((totalCalories / daysInMonth) * 100) / 100

        const monthDate = new Date(year, month, 1)
        result.push({
          date: monthDate.toISOString(),
          value: averageCalories,
          isCurrentDay: month === currentMonth,
        })
      }

      return result
    } catch (err) {
      console.error("Error fetching yearly calories from SQLite:", err)
      return []
    }
  }

  const handleBarPress = (item: DayData) => {
    if (onBarPress) {
      onBarPress(item)
    } else {
      setSelectedBar(item)
      setModalVisible(true)
    }
  }

  const closeModal = () => {
    setModalVisible(false)
  }

  const changeTimeRange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange)
    // Reset to current date when changing time ranges
    setDate(new Date())
  }

  const handlePrev = () => {
    let newDate: Date
    switch (timeRange) {
      case "day":
        newDate = new Date(date)
        newDate.setDate(date.getDate() - 1)
        break
      case "week":
        newDate = new Date(date)
        newDate.setDate(date.getDate() - 7)
        break
      case "month":
        newDate = new Date(date)
        newDate.setMonth(date.getMonth() - 1)
        break
      case "6months":
        newDate = new Date(date)
        newDate.setMonth(date.getMonth() - 6)
        break
      case "year":
        newDate = new Date(date)
        newDate.setFullYear(date.getFullYear() - 1)
        break
      default:
        newDate = new Date(date)
    }
    setDate(newDate)
  }

  const handleNext = () => {
    const today = new Date()
    let newDate: Date

    switch (timeRange) {
      case "day":
        newDate = new Date(date)
        newDate.setDate(date.getDate() + 1)
        // Don't allow navigating to future dates
        if (newDate > today) return
        break
      case "week":
        newDate = new Date(date)
        newDate.setDate(date.getDate() + 7)
        // Don't allow navigating to future dates
        if (newDate > today) return
        break
      case "month":
        newDate = new Date(date)
        newDate.setMonth(date.getMonth() + 1)
        // Don't allow navigating to future dates
        if (newDate > today) return
        break
      case "6months":
        newDate = new Date(date)
        newDate.setMonth(date.getMonth() + 6)
        // Don't allow navigating to future dates
        if (newDate > today) return
        break
      case "year":
        newDate = new Date(date)
        newDate.setFullYear(date.getFullYear() + 1)
        // Don't allow navigating to future dates
        if (newDate > today) return
        break
      default:
        newDate = new Date(date)
    }
    setDate(newDate)
  }

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    switch (timeRange) {
      case "day":
        return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
      case "week":
        // Use a more explicit way to get the weekday abbreviation
        const weekdays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
        return weekdays[date.getDay()]
      case "month":
        return date.getDate().toString()
      case "6months":
      case "year":
        return date.toLocaleDateString("he-IL", { month: "short" })
      default:
        return ""
    }
  }

  const formatModalDate = () => {
    if (!selectedBar) return ""
    const date = new Date(selectedBar.date)
    return date.toLocaleDateString("he-IL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Calculate max value for scaling bars
  const maxValue = Math.max(...data.map((item) => item.value), targetCaloriesValue || 0, 1)

  const getTargetLinePosition = () => {
    if (!targetCaloriesValue || timeRange === "day") return null

    const position =
      (targetCaloriesValue / maxValue) * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM - X_AXIS_HEIGHT)

    return CHART_HEIGHT - X_AXIS_HEIGHT - position - CHART_PADDING_BOTTOM
  }

  const targetLinePosition = getTargetLinePosition()

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.dayNavigation}>
          <TouchableOpacity style={styles.dayNavButton} onPress={handlePrev}>
            <Ionicons name="chevron-back" size={24} color="#475569" />
          </TouchableOpacity>
          <Text style={styles.rangeTitle}>
            {timeRange === "day"
              ? date.toLocaleDateString("he-IL", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              : timeRange === "week"
                ? (() => {
                    const startOfWeek = new Date(date)
                    startOfWeek.setDate(date.getDate() - date.getDay())
                    const endOfWeek = new Date(startOfWeek)
                    endOfWeek.setDate(startOfWeek.getDate() + 6)
                    return `${startOfWeek.toLocaleDateString("he-IL", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("he-IL", { month: "short", day: "numeric", year: "numeric" })}`
                  })()
                : timeRange === "month"
                  ? date.toLocaleDateString("he-IL", { month: "long", year: "numeric" })
                  : timeRange === "6months"
                    ? (() => {
                        const startDate = new Date(date)
                        startDate.setMonth(date.getMonth() - 5)
                        return `${startDate.toLocaleDateString("he-IL", { month: "short", year: "numeric" })} - ${date.toLocaleDateString("he-IL", { month: "short", year: "numeric" })}`
                      })()
                    : `${date.getFullYear()}`}
          </Text>
          <TouchableOpacity
            style={[
              styles.dayNavButton,
              // Disable next button if we're at the current date/period
              new Date() < date ? styles.dayNavButtonDisabled : null,
            ]}
            onPress={handleNext}
            disabled={new Date() < date}
          >
            <Ionicons name="chevron-forward" size={24} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Range Selector - Now static */}
      <View style={styles.rangeSelector}>
        <TouchableOpacity
          style={[styles.rangeButton, timeRange === "day" && styles.rangeButtonActive]}
          onPress={() => changeTimeRange("day")}
        >
          <Text style={[styles.rangeButtonText, timeRange === "day" && styles.rangeButtonTextActive]}>יום</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeButton, timeRange === "week" && styles.rangeButtonActive]}
          onPress={() => changeTimeRange("week")}
        >
          <Text style={[styles.rangeButtonText, timeRange === "week" && styles.rangeButtonTextActive]}>שבוע</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeButton, timeRange === "month" && styles.rangeButtonActive]}
          onPress={() => changeTimeRange("month")}
        >
          <Text style={[styles.rangeButtonText, timeRange === "month" && styles.rangeButtonTextActive]}>חודש</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeButton, timeRange === "6months" && styles.rangeButtonActive]}
          onPress={() => changeTimeRange("6months")}
        >
          <Text style={[styles.rangeButtonText, timeRange === "6months" && styles.rangeButtonTextActive]}>חצי שנה</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeButton, timeRange === "year" && styles.rangeButtonActive]}
          onPress={() => changeTimeRange("year")}
        >
          <Text style={[styles.rangeButtonText, timeRange === "year" && styles.rangeButtonTextActive]}>שנה</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Container */}
      <View style={styles.chartOuterContainer}>
        {/* Y-axis */}
        <View style={styles.yAxisContainer}>
          {[3, 2, 1, 0].map((i) => (
            <View key={i} style={styles.yAxisLabelContainer}>
              <Text style={styles.yAxisValue}>{Math.round((maxValue * i) / 3)}</Text>
            </View>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          {/* Grid lines */}
          {[3, 2, 1, 0].map((i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                {
                  top:
                    (i * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM - X_AXIS_HEIGHT)) / 3 +
                    CHART_PADDING_TOP,
                },
              ]}
            />
          ))}

          {/* Target calories line */}
          {targetLinePosition !== null && timeRange !== "day" && targetCaloriesValue && (
            <View style={[styles.targetLine, { top: targetLinePosition }]}>
              <Text style={styles.targetLabel}>יעד: {targetCaloriesValue}</Text>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color={belowTargetColor} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
              ref={scrollViewRef}
            >
              {data.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleBarPress(item)}
                  style={styles.barContainer}
                  activeOpacity={item.value > 0 ? 0.7 : 1}
                >
                  {item.value > 0 && (
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(
                            4,
                            (item.value / maxValue) *
                              (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM - X_AXIS_HEIGHT),
                          ),
                          backgroundColor: item.isCurrentDay ? "#16a34a" : belowTargetColor,
                        },
                      ]}
                    />
                  )}
                  <Text style={[styles.barLabel, item.isCurrentDay && styles.currentDayLabel]}>
                    {formatDateLabel(item.date)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: "#16a34a" }]} />
          <Text style={styles.legendText}>יום נוכחי</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: belowTargetColor }]} />
          <Text style={styles.legendText}>ימים אחרים</Text>
        </View>
      </View>

      {/* Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>פרטים</Text>
              {selectedBar && (
                <>
                  <Text style={styles.modalTime}>{formatModalDate()}</Text>
                  <Text style={styles.modalValue}>
                    {selectedBar.value} {valueLabel}
                  </Text>
                </>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginBottom: 24,
    borderRadius: 24,
  },
  header: {
    marginBottom: 20,
    alignItems: "flex-end", // Right-align for Hebrew
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
    color: "#0f172a",
    textAlign: "right", // Right-align for Hebrew
  },
  dayNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  dayNavButton: {
    padding: 8,
    borderRadius: 12,
  },
  dayNavButtonDisabled: {
    opacity: 0.4,
  },
  datePickerButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },

  rangeTitle: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.9,
    color: "#0f172a",
    textAlign: "center",
  },
  rangeSelector: {
    flexDirection: "row-reverse",
    paddingVertical: 8,
    marginBottom: 20,
    justifyContent: "space-between",
  },
  rangeButton: {
    // paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
    marginHorizontal: 3,
    alignItems: "center",
  },
  rangeButtonActive: {
    backgroundColor: "#0c4a6e",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rangeButtonText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
  },
  rangeButtonTextActive: {
    color: "white",
    fontWeight: "700",
  },
  chartOuterContainer: {
    flexDirection: "row",
    height: CHART_HEIGHT,
  },
  yAxisContainer: {
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT - X_AXIS_HEIGHT,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: CHART_PADDING_TOP,
    paddingBottom: CHART_PADDING_BOTTOM,
  },
  yAxisLabelContainer: {
    height: 20,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  yAxisValue: {
    fontSize: 10,
    color: "#64748b",
    marginRight: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    paddingHorizontal: 2,
  },
  chartContainer: {
    position: "relative",
    flex: 1,
    height: CHART_HEIGHT,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "rgba(203, 213, 225, 0.5)",
    zIndex: 1,
  },
  targetLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#ef4444",
    zIndex: 2,
    borderStyle: "dashed",
  },
  targetLabel: {
    position: "absolute",
    right: 4,
    top: -16,
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "600",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartScrollContent: {
    height: CHART_HEIGHT - X_AXIS_HEIGHT - 16,
    minWidth: width - 60 - Y_AXIS_WIDTH, // Decreased padding from 80 to 60
    paddingBottom: 0,
    paddingTop: CHART_PADDING_TOP,
  },
  barContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    marginRight: BAR_MARGIN,
    width: BAR_WIDTH,
  },
  bar: {
    width: BAR_WIDTH,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  barLabel: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    color: "#334155",
    fontWeight: "500",
  },
  currentDayLabel: {
    fontWeight: "700",
    color: "#16a34a",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    textAlign: "right", // Right-align for Hebrew
  },
  modalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0c4a6e",
    marginBottom: 8,
    textAlign: "right", // Right-align for Hebrew
  },
  modalTime: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
    textAlign: "right", // Right-align for Hebrew
  },
  closeButton: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 14,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#475569",
  },
})

export default TimeRangeBarChart
