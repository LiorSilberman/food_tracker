"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { View, Text, StyleSheet, PanResponder, Animated, type ViewStyle, type TextStyle } from "react-native"

interface SwipeNumberPickerProps {
  min: number
  max: number
  step?: number
  initialValue: number
  onChange: (value: number) => void
  height?: number
  itemHeight?: number
  visibleItems?: number
  style?: ViewStyle
  textStyle?: TextStyle
  selectedTextStyle?: TextStyle
  showGuideLines?: boolean
  decimalPlaces?: number
  suffix?: string
}

const SwipeNumberPicker: React.FC<SwipeNumberPickerProps> = ({
  min,
  max,
  step = 1,
  initialValue,
  onChange,
  height = 200,
  itemHeight = 50,
  visibleItems = 5,
  style,
  textStyle,
  selectedTextStyle,
  showGuideLines = true,
  decimalPlaces = 0,
  suffix = "",
}) => {
  const [value, setValue] = useState(initialValue)
  const scrollY = useRef(new Animated.Value(0)).current
  const lastOffsetY = useRef(0)
  const isDragging = useRef(false)
  const isInitialized = useRef(false)

  // Generate all possible values based on min, max, and step
  const values: number[] = []
  for (let i = min; i <= max; i += step) {
    values.push(i)
  }

  // Find the index of the current value
  const currentIndex = values.findIndex((v) => v === value)

  useEffect(() => {
    // Initialize the scroll position to show the initial value
    if (!isInitialized.current) {
      const initialIndex = values.findIndex((v) => v === initialValue)
      if (initialIndex !== -1) {
        const initialOffset = -initialIndex * itemHeight + (height - itemHeight) / 2
        scrollY.setValue(initialOffset)
        lastOffsetY.current = initialOffset
        isInitialized.current = true
      }
    }
  }, [initialValue, values, itemHeight, height, scrollY])

  // Update value when initialValue changes from parent
  useEffect(() => {
    if (initialValue !== value) {
      setValue(initialValue)

      // Update the scroll position to match the new value
      const newIndex = values.findIndex((v) => v === initialValue)
      if (newIndex !== -1) {
        const newOffset = -newIndex * itemHeight + (height - itemHeight) / 2
        Animated.spring(scrollY, {
          toValue: newOffset - lastOffsetY.current,
          velocity: 10,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }).start(() => {
          lastOffsetY.current = newOffset
          scrollY.setOffset(lastOffsetY.current)
          scrollY.setValue(0)
        })
      }
    }
  }, [initialValue])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scrollY.setOffset(lastOffsetY.current)
        scrollY.setValue(0)
        isDragging.current = true
      },
      onPanResponderMove: (_, gestureState) => {
        scrollY.setValue(gestureState.dy)
      },
      onPanResponderRelease: (_, gestureState) => {
        isDragging.current = false
        lastOffsetY.current += gestureState.dy

        // Calculate the closest value
        const rawIndex = Math.round((-lastOffsetY.current - (height - itemHeight) / 2) / -itemHeight)
        const clampedIndex = Math.max(0, Math.min(values.length - 1, rawIndex))
        const newValue = values[clampedIndex]

        // Animate to the closest value
        const targetY = -clampedIndex * itemHeight + (height - itemHeight) / 2
        Animated.spring(scrollY, {
          toValue: targetY - lastOffsetY.current,
          velocity: 10,
          tension: 70,
          friction: 8,
          useNativeDriver: true,
        }).start(() => {
          lastOffsetY.current = targetY
          scrollY.setOffset(lastOffsetY.current)
          scrollY.setValue(0)

          // Only update if the value actually changed
          if (newValue !== value) {
            setValue(newValue)
            onChange(newValue)
          }
        })
      },
    }),
  ).current

  const renderItem = (itemValue: number, index: number) => {
    const inputRange = [
      -index * itemHeight + (height - itemHeight) / 2 - itemHeight * 2,
      -index * itemHeight + (height - itemHeight) / 2,
      -index * itemHeight + (height - itemHeight) / 2 + itemHeight * 2,
    ]

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: "clamp",
    })

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: "clamp",
    })

    const translateY = scrollY.interpolate({
      inputRange: [-itemHeight * values.length, 0, itemHeight * values.length],
      outputRange: [-itemHeight * values.length, 0, itemHeight * values.length],
      extrapolate: "clamp",
    })

    const formattedValue = decimalPlaces > 0 ? itemValue.toFixed(decimalPlaces) : itemValue.toString()

    // Calculate if this item is currently selected based on scroll position
    const isSelected = Math.abs((-lastOffsetY.current - (height - itemHeight) / 2) / itemHeight - index) < 0.5

    return (
      <Animated.View
        key={index}
        style={[
          styles.item,
          {
            height: itemHeight,
            transform: [{ translateY }, { scale }],
            opacity,
            top: index * itemHeight,
          },
        ]}
      >
        <Text style={[styles.itemText, textStyle, isSelected && [styles.selectedItemText, selectedTextStyle]]}>
          {formattedValue}
          {suffix}
        </Text>
      </Animated.View>
    )
  }

  return (
    <View
      style={[
        styles.container,
        {
          height,
        },
        style,
      ]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.itemsContainer, { height }]}>{values.map((val, index) => renderItem(val, index))}</View>

      {showGuideLines && (
        <>
          <View
            style={[
              styles.selectionIndicator,
              {
                top: height / 2 - itemHeight / 2,
                height: itemHeight,
              },
            ]}
          />
          <View
            style={[
              styles.centerLine,
              {
                top: height / 2,
              },
            ]}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    width: "100%",
    position: "relative",
  },
  itemsContainer: {
    position: "relative",
  },
  item: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 20,
    color: "#666",
  },
  selectedItemText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0ea5e9",
  },
  selectionIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(14, 165, 233, 0.1)",
    borderRadius: 8,
  },
  centerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(14, 165, 233, 0.3)",
  },
})

export default SwipeNumberPicker
