import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  remainingCalories: number;
};

export default function RemainCalCard({ remainingCalories }: Props) {
  return (
    <View style={styles.remainCard}>
      <Text style={styles.remainTitle}>🍏 נשאר לך היום:</Text>
      <Text style={styles.remainText}>{remainingCalories} קלוריות</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  remainCard: {
    marginTop: 20,
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  remainTitle: {
    fontSize: 18,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 6,
  },
  remainText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B5E20',
  },
});
