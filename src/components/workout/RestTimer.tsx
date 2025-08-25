import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, Vibration } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Svg, { G, Line, Circle } from 'react-native-svg';
import { colors } from '../../styles/colors';

interface RestTimerProps {
  duration: number; // seconds
  onFinish: () => void; // Called on completion or 'Next Set'
}

const SIZE = 220;
const STROKE_WIDTH = 8;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const RestTimer: React.FC<RestTimerProps> = ({ duration, onFinish }) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    if (secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else {
      Vibration.vibrate(500);
      onFinish();
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [secondsLeft, isPaused]);

  const dashOffset = useMemo(() => {
    return CIRCUMFERENCE * (1 - secondsLeft / duration);
  }, [secondsLeft, duration]);

  const renderTicks = () => {
    const ticks = [];
    const center = SIZE / 2;
    for (let i = 0; i < 60; i++) {
      const angle = (i * 6) * (Math.PI / 180);
      const inner = RADIUS - 10;
      const outer = RADIUS;
      const x1 = center + inner * Math.sin(angle);
      const y1 = center - inner * Math.cos(angle);
      const x2 = center + outer * Math.sin(angle);
      const y2 = center - outer * Math.cos(angle);
      ticks.push(
        <Line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={colors.border}
          strokeWidth={i % 5 === 0 ? 2 : 1}
        />
      );
    }
    return ticks;
  };

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Rest Time</Text>
      <View style={styles.timerContainer}>
      <Svg width={SIZE} height={SIZE}>
        <G rotation="-90" originX={SIZE / 2} originY={SIZE / 2}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={colors.border}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
              stroke={colors.primary}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
        {renderTicks()}
      </Svg>

        <View style={styles.timeTextContainer}>
          <Text style={styles.timeText}>{minutes}:{secs}</Text>
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <Button mode="outlined" style={styles.btn} onPress={() => setIsPaused(!isPaused)} textColor={colors.error}>
          <Text>{isPaused ? 'Resume' : 'Stop'}</Text>
        </Button>
        <Button mode="contained" style={[styles.btn, { backgroundColor: colors.primary }]} onPress={onFinish}>
          <Text>Next Set</Text>
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  timerContainer: {
    position: 'relative',
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTextContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  timeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 2,
  },
  label: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 32,
  },
  btn: {
    marginHorizontal: 12,
    minWidth: 120,
  },
});

export default RestTimer; 