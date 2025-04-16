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
import { getFirestore, collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { auth } from "@/firebase"

export type DayData = {
  date: string // ISO string
  value: number
}

export type TimeRange = "day" | "week" | "month" | "6months" | "year"

type TimeRangeBarChartProps = {
  dataByRange?: { [range in TimeRange]?: DayData[] }
  title?: string
  valueLabel?: string
  activeColor?: string
  targetColor?: string
  belowTargetColor?: string
  aboveTargetColor?: string
  fullWidth?: boolean
  backgroundColor?: string
}

const { width } = Dimensions.get("window")

// Chart constants
const BAR_WIDTH = 40
const BAR_MARGIN = 10
const CHART_HEIGHT = 300
const CHART_PADDING_TOP = 20
const CHART_PADDING_BOTTOM = 40
const Y_AXIS_WIDTH = 50
const X_AXIS_HEIGHT = 40 // Height reserved for x-axis labels

const TimeRangeBarChart: React.FC<TimeRangeBarChartProps> = ({
  dataByRange,
  title = "Activity",
  valueLabel = "Value",
  activeColor = "#0c4a6e",
  targetColor = "#475569",
  belowTargetColor = "#0369a1",
  aboveTargetColor = "#166534",
  fullWidth = true,
  backgroundColor,
}) => {
  // Internal state if external data isn't passed
  const [internalDataByRange, setInternalDataByRange] = useState<{ [range in TimeRange]?: DayData[] }>({})
  const [loading, setLoading] = useState<boolean>(false)

  // Selected range state
  const [selectedRange, setSelectedRange] = useState<TimeRange>("day")
  const effectiveDataByRange = dataByRange || internalDataByRange
  const [filteredData, setFilteredData] = useState<DayData[]>([])
  const [processedData, setProcessedData] = useState<DayData[]>([])

  // States for day navigation (for "day" view)
  const [daysData, setDaysData] = useState<{ [key: string]: DayData[] }>({})
  const [currentDayIndex, setCurrentDayIndex] = useState(0)

  // Add state to track the current date for day view
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Add state to track if data has been fetched for a specific range and date
  const [fetchedData, setFetchedData] = useState<{ [key: string]: boolean }>({})

  // States for tooltip and scrolling (advanced tooltip logic omitted for brevity)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipData, setTooltipData] = useState<{ date: string; value: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [tooltipPlacement, setTooltipPlacement] = useState<"top" | "bottom">("top")
  const [tooltipOpacity] = useState(new Animated.Value(0))
  const [maxValue, setMaxValue] = useState(0)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [visibleEndIndex, setVisibleEndIndex] = useState(0)

  // Modal states for showing calories and time
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBarData, setSelectedBarData] = useState<DayData | null>(null)

  const scrollRef = useRef<ScrollView>(null)
  const chartScrollRef = useRef<ScrollView>(null)

  // Add a new ref for tracking if initial scroll has happened
  const initialScrollDoneRef = useRef<{ [key in TimeRange]: boolean }>({
    day: false,
    week: false,
    month: false,
    "6months": false,
    year: false,
  })

  const ranges: TimeRange[] = ["day", "week", "month", "6months", "year"]
  const rangeLabels: { [key in TimeRange]: string } = {
    day: "Day",
    week: "Week",
    month: "Month",
    "6months": "6 Months",
    year: "Year",
  }

  const db = getFirestore()

  // --- Data Fetching: Fetch meals data for a given time range ---
  // Update the fetchDataForRange function to accept a date parameter
  const fetchDataForRange = async (range: TimeRange, date: Date = new Date()): Promise<DayData[]> => {
    if (!auth.currentUser) return []
    const userId = auth.currentUser.uid
    const mealsRef = collection(db, "users", userId, "meals")

    // Use the provided date instead of always using now
    const now = new Date(date)
    let startDate: Date

    switch (range) {
      case "day":
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate = new Date(now)
        // Get the start of the week (Sunday) for the provided date
        startDate.setDate(now.getDate() - now.getDay())
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "6months":
        startDate = new Date(now)
        startDate.setMonth(now.getMonth() - 6)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now)
    }

    // For end date, we need to calculate based on the range
    let endDate: Date
    if (range === "day") {
      endDate = new Date(startDate)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === "week") {
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === "month") {
      // Last day of the month
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === "6months") {
      endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)
    } else if (range === "year") {
      endDate = new Date(now.getFullYear(), 11, 31)
      endDate.setHours(23, 59, 59, 999)
    } else {
      endDate = new Date(now)
    }

    // Ensure we don't query future dates
    const currentDate = new Date()
    if (endDate > currentDate) {
      endDate = currentDate
    }

    console.log(`Fetching data for ${range} from ${startDate.toISOString()} to ${endDate.toISOString()}`)

    const mealsQuery = query(
      mealsRef,
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      where("timestamp", "<=", Timestamp.fromDate(endDate)),
      orderBy("timestamp", "asc"),
    )
    const mealsSnap = await getDocs(mealsQuery)

    // Group data differently for each range (same as before)
    if (range === "day") {
      // Group by hour (0-23)
      const hourlyTotals = new Array(24).fill(0)
      mealsSnap.forEach((doc) => {
        const data = doc.data()
        const mealDate = data.timestamp.toDate()
        const hour = mealDate.getHours()
        hourlyTotals[hour] += data.calories || 0
      })
      const dayData: DayData[] = []
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(startDate)
        hourDate.setHours(hour)
        dayData.push({ date: hourDate.toISOString(), value: hourlyTotals[hour] })
      }
      return dayData
    } else if (range === "week" || range === "month") {
      // Group by day
      const dailyTotals: { [key: string]: number } = {}
      mealsSnap.forEach((doc) => {
        const data = doc.data()
        const mealDate = data.timestamp.toDate()
        const dayKey = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate()).toISOString()
        if (!dailyTotals[dayKey]) {
          dailyTotals[dayKey] = 0
        }
        dailyTotals[dayKey] += data.calories || 0
      })
      const result: DayData[] = Object.keys(dailyTotals)
        .sort()
        .map((dayKey) => ({ date: dayKey, value: dailyTotals[dayKey] }))
      return result
    } else if (range === "6months") {
      // Group by day (you can later aggregate per week if desired)
      const dailyTotals: { [key: string]: number } = {}
      mealsSnap.forEach((doc) => {
        const data = doc.data()
        const mealDate = data.timestamp.toDate()
        const dayKey = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate()).toISOString()
        if (!dailyTotals[dayKey]) {
          dailyTotals[dayKey] = 0
        }
        dailyTotals[dayKey] += data.calories || 0
      })
      const result: DayData[] = Object.keys(dailyTotals)
        .sort()
        .map((dayKey) => ({ date: dayKey, value: dailyTotals[dayKey] }))
      return result
    } else if (range === "year") {
      // Group by month (aggregated)
      const monthlyTotals: { [key: string]: number } = {}
      const monthlyCounts: { [key: string]: number } = {}

      mealsSnap.forEach((doc) => {
        const data = doc.data()
        const mealDate = data.timestamp.toDate()
        const monthKey = `${mealDate.getFullYear()}-${mealDate.getMonth()}`

        if (!monthlyTotals[monthKey]) {
          monthlyTotals[monthKey] = 0
          monthlyCounts[monthKey] = 0
        }

        if (data.calories > 0) {
          monthlyTotals[monthKey] += data.calories || 0
          monthlyCounts[monthKey]++
        }
      })

      const result: DayData[] = Object.keys(monthlyTotals)
        .sort()
        .map((monthKey) => {
          const [year, month] = monthKey.split("-").map(Number)
          const average = monthlyCounts[monthKey] > 0 ? monthlyTotals[monthKey] / monthlyCounts[monthKey] : 0

          return {
            date: new Date(year, month, 1).toISOString(),
            value: Math.round(average),
          }
        })
      return result
    }
    return []
  }

  const fetchDataForDay = async (date: Date): Promise<DayData[]> => {
    if (!auth.currentUser) return []
    const userId = auth.currentUser.uid
    const mealsRef = collection(db, "users", userId, "meals")

    // Set start and end of the selected day
    const startDate = new Date(date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(date)
    endDate.setHours(23, 59, 59, 999)

    const mealsQuery = query(
      mealsRef,
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      where("timestamp", "<=", Timestamp.fromDate(endDate)),
      orderBy("timestamp", "asc"),
    )

    const mealsSnap = await getDocs(mealsQuery)

    // Group by hour (0-23)
    const hourlyTotals = new Array(24).fill(0)
    mealsSnap.forEach((doc) => {
      const data = doc.data()
      const mealDate = data.timestamp.toDate()
      const hour = mealDate.getHours()
      hourlyTotals[hour] += data.calories || 0
    })

    const dayData: DayData[] = []
    for (let hour = 0; hour < 24; hour++) {
      const hourDate = new Date(startDate)
      hourDate.setHours(hour)
      dayData.push({ date: hourDate.toISOString(), value: hourlyTotals[hour] })
    }

    return dayData
  }

  // Fetch data for all ranges on mount if no external data is provided.
  // Update the fetchAllRanges function to use the new fetchDataForRange signature
  const fetchAllRanges = async () => {
    setLoading(true)
    try {
      const rangesArray: TimeRange[] = ["day", "week", "month", "6months", "year"]
      const result: { [range in TimeRange]?: DayData[] } = {}
      for (const range of rangesArray) {
        result[range] = await fetchDataForRange(range, currentDate)
      }
      setInternalDataByRange(result)

      // Mark all ranges as fetched for the current date
      const fetchedKey = currentDate.toISOString().split("T")[0]
      const newFetchedData: { [key: string]: boolean } = {}
      rangesArray.forEach((range) => {
        newFetchedData[`${range}-${fetchedKey}`] = true
      })
      setFetchedData((prev) => ({ ...prev, ...newFetchedData }))
    } catch (error) {
      console.error("Error fetching chart data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Update the useEffect that calls fetchAllRanges
  useEffect(() => {
    if (!dataByRange) {
      fetchAllRanges()
    }
  }, [dataByRange])

  // Add a new useEffect to fetch data when the range changes
  useEffect(() => {
    // Only fetch if we're using internal data (not external dataByRange)
    if (!dataByRange) {
      const fetchedKey = `${selectedRange}-${currentDate.toISOString().split("T")[0]}`

      // Check if we've already fetched this data
      if (!fetchedData[fetchedKey]) {
        // Fetch data for the selected range and current date
        const fetchRangeData = async () => {
          setLoading(true)
          try {
            let rangeData: DayData[]

            if (selectedRange === "day") {
              rangeData = await fetchDataForDay(currentDate)
            } else {
              rangeData = await fetchDataForRange(selectedRange, currentDate)
            }

            // Update the internal data with the new range data
            setInternalDataByRange((prevData) => ({
              ...prevData,
              [selectedRange]: rangeData,
            }))

            // Mark this range and date as fetched
            setFetchedData((prev) => ({
              ...prev,
              [fetchedKey]: true,
            }))
          } catch (error) {
            console.error(`Error fetching ${selectedRange} data:`, error)
          } finally {
            setLoading(false)
          }
        }

        fetchRangeData()
      }
    }
  }, [selectedRange, currentDate, dataByRange, fetchedData])

  // Update filtered data when the selected range changes.
  useEffect(() => {
    const d = effectiveDataByRange[selectedRange] || []
    setFilteredData(d)

    // Process data to ensure all days/months are represented
    // For day view, use the currentDate instead of now
    if (selectedRange === "day") {
      const startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0)

      const hourlyData: DayData[] = []
      const existingData: { [hour: number]: number } = {}

      // Map existing data to hours
      d.forEach((item) => {
        const date = new Date(item.date)
        const hour = date.getHours()
        existingData[hour] = item.value
      })

      // Create array with all hours
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(startDate)
        hourDate.setHours(hour)
        hourlyData.push({
          date: hourDate.toISOString(),
          value: existingData[hour] || 0,
        })
      }

      setProcessedData(hourlyData)
    } else if (selectedRange === "week") {
      // For week view, use currentDate instead of now
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0)

      const dailyData: DayData[] = []
      const existingData: { [day: string]: number } = {}

      // Map existing data to days
      d.forEach((item) => {
        const date = new Date(item.date)
        const dayKey = date.toISOString().split("T")[0]
        existingData[dayKey] = item.value
      })

      // Create array with all days of the week
      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        const dayKey = day.toISOString().split("T")[0]
        dailyData.push({
          date: day.toISOString(),
          value: existingData[dayKey] || 0,
        })
      }

      setProcessedData(dailyData)
    } else if (selectedRange === "month") {
      // For month view, use currentDate instead of now
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()

      const monthData: DayData[] = []
      const existingData: { [day: string]: number } = {}

      // Map existing data to days
      d.forEach((item) => {
        const date = new Date(item.date)
        const dayKey = date.toISOString().split("T")[0]
        existingData[dayKey] = item.value
      })

      // Create array with all days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day)
        const dayKey = date.toISOString().split("T")[0]
        monthData.push({
          date: date.toISOString(),
          value: existingData[dayKey] || 0,
        })
      }

      setProcessedData(monthData)
    } else if (selectedRange === "year") {
      // For year view, use currentDate instead of now
      const year = currentDate.getFullYear()

      const yearData: DayData[] = []
      const monthTotals: { [month: number]: number } = {}
      const monthCounts: { [month: number]: number } = {}

      // Map existing data to months
      d.forEach((item) => {
        const date = new Date(item.date)
        const month = date.getMonth()

        if (!monthTotals[month]) {
          monthTotals[month] = 0
          monthCounts[month] = 0
        }

        if (item.value > 0) {
          monthTotals[month] += item.value
          monthCounts[month]++
        }
      })

      // Create array with all months of the year, using averages
      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1)
        const average = monthCounts[month] > 0 ? monthTotals[month] / monthCounts[month] : 0

        yearData.push({
          date: date.toISOString(),
          value: Math.round(average),
        })
      }

      setProcessedData(yearData)
    } else if (selectedRange === "6months") {
      // For 6 months view, use currentDate and go back 6 months
      const endDate = new Date(currentDate)
      const startDate = new Date(currentDate)
      startDate.setMonth(startDate.getMonth() - 5) // Start 5 months before current month

      // Create array with all months in the 6-month period
      const sixMonthData: DayData[] = []
      const existingData: { [monthKey: string]: { total: number; count: number } } = {}

      // Map existing data to months
      d.forEach((item) => {
        const date = new Date(item.date)
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`

        if (!existingData[monthKey]) {
          existingData[monthKey] = { total: 0, count: 0 }
        }

        if (item.value > 0) {
          existingData[monthKey].total += item.value
          existingData[monthKey].count++
        }
      })

      // Create array with all months in the 6-month period
      for (let i = 0; i < 6; i++) {
        const date = new Date(startDate)
        date.setMonth(startDate.getMonth() + i)

        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        const average =
          existingData[monthKey]?.count > 0 ? existingData[monthKey].total / existingData[monthKey].count : 0

        sixMonthData.push({
          date: date.toISOString(),
          value: Math.round(average),
        })
      }

      setProcessedData(sixMonthData)
    } else {
      // For any other range, just use the filtered data
      setProcessedData(d)
    }
  }, [effectiveDataByRange, selectedRange, currentDate])

  // Add this useEffect after the existing useEffect that processes the data
  useEffect(() => {
    // Only scroll if we have data and haven't done the initial scroll for this range
    if (processedData.length > 0 && chartScrollRef.current && !initialScrollDoneRef.current[selectedRange]) {
      const now = new Date()
      let scrollIndex = 0

      // Find the index to scroll to based on the current time and selected range
      if (selectedRange === "day") {
        // For day view, scroll to current hour
        scrollIndex = now.getHours()
      } else if (selectedRange === "week") {
        // For week view, scroll to current day of week
        scrollIndex = now.getDay()
      } else if (selectedRange === "month") {
        // For month view, scroll to current day of month (minus 1 for zero-based index)
        scrollIndex = now.getDate() - 1
      } else if (selectedRange === "year" || selectedRange === "6months") {
        // For year and 6months view, scroll to current month
        scrollIndex = now.getMonth()
      }

      // Calculate scroll position (center the current bar)
      const scrollX = Math.max(
        0,
        scrollIndex * (BAR_WIDTH + BAR_MARGIN) - (width - 80 - Y_AXIS_WIDTH) / 2 + BAR_WIDTH / 2,
      )

      // Use setTimeout to ensure the scroll happens after render
      setTimeout(() => {
        if (chartScrollRef.current) {
          chartScrollRef.current.scrollTo({ x: scrollX, animated: true })
          // Mark this range as having been initially scrolled
          initialScrollDoneRef.current[selectedRange] = true
        }
      }, 100)
    }
  }, [processedData, selectedRange, width])

  // --- Range Header and Navigation Functions ---
  // Update the getRangeTitle function to use the currentDate for all ranges
  const getRangeTitle = (): string => {
    if (!processedData || processedData.length === 0) return ""

    // For all views, use the currentDate to determine the range
    if (selectedRange === "day") {
      return currentDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    } else if (selectedRange === "week") {
      // Get start and end of week
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Start of week (Sunday)

      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // End of week (Saturday)

      return `${startOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
    } else if (selectedRange === "month") {
      return currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    } else if (selectedRange === "6months") {
      const startDate = new Date(currentDate)
      startDate.setMonth(currentDate.getMonth() - 5) // Start 5 months before current month

      return `${startDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })} - ${currentDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
    } else if (selectedRange === "year") {
      return `${currentDate.getFullYear()}`
    }

    return ""
  }

  // Rename the navigateDay function to navigateTimeRange and update it to handle all time ranges
  const navigateTimeRange = async (direction: "prev" | "next") => {
    const newDate = new Date(currentDate)

    // Don't allow navigating to future dates
    if (direction === "next") {
      const futureLimit = new Date()

      // Check if we're already at the limit based on the selected range
      if (
        selectedRange === "day" &&
        newDate.getFullYear() === futureLimit.getFullYear() &&
        newDate.getMonth() === futureLimit.getMonth() &&
        newDate.getDate() === futureLimit.getDate()
      ) {
        return
      } else if (selectedRange === "week" && newDate.getTime() + 7 * 24 * 60 * 60 * 1000 > futureLimit.getTime()) {
        return
      } else if (
        selectedRange === "month" &&
        newDate.getMonth() === futureLimit.getMonth() &&
        newDate.getFullYear() === futureLimit.getFullYear()
      ) {
        return
      } else if (selectedRange === "year" && newDate.getFullYear() === futureLimit.getFullYear()) {
        return
      }
    }

    // Update the date based on the selected range and direction
    switch (selectedRange) {
      case "day":
        if (direction === "prev") {
          newDate.setDate(newDate.getDate() - 1)
        } else if (direction === "next") {
          newDate.setDate(newDate.getDate() + 1)
        }
        break
      case "week":
        if (direction === "prev") {
          newDate.setDate(newDate.getDate() - 7)
        } else if (direction === "next") {
          newDate.setDate(newDate.getDate() + 7)
        }
        break
      case "month":
        if (direction === "prev") {
          newDate.setMonth(newDate.getMonth() - 1)
        } else if (direction === "next") {
          newDate.setMonth(newDate.getMonth() + 1)
        }
        break
      case "6months":
        if (direction === "prev") {
          newDate.setMonth(newDate.getMonth() - 6)
        } else if (direction === "next") {
          newDate.setMonth(newDate.getMonth() + 6)
        }
        break
      case "year":
        if (direction === "prev") {
          newDate.setFullYear(newDate.getFullYear() - 1)
        } else if (direction === "next") {
          newDate.setFullYear(newDate.getFullYear() + 1)
        }
        break
    }

    setCurrentDate(newDate)

    // The useEffect will handle fetching the data when currentDate changes
  }

  const changeRange = (range: TimeRange) => {
    if (range === selectedRange) return
    setSelectedRange(range)

    // Reset the initial scroll flag for the new range if it hasn't been scrolled yet
    if (!initialScrollDoneRef.current[range]) {
      // We don't need to do anything here, the useEffect will handle the scrolling
    } else {
      // If we've already scrolled this range before, just scroll to the beginning
      if (chartScrollRef.current) {
        chartScrollRef.current.scrollTo({ x: 0, animated: true })
      }
    }

    // The useEffect will handle fetching the data when selectedRange changes
  }

  // Handle bar press to show the simple modal
  const handleBarPress = (data: DayData) => {
    if (data.value > 0) {
      setSelectedBarData(data)
      setModalVisible(true)
    }
  }

  // Format the time based on the selected range
  const formatTime = (date: string): string => {
    const dateObj = new Date(date)

    if (selectedRange === "day") {
      return dateObj.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    } else if (selectedRange === "year") {
      return dateObj.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    } else {
      return dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    }
  }

  // Calculate the maximum value for proper bar scaling
  const nonZeroValues = processedData.filter((item) => item.value > 0).map((item) => item.value)
  const maxDataValue = Math.max(...nonZeroValues, 1) // Use 1 as minimum to avoid division by zero

  // Generate Y-axis labels
  const generateYAxisLabels = () => {
    const labels = []
    const step = Math.ceil(maxDataValue / 3) // Use 3 steps instead of 4 for better spacing

    for (let i = 0; i <= 3; i++) {
      // Change to 3 labels total
      labels.push(step * i)
    }

    return labels.reverse()
  }

  const yAxisLabels = generateYAxisLabels()

  // --- Render the Component UI ---
  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: backgroundColor || (fullWidth ? "transparent" : "#ffffff") },
        ]}
      >
        <ActivityIndicator size="large" color="#0c4a6e" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: backgroundColor || (fullWidth ? "transparent" : "#ffffff") },
        fullWidth ? styles.fullWidthContainer : styles.cardContainer,
      ]}
    >
      {/* Header with Title and Range Info */}
      <View style={styles.header}>
        <Text style={[styles.title, styles.darkText]}>{title}</Text>
        <View style={styles.dayNavigation}>
          <TouchableOpacity
            style={styles.dayNavButton}
            onPress={(e) => {
              // Prevent default scroll behavior
              if (e && e.preventDefault) e.preventDefault()
              navigateTimeRange("prev")
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#475569" />
          </TouchableOpacity>
          <Text style={[styles.rangeTitle, styles.darkText]}>{getRangeTitle()}</Text>
          <TouchableOpacity
            style={[
              styles.dayNavButton,
              // Disable next button if we're at the current date/period
              (selectedRange === "day" &&
                new Date(currentDate).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0)) ||
              (selectedRange === "week" && currentDate.getTime() + 7 * 24 * 60 * 60 * 1000 > new Date().getTime()) ||
              (selectedRange === "month" &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()) ||
              (selectedRange === "6months" &&
                currentDate.getMonth() + 6 >
                  new Date().getMonth() + 12 * (currentDate.getFullYear() - new Date().getFullYear())) ||
              (selectedRange === "year" && currentDate.getFullYear() >= new Date().getFullYear())
                ? styles.dayNavButtonDisabled
                : null,
            ]}
            onPress={(e) => {
              // Prevent default scroll behavior
              if (e && e.preventDefault) e.preventDefault()
              navigateTimeRange("next")
            }}
            disabled={
              (selectedRange === "day" &&
                new Date(currentDate).setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0)) ||
              (selectedRange === "week" && currentDate.getTime() + 7 * 24 * 60 * 60 * 1000 > new Date().getTime()) ||
              (selectedRange === "month" &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear()) ||
              (selectedRange === "6months" &&
                currentDate.getMonth() + 6 >
                  new Date().getMonth() + 12 * (currentDate.getFullYear() - new Date().getFullYear())) ||
              (selectedRange === "year" && currentDate.getFullYear() >= new Date().getFullYear())
            }
          >
            <Ionicons name="chevron-forward" size={24} color="#475569" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Range Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rangeSelector}
        ref={scrollRef}
      >
        {ranges.map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              selectedRange === range && (fullWidth ? styles.rangeButtonActiveFullWidth : styles.rangeButtonActive),
              fullWidth && styles.rangeButtonFullWidth,
            ]}
            onPress={() => changeRange(range)}
          >
            <Text style={[styles.rangeButtonText, selectedRange === range && styles.rangeButtonTextActive]}>
              {rangeLabels[range]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Chart Container with Y-axis */}
      <View style={styles.chartOuterContainer}>
        {/* Y-axis */}
        <View style={styles.yAxisContainer}>
          {yAxisLabels.map((label, index) => (
            <View key={index} style={styles.yAxisLabelContainer}>
              <Text style={styles.yAxisValue}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          {/* Grid lines */}
          {yAxisLabels.map((label, index) => (
            <View
              key={index}
              style={[
                styles.gridLine,
                {
                  top:
                    (index * (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM - X_AXIS_HEIGHT)) /
                      (yAxisLabels.length - 1) +
                    CHART_PADDING_TOP,
                },
              ]}
            />
          ))}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.chartScrollContent,
              { width: Math.max(width - 80 - Y_AXIS_WIDTH, processedData.length * (BAR_WIDTH + BAR_MARGIN)) },
            ]}
            scrollEventThrottle={16}
            ref={chartScrollRef}
          >
            {processedData.map((item, index) => {
              // Determine bar color based on value
              const barColor = belowTargetColor

              return (
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
                            (item.value / maxDataValue) *
                              (CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM - X_AXIS_HEIGHT),
                          ),
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  )}
                  <Text style={styles.barLabel}>
                    {selectedRange === "day"
                      ? `${new Date(item.date).getHours()}:00` // Format hour for day view
                      : selectedRange === "year"
                        ? new Date(item.date).toLocaleDateString(undefined, { month: "short" })
                        : new Date(item.date).getDate()}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>
      </View>
      {/* Average display */}
      <View style={styles.averageContainer}>
        <Text style={[styles.averageLabel, styles.darkText]}>Average:</Text>
        <Text style={[styles.averageValue, { color: "#0c4a6e" }]}>
          {Math.round(processedData.reduce((acc, cur) => acc + cur.value, 0) / (processedData.length || 1))}{" "}
          {valueLabel}
        </Text>
      </View>
      {/* Simple Modal for showing calories and time */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                {selectedBarData && (
                  <>
                    <Text style={styles.modalTitle}>Calories</Text>
                    <Text style={styles.modalValue}>
                      {selectedBarData.value} {valueLabel}
                    </Text>
                    <Text style={styles.modalTime}>{formatTime(selectedBarData.date)}</Text>
                    <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
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
  cardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  fullWidthContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  loadingContainer: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
    color: "#0c4a6e",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  darkText: {
    color: "#0f172a",
  },
  lightText: {
    color: "#ffffff",
  },
  rangeTitle: {
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.9,
  },
  dayNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayNavButton: {
    padding: 8,
    borderRadius: 12,
  },
  dayNavButtonDisabled: {
    opacity: 0.4,
  },
  rangeSelector: {
    flexDirection: "row",
    paddingVertical: 8,
    marginBottom: 20,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rangeButtonFullWidth: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(8px)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  rangeButtonActive: {
    backgroundColor: "#0c4a6e",
    shadowColor: "#0c4a6e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  rangeButtonActiveFullWidth: {
    backgroundColor: "#0c4a6e",
    backdropFilter: "blur(8px)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
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
    height: CHART_HEIGHT, // Keep full height
    gap: 50,
    alignItems: "flex-end",
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
    backgroundColor: "rgba(255, 255, 255, 0.5)", // Add slight background for better readability
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
  chartScrollContent: {
    height: CHART_HEIGHT - X_AXIS_HEIGHT - 16, // Subtract additional 16px
    minWidth: width - 80 - Y_AXIS_WIDTH,
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
  averageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignSelf: "center",
  },
  averageLabel: {
    fontSize: 16,
    marginRight: 6,
    fontWeight: "500",
    color: "#334155",
  },
  averageValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0c4a6e",
  },
  // Modal styles
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
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0c4a6e",
    marginBottom: 8,
  },
  modalTime: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 14,
  },
})

export default TimeRangeBarChart
