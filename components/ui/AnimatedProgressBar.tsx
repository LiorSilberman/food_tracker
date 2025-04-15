import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';

interface ProgressBarProps {
  step: number;
  totalSteps: number;
  accentColor?: string;
}

const AnimatedProgressBar: React.FC<ProgressBarProps> = ({ 
  step, 
  totalSteps,
  accentColor = '#4FC3F7'
}) => {
  const progress = useSharedValue(0);
  const dotScale = useSharedValue(1);
  
  useEffect(() => {
    // Calculate progress percentage
    const progressValue = (step - 1) / (totalSteps - 1);
    
    // Animate progress bar
    progress.value = withTiming(progressValue, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    
    // Animate current step dot
    dotScale.value = withSequence(
      withTiming(1.5, { duration: 200 }),
      withDelay(200, withTiming(1, { duration: 300 }))
    );
  }, [step, totalSteps]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value * 100}%`,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View 
          style={[
            styles.progress, 
            progressStyle, 
            { backgroundColor: accentColor }
          ]} 
        />
      </View>
      
      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index + 1 <= step;
          const isCurrent = index + 1 === step;
          
          return (
            <React.Fragment key={index}>
              {index > 0 && <View style={styles.connector} />}
              <StepDot 
                isCompleted={isCompleted} 
                isCurrent={isCurrent} 
                index={index}
                accentColor={accentColor}
              />
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

interface StepDotProps {
  isCompleted: boolean;
  isCurrent: boolean;
  index: number;
  accentColor: string;
}

const StepDot: React.FC<StepDotProps> = ({ 
  isCompleted, 
  isCurrent,
  index,
  accentColor
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    // Animate entrance with delay based on index
    opacity.value = withDelay(
      index * 100, 
      withTiming(1, { duration: 300 })
    );
    
    // Animate current step
    if (isCurrent) {
      scale.value = withSequence(
        withTiming(1.5, { duration: 200 }),
        withDelay(200, withTiming(1, { duration: 300 }))
      );
    } else {
      scale.value = withTiming(1, { duration: 300 });
    }
  }, [isCurrent, index]);
  
  const dotStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
      backgroundColor: isCompleted ? accentColor : '#e0e0e0',
    };
  });
  
  return (
    <Animated.View style={[styles.dot, dotStyle]} />
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 20,
  },
  track: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -8,
    paddingHorizontal: 0,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginTop: 6,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: 'transparent',
  }
});

export default AnimatedProgressBar;
