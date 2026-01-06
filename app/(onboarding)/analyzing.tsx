import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../../src/styles/colors';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.5;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const AnalyzingScreen = () => {
  const insets = useSafeAreaInsets();
  const [overallProgress, setOverallProgress] = useState(0);
  const [profileProgress, setProfileProgress] = useState(0);
  const [goalsProgress, setGoalsProgress] = useState(0);
  const [personalizationProgress, setPersonalizationProgress] = useState(0);

  const circleAnimatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Overall progress animation (0 to 100)
    const overallTimer = setInterval(() => {
      setOverallProgress((prev) => {
        if (prev >= 100) {
          clearInterval(overallTimer);
          setTimeout(() => {
            router.replace('/(onboarding)/analysis-results');
          }, 800);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    // Profile bar (0 to 100 fast)
    const profileTimer = setInterval(() => {
      setProfileProgress((prev) => {
        if (prev >= 100) {
          clearInterval(profileTimer);
          return 100;
        }
        return prev + 4;
      });
    }, 30);

    // Goals bar (0 to 100 medium)
    const goalsTimer = setInterval(() => {
      setGoalsProgress((prev) => {
        if (prev >= 100) {
          clearInterval(goalsTimer);
          return 100;
        }
        if (overallProgress > 30) return prev + 2;
        return prev;
      });
    }, 40);

    // Personalization bar (0 to 100 slower)
    const personalizationTimer = setInterval(() => {
      setPersonalizationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(personalizationTimer);
          return 100;
        }
        if (overallProgress > 60) return prev + 1.5;
        return prev;
      });
    }, 50);

    Animated.timing(circleAnimatedValue, {
      toValue: 1,
      duration: 5000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    return () => {
      clearInterval(overallTimer);
      clearInterval(profileTimer);
      clearInterval(goalsTimer);
      clearInterval(personalizationTimer);
    };
  }, [overallProgress]);

  const strokeDashoffset = circleAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Analyzing Your{"\n"}Responses</Text>

      <View style={styles.circleContainer}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          <G rotation="-90" origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}>
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={colors.primary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.percentageTextContainer}>
          <Text style={styles.percentageText}>{Math.floor(overallProgress)}%</Text>
        </View>
      </View>

      <View style={styles.barsContainer}>
        <View style={styles.barWrapper}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>Profile</Text>
            <Text style={styles.barPercentage}>{Math.floor(profileProgress)}%</Text>
          </View>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${profileProgress}%` }]} />
          </View>
        </View>

        <View style={styles.barWrapper}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>Goals</Text>
            <Text style={styles.barPercentage}>{Math.floor(goalsProgress)}%</Text>
          </View>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${goalsProgress}%` }]} />
          </View>
        </View>

        <View style={styles.barWrapper}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>Personalization</Text>
            <Text style={styles.barPercentage}>{Math.floor(personalizationProgress)}%</Text>
          </View>
          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${personalizationProgress}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          Almost done! We are finalizing your custom plan based on your answers and millions of data points from successful GoFitAI users.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 60,
    lineHeight: 40,
    textShadowColor: 'rgba(255, 107, 53, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  circleContainer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  percentageTextContainer: {
    position: 'absolute',
  },
  percentageText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  barsContainer: {
    width: '100%',
    gap: 24,
  },
  barWrapper: {
    width: '100%',
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  barPercentage: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  barBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  footerContainer: {
    marginTop: 'auto',
    marginBottom: 60,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default AnalyzingScreen;





