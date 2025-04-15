import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

interface Props {
  dailyCalories: number;
  consumedCalories: number;
}

export default function DailyProgressCircleCard({ dailyCalories, consumedCalories }: Props) {
  const fill = dailyCalories > 0 ? (consumedCalories / dailyCalories) * 100 : 0;
  const remaining = dailyCalories - consumedCalories;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>התקדמות יומית</Text>
      <AnimatedCircularProgress
        size={200}
        width={15}
        fill={fill > 100 ? 100 : fill}
        tintColor="#4CAF50"
        backgroundColor="#E0E0E0"
        rotation={0}
        lineCap="round"
      >
        {() => (
          <View style={styles.centerContent}>
            <Text style={styles.centerText}>{Math.min(consumedCalories, dailyCalories)}</Text>
            <Text style={styles.unitText}>/ {dailyCalories} קלוריות</Text>
          </View>
        )}
      </AnimatedCircularProgress>
      <Text style={styles.remainingText}>נשארו {remaining > 0 ? remaining : 0} קלוריות להיום</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#ffffffee',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    width: Dimensions.get('window').width - 48,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
  },
  centerContent: {
    alignItems: 'center',
  },
  centerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4CAF50',
  },
  unitText: {
    fontSize: 14,
    color: '#555',
  },
  remainingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#666',
  },
});
