import React from "react"
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, TextInput } from "react-native"
import Animated from "react-native-reanimated"
import { Ionicons } from "@expo/vector-icons"
import PlateChart from "../meal/PlateChart"
import type { MealData } from "@/types/mealTypes"

export type NutritionCardProps = {
  productName: string
  brand?: string
  imageUrl?: string
  mealData: MealData
  editMode: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onPortionChange: (size: string, unit: string) => void
  onRecalculate: () => void
  onSave: () => void
}

export default function NutritionCard({
  productName,
  brand,
  imageUrl,
  mealData,
  editMode,
  onEdit,
  onCancelEdit,
  onPortionChange,
  onRecalculate,
  onSave,
}: NutritionCardProps) {
  // Use safe defaults for optional portion fields
  const portionSizeStr = mealData.portion_size?.toString() ?? ""
  const portionUnitSafe = mealData.portion_unit ?? "גרם"

  return (
    <Animated.View style={styles.card}>
      <ScrollView nestedScrollEnabled>
        <Text style={styles.title}>{productName}</Text>
        {brand && <Text style={styles.brand}>{brand}</Text>}
        {imageUrl && <Image source={{ uri: imageUrl }} style={styles.image} />}

        <View style={styles.headerRow}>
          <Text style={styles.headerText}>
            {editMode ? "עריכת ערכים תזונתיים:" : "ערכים תזונתיים:"}
          </Text>
          {editMode ? (
            <TouchableOpacity onPress={onCancelEdit} style={styles.cancelBtn}>
              <Ionicons name="close" size={16} color="#64748b" />
              <Text style={styles.cancelText}>ביטול</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={styles.editText}>ערוך</Text>
            </TouchableOpacity>
          )}
        </View>

        {!editMode ? (
          <>
            <View style={styles.caloriesBadge}>
              <Text style={styles.caloriesValue}>{mealData.calories}</Text>
              <Text style={styles.caloriesLabel}>קלוריות</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Ionicons name="fitness" size={18} color="#fff" />
                <Text style={styles.macroValue}>{mealData.protein_g}g</Text>
                <Text style={styles.macroLabel}>חלבון</Text>
              </View>
              <View style={styles.macroItem}>
                <Ionicons name="leaf" size={18} color="#fff" />
                <Text style={styles.macroValue}>{mealData.carbs_g}g</Text>
                <Text style={styles.macroLabel}>פחמימות</Text>
              </View>
              <View style={styles.macroItem}>
                <Ionicons name="water" size={18} color="#fff" />
                <Text style={styles.macroValue}>{mealData.fat_g}g</Text>
                <Text style={styles.macroLabel}>שומן</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <PlateChart
                carbs={mealData.carbs_g}
                protein={mealData.protein_g}
                fat={mealData.fat_g}
                totalCalories={mealData.calories}
              />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
              <Text style={styles.saveText}>הוסף ליומן</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.portionRow}>
              <Text style={styles.portionLabel}>גודל מנה:</Text>
              <TextInput
                style={styles.portionInput}
                value={portionSizeStr}
                onChangeText={(size) => onPortionChange(size, portionUnitSafe)}
                keyboardType="numeric"
              />
              <Text style={styles.portionUnit}>{portionUnitSafe}</Text>
            </View>
            <TouchableOpacity style={styles.recalcBtn} onPress={onRecalculate}>
              <Text style={styles.recalcText}>חשב מחדש</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 16, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#333", textAlign: "center" },
  brand: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 12 },
  image: { width: "100%", height: 200, resizeMode: "contain", borderRadius: 8, marginBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  editBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#66bb6a", padding: 6, borderRadius: 6 },
  editText: { color: "#fff", marginLeft: 4 },
  cancelBtn: { flexDirection: "row", alignItems: "center" },
  cancelText: { color: "#64748b", marginLeft: 4 },
  caloriesBadge: { alignItems: "center", marginVertical: 10 },
  caloriesValue: { fontSize: 24, fontWeight: "800", color: "#31333d" },
  caloriesLabel: { fontSize: 14, color: "#31333d" },
  macroRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 10 },
  macroItem: { alignItems: "center", backgroundColor: "rgba(50,203,198,0.85)", padding: 8, borderRadius: 12 },
  macroValue: { fontSize: 16, fontWeight: "700", color: "#fff" },
  macroLabel: { fontSize: 12, color: "#fff" },
  chartContainer: { height: 150, marginVertical: 10 },
  saveBtn: { backgroundColor: "#66bb6a", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 12 },
  saveText: { color: "#fff", fontWeight: "600" },
  portionRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  portionLabel: { fontSize: 14, fontWeight: "600", color: "#0891b2", marginRight: 8 },
  portionInput: { width: 60, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 4, textAlign: "center" },
  portionUnit: { marginLeft: 8, fontSize: 14, color: "#64748b" },
  recalcBtn: { backgroundColor: "#0ea5e9", padding: 10, borderRadius: 8, alignItems: "center" },
  recalcText: { color: "#fff", fontWeight: "600" },
})
