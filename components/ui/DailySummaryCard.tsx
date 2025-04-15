import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Props = {
  calories: number;
  consumed: number;
};

export default function DailySummaryCard({ calories, consumed }: Props) {
  const router = useRouter();
  const remaining = Math.max(calories - consumed, 0);

  return (
    <TouchableOpacity onPress={() => router.push('/daily-summary')} activeOpacity={0.9}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>סיכום יומי</Text>
          <Ionicons name="arrow-forward" size={20} color="#333" />
        </View>
        <Text style={styles.subText}>נשארו לך היום: {remaining} קלוריות</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#F1F8E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  subText: {
    fontSize: 16,
    color: '#444',
  },
});
