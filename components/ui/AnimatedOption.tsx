import React, { useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  ViewStyle,
  TextStyle
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolateColor,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedOptionProps {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accentColor?: string;
}

const AnimatedOption: React.FC<AnimatedOptionProps> = ({
  label,
  isSelected,
  onSelect,
  icon,
  style,
  textStyle,
  accentColor = '#4FC3F7'
}) => {
  const scale = useSharedValue(1);
  const bgOpacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (isSelected) {
      bgOpacity.value = withTiming(1, { duration: 300 });
      checkmarkScale.value = withSpring(1, { damping: 12, stiffness: 120 });
      checkmarkOpacity.value = withTiming(1, { duration: 300 });
    } else {
      bgOpacity.value = withTiming(0, { duration: 200 });
      checkmarkScale.value = withTiming(0, { duration: 200 });
      checkmarkOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isSelected]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      borderColor: interpolateColor(
        bgOpacity.value,
        [0, 1],
        ['#ccc', accentColor]
      ),
      backgroundColor: interpolateColor(
        bgOpacity.value,
        [0, 1],
        ['#f5f5f5', `${accentColor}15`]
      ),
      transform: [{ scale: scale.value }]
    };
  });

  const checkmarkStyle = useAnimatedStyle(() => {
    return {
      opacity: checkmarkOpacity.value,
      transform: [{ scale: checkmarkScale.value }]
    };
  });

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onSelect}
    >
      <Animated.View style={[styles.container, animatedContainerStyle, style]}>
        <View style={styles.contentContainer}>
          {icon && (
            <Ionicons 
              name={icon as any} 
              size={22} 
              color={isSelected ? accentColor : '#888'} 
              style={styles.icon} 
            />
          )}
          <Text style={[
            styles.label, 
            isSelected ? { color: '#000', fontWeight: '600' } : { color: '#444' },
            textStyle
          ]}>
            {label}
          </Text>
        </View>
        
        <Animated.View style={[styles.checkmark, checkmarkStyle]}>
          <View style={[styles.checkmarkCircle, { backgroundColor: accentColor }]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  icon: {
    marginLeft: 12,
  },
  checkmark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default AnimatedOption;
