"use client"
import { View, StyleSheet, Pressable, Image } from "react-native"

type SpoonVisualizationProps = {
  fullness: "flat" | "standard" | "heaped"
  unit: string
  color?: string
  onFullnessChange?: (fullness: "flat" | "standard" | "heaped") => void
}

const SpoonVisualization = ({ fullness, unit, color = "#f59e0b", onFullnessChange }: SpoonVisualizationProps) => {
  // Handle fullness selection
  const handleFullnessSelect = (selected: "flat" | "standard" | "heaped") => {
    if (onFullnessChange) {
      onFullnessChange(selected)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.spoonButtonsContainer}>
        {/* Flat Spoon */}
        <Pressable
          style={[styles.spoonButton, fullness === "flat" && styles.selectedSpoonButton]}
          onPress={() => handleFullnessSelect("flat")}
          accessibilityLabel="שטוח"
          accessibilityRole="radio"
          accessibilityState={{ checked: fullness === "flat" }}
        >
          <Image source={require("@/assets/images/flat_spoon1.png")} style={styles.spoonImage} resizeMode="contain" />
        </Pressable>

        {/* Standard Spoon */}
        <Pressable
          style={[styles.spoonButton, fullness === "standard" && styles.selectedSpoonButton]}
          onPress={() => handleFullnessSelect("standard")}
          accessibilityLabel="רגיל"
          accessibilityRole="radio"
          accessibilityState={{ checked: fullness === "standard" }}
        >
          <Image source={require("@/assets/images/standard_spoon1.png")} style={styles.spoonImage} resizeMode="contain" />
        </Pressable>

        {/* Heaped Spoon */}
        <Pressable
          style={[styles.spoonButton, fullness === "heaped" && styles.selectedSpoonButton]}
          onPress={() => handleFullnessSelect("heaped")}
          accessibilityLabel="גדוש"
          accessibilityRole="radio"
          accessibilityState={{ checked: fullness === "heaped" }}
        >
          <Image source={require("@/assets/images/heaped_spoon1.png")} style={styles.spoonImage} resizeMode="contain" />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    // marginVertical: 10,
  },
  spoonButtonsContainer: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    borderRadius: 12,
    padding: 4,
  },
  spoonButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  selectedSpoonButton: {
    backgroundColor: "#0ea5e9",
  },
  spoonImage: {
    width: "100%",
    height: 70,
  },
})

export default SpoonVisualization
