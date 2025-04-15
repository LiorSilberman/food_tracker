import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type MacroProps = {
    label: string;
    consumed: number;
    goal: number;
    color: string;
};

export default function MacroNutrientsBar({ label, consumed, goal, color }: MacroProps) {
  const percentage = Math.min((consumed / goal) * 100, 100);
  const displayPercentage = Math.round(percentage);

  return (
      <View style={styles.container}>
          <Text style={styles.label}>{label}</Text>
          
          <View style={styles.macroInfo}>
              <Text style={styles.percentageText}>{displayPercentage}%</Text>
              <Text style={styles.goalText}>{parseFloat(consumed.toFixed(1))}/{goal}g</Text>
          </View>
          
          <View style={styles.barContainer}>
              <View style={styles.barBackground}>
                  <View 
                      style={[
                          styles.barFill, 
                          { width: `${percentage}%`, backgroundColor: color }
                      ]} 
                  />
              </View>
              {percentage > 10 && (
                  <View 
                      style={[
                          styles.barGlow, 
                          { 
                              backgroundColor: color,
                              opacity: 0.3,
                              right: `${100 - percentage}%`
                          }
                      ]} 
                  />
              )}
          </View>
      </View>
  );
}

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         alignItems: 'center',
//       },
//       label: {
//         fontSize: 14,
//         fontWeight: '600',
//         marginBottom: 4,
//       },
//       barBackground: {
//         width: '100%',
//         height: 10,
//         backgroundColor: '#E0E0E0',
//         borderRadius: 6,
//         overflow: 'hidden',
//       },
//       barFill: {
//         height: '100%',
//         borderRadius: 6,
//       },
//       amount: {
//         fontSize: 12,
//         color: '#444',
//         marginTop: 4,
//       },
// });


const styles = StyleSheet.create({
  container: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 4,
      marginVertical: 5,
  },
  label: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 6,
      color: '#31333d',
  },
  barBackground: {
      width: '100%',
      height: 12,
      backgroundColor: '#E0E0E0',
      borderRadius: 8,
      overflow: 'hidden',
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  barFill: {
      height: '100%',
      borderRadius: 8,
  },
  amount: {
      fontSize: 12,
      color: '#444',
      marginTop: 6,
      fontWeight: '600',
  },
  // New styles
  macroInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 4,
  },
  percentageText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#666',
  },
  goalText: {
      fontSize: 12,
      fontWeight: '500',
      color: '#31333d',
  },
  barContainer: {
      width: '100%',
      position: 'relative',
  },
  barGlow: {
      position: 'absolute',
      right: 0,
      top: -1,
      bottom: -1,
      width: 8,
      borderRadius: 4,
  }
});