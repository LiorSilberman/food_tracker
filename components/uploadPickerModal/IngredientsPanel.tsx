import React from "react"
import { View, Text, ScrollView, StyleSheet, TextInput } from "react-native"
import { Ionicons } from "@expo/vector-icons"

export type Ingredient = {
  id: string
  name: string
  amount: number
  unit: string
}

export type IngredientsPanelProps = {
  ingredients: Ingredient[]
  editMode: boolean
  visible: boolean
  onAmountChange: (id: string, amount: number) => void
}

export default function IngredientsPanel({
  ingredients,
  editMode,
  visible,
  onAmountChange,
}: IngredientsPanelProps) {
  if (!visible) return null

  return (
    <View style={styles.container}>
      <ScrollView nestedScrollEnabled contentContainerStyle={styles.listContainer}>
        {ingredients.length > 0 ? (
          ingredients.map((ing) => (
            <View key={ing.id} style={styles.item}>
              <View style={styles.nameContainer}>
                <Ionicons name="nutrition-outline" size={16} color="#66bb6a" />
                <Text style={styles.name}>{ing.name}</Text>
              </View>
              {editMode ? (
                <View style={styles.amountContainer}>
                  <TextInput
                    style={styles.input}
                    value={ing.amount.toString()}
                    keyboardType="numeric"
                    onChangeText={(text) => {
                      const num = parseFloat(text)
                      if (!isNaN(num)) onAmountChange(ing.id, num)
                    }}
                  />
                  <Text style={styles.unit}>{ing.unit}</Text>
                </View>
              ) : (
                <Text style={styles.amountText}>
                  {ing.amount} {ing.unit}
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>לא נמצאו רכיבים</Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    padding: 8,
    maxHeight: 260,
    marginTop: 8,
  },
  listContainer: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nameContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginRight: 8,
    textAlign: 'right',
  },
  amountContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  input: {
    width: 50,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 4,
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
  },
  unit: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
    marginLeft: 8,
  },
  amountText: {
    fontSize: 14,
    color: '#334155',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: 20,
  },
})
