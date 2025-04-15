import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable';

const screenWidth = Dimensions.get('window').width;

type Props = {
  result: {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
  };
};

export default function NutritionInfoCard({ result }: Props) {
  return (
    <Animatable.View animation="fadeInUp" delay={700} style={styles.resultCard}>
      <View style={styles.iconTitleRow}>
        <FontAwesome5 name="chart-pie" size={20} color="#252834" />
        <Text style={styles.cardTitle}>מידע תזונתי </Text>
      </View>

      <PieChart
        data={[
          {
            name: 'פחמימות',
            population: result.carbs_g,
            color: '#32cbc6',
            legendFontColor: '#444',
            legendFontSize: 14,
          },
          {
            name: 'חלבון',
            population: result.protein_g,
            color: '#e95899',
            legendFontColor: '#444',
            legendFontSize: 14,
          },
          {
            name: 'שומנים',
            population: result.fat_g,
            color: '#fc9e7f',
            legendFontColor: '#444',
            legendFontSize: 14,
          },
        ]}
        width={screenWidth - 48}
        height={220}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: () => '#000',
          labelColor: () => '#000',
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />

      <Text style={styles.totalCaloriesText}>סה"כ {result.calories} קלוריות</Text>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  resultCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    marginTop: 30,
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
    color: '#252834',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginStart: 8,
  },
  totalCaloriesText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    color: '#333',
  },
});
