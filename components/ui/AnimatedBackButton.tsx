import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

interface AnimatedBackButtonProps {
  onPress: () => void;
  color?: string;
}

const AnimatedBackButton: React.FC<AnimatedBackButtonProps> = ({ 
  onPress,
  color = '#333' 
}) => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  
  const handlePressIn = () => {
    scale.value = withTiming(0.9, { duration: 100 });
    rotate.value = withTiming(-10, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
    rotate.value = withSpring(0, { damping: 15, stiffness: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotate.value}deg` }
      ]
    };
  });

  return (
    <TouchableOpacity
      style={styles.backButton}
      activeOpacity={0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.buttonContent, animatedStyle]}>
        <Ionicons name="arrow-back" size={24} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default AnimatedBackButton;
