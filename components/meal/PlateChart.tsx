import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { ImageBackground } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  carbs: number;
  protein: number;
  fat: number;
  totalCalories: number;
};

export default function PlateChart({ carbs, protein, fat, totalCalories }: Props) {
  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const calorieScale = useSharedValue(0.5);
  
  const data = [
    { value: carbs, color: '#32cbc6', gradientCenterColor: '#4aebe6' },
    { value: protein, color: '#e95899', gradientCenterColor: '#ff6eb0' },
    { value: fat, color: '#fc9e7f', gradientCenterColor: '#ffb799' },
  ];

  const labels = [ 
    { text: 'פחמימות', color: '#32cbc6', value: carbs, unit: 'g' },
    { text: 'חלבונים', color: '#e95899', value: protein, unit: 'g' },
    { text: 'שומנים', color: '#fc9e7f', value: fat, unit: 'g' }
  ];

  // Calculate percentages for display
  const total = carbs + protein + fat;
  const percentages = labels.map(item => ({
    ...item,
    percent: Math.round((item.value / total) * 100)
  }));

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value }
      ],
      opacity: opacity.value
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: labelOpacity.value,
      transform: [{ translateY: interpolate(
        labelOpacity.value,
        [0, 1],
        [20, 0]
      ) }]
    };
  });

  const calorieAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: calorieScale.value }],
      opacity: interpolate(
        calorieScale.value,
        [0.5, 1],
        [0, 1]
      )
    };
  });

  // Start animations when component mounts
  useEffect(() => {
    // Sequence of animations
    rotation.value = withSequence(
      withTiming(-15, { duration: 400 }),
      withTiming(360, { duration: 1200, easing: Easing.out(Easing.cubic) })
    );
    
    scale.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1.05, { duration: 300 }),
      withTiming(1, { duration: 200 })
    );
    
    opacity.value = withTiming(1, { duration: 800 });
    
    // Delay label animations
    labelOpacity.value = withDelay(800, withTiming(1, { duration: 500 }));
    
    // Calorie counter animation
    calorieScale.value = withDelay(600, withSpring(1, { damping: 12 }));
  }, []);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.labelContainer, labelAnimatedStyle]}>
        {percentages.map((item, index) => (
          <View key={index} style={styles.labelItem}>
            <LinearGradient
              colors={[item.color, lightenColor(item.color, 20)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.labelGradient}
            >
              <Text style={styles.percentText}>{item.percent}%</Text>
            </LinearGradient>
            <View style={styles.labelTextContainer}>
              <Text style={styles.labelText}>{item.text}</Text>
              <Text style={styles.valueText}>{item.value}{item.unit}</Text>
            </View>
          </View>
        ))}
      </Animated.View>
      
      <ImageBackground
        source={require('../../assets/images/plate2.png')}
        style={styles.plate}
        imageStyle={styles.plateImage}
      >
        <Animated.View style={[styles.pieWrapper, animatedStyle]}>
          <PieChart
            data={data}
            donut
            radius={110}
            innerRadius={70}
            showGradient
            // gradientCenterOffset={0.5}
            sectionAutoFocus
            focusOnPress
            strokeWidth={1}
            strokeColor="#fff"
            centerLabelComponent={() => (
              <Animated.View style={[styles.centerLabel, calorieAnimatedStyle]}>
                <Text style={styles.calorieValue}>{totalCalories}</Text>
                <Text style={styles.calorieLabel}>קלוריות</Text>
              </Animated.View>
            )}
          />
        </Animated.View>
        
        <View style={styles.plateOverlay} />
      </ImageBackground>
      
      <Animated.View style={[styles.nutritionSummary, labelAnimatedStyle]}>
        <Text style={styles.summaryText}>
          ארוחה זו מכילה {protein}g חלבון, {carbs}g פחמימות, ו-{fat}g שומן
        </Text>
      </Animated.View>
    </View>
  );
}

// Helper function to lighten a color
function lightenColor(color: string, percent: number): string {
  // Convert hex to RGB
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);

  // Lighten
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
  },
  plate: {
    width: 320,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  plateImage: {
    resizeMode: 'contain',
  },
  plateOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 35,
    width: 70,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calorieValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#31333d',
  },
  calorieLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#31333d',
  },
  labelContainer: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    marginBottom: 5,
    paddingHorizontal: 10,
  },
  labelItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  percentText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  labelTextContainer: {
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#31333d',
  },
  valueText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  nutritionSummary: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryText: {
    fontSize: 14,
    color: '#31333d',
    textAlign: 'center',
    fontWeight: '500',
  },
});