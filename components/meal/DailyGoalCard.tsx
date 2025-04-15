import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DailyGoalCardProps {
  calories: number;
}

export default function DailyGoalCard({ calories }: DailyGoalCardProps) {
  return (
    <Animatable.View animation="fadeInUp" delay={500} style={styles.goalCard}>
      <View style={styles.iconTitleRow}>
        <MaterialCommunityIcons name="target" size={28} color="#43A047" />
        <Text style={styles.cardTitle}>יעד יומי מומלץ</Text>
      </View>
      <Text style={styles.goalText}>{calories} קלוריות ליום</Text>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  goalCard: {
    width: '100%',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  iconTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#43A047',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginStart: 8,
  },
  goalText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#2E7D32',
    writingDirection: 'rtl',
  },
});
