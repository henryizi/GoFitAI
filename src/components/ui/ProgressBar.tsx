import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  style?: any;
}

export default function ProgressBar({ currentStep, totalSteps, style }: ProgressBarProps) {
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.background}>
        <View style={[styles.progress, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 4,
    width: '100%',
    marginVertical: 16,
  },
  background: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
