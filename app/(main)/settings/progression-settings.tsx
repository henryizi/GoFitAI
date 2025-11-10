/**
 * ============================================================
 * PROGRESSION SETTINGS SCREEN
 * ============================================================
 * UI for configuring adaptive progression engine preferences
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import {
  AdaptiveProgressionService,
  ProgressionSettings,
} from '../../../src/services/progression/AdaptiveProgressionService';

export default function ProgressionSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ProgressionSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const fetchedSettings = await AdaptiveProgressionService.getProgressionSettings(
        user.id,
        null // Global settings
      );
      setSettings(fetchedSettings);
    } catch (error) {
      console.error('[ProgressionSettings] Error loading:', error);
      Alert.alert('Error', 'Failed to load progression settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const success = await AdaptiveProgressionService.updateProgressionSettings(settings);
      
      if (success) {
        Alert.alert('Success', 'Progression settings saved successfully');
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch (error) {
      console.error('[ProgressionSettings] Error saving:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof ProgressionSettings>(
    key: K,
    value: ProgressionSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const selectProgressionMode = (mode: 'aggressive' | 'moderate' | 'conservative') => {
    updateSetting('progressionMode', mode);
    
    // Update related settings based on mode
    if (mode === 'aggressive') {
      updateSetting('weightIncrementPercentage', 5.0);
      updateSetting('volumeIncrementSets', 2);
      updateSetting('rpeTargetMin', 8);
      updateSetting('rpeTargetMax', 10);
    } else if (mode === 'conservative') {
      updateSetting('weightIncrementPercentage', 1.0);
      updateSetting('volumeIncrementSets', 0);
      updateSetting('rpeTargetMin', 6);
      updateSetting('rpeTargetMax', 8);
    } else {
      updateSetting('weightIncrementPercentage', 2.5);
      updateSetting('volumeIncrementSets', 1);
      updateSetting('rpeTargetMin', 7);
      updateSetting('rpeTargetMax', 9);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Progression Settings',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Progression Settings',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.white,
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>Failed to load settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Progression Settings',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.white,
          headerRight: () => (
            <TouchableOpacity onPress={saveSettings} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progression Mode */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progression Mode</Text>
          <Text style={styles.sectionDescription}>
            Choose how aggressively the AI adjusts your training
          </Text>

          <View style={styles.modeContainer}>
            {(['aggressive', 'moderate', 'conservative'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeCard,
                  settings.progressionMode === mode && styles.modeCardActive,
                ]}
                onPress={() => selectProgressionMode(mode)}
              >
                <View style={styles.modeHeader}>
                  <Ionicons
                    name={
                      mode === 'aggressive'
                        ? 'flash'
                        : mode === 'moderate'
                        ? 'fitness'
                        : 'shield-checkmark'
                    }
                    size={24}
                    color={
                      settings.progressionMode === mode
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.modeTitle,
                      settings.progressionMode === mode && styles.modeTitleActive,
                    ]}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </View>
                <Text style={styles.modeDescription}>
                  {mode === 'aggressive' &&
                    'Faster progression, higher intensity, optimal for strength goals'}
                  {mode === 'moderate' &&
                    'Balanced approach, steady progress, ideal for most goals'}
                  {mode === 'conservative' &&
                    'Slower progression, prioritizes recovery, best for beginners'}
                </Text>
                <View style={styles.modeStats}>
                  <Text style={styles.modeStatText}>
                    Weight: +
                    {mode === 'aggressive' ? '5%' : mode === 'moderate' ? '2.5%' : '1%'}
                  </Text>
                  <Text style={styles.modeStatText}>
                    RPE Target:{' '}
                    {mode === 'aggressive' ? '8-10' : mode === 'moderate' ? '7-9' : '6-8'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Automation Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automation</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Adjust Workouts</Text>
              <Text style={styles.settingDescription}>
                Automatically adjust weight, sets, and reps based on performance
              </Text>
            </View>
            <Switch
              value={settings.autoAdjustEnabled}
              onValueChange={(value) => updateSetting('autoAdjustEnabled', value)}
              trackColor={{ false: colors.textTertiary, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Schedule Deloads</Text>
              <Text style={styles.settingDescription}>
                Automatically plan deload weeks based on fatigue
              </Text>
            </View>
            <Switch
              value={settings.autoDeloadEnabled}
              onValueChange={(value) => updateSetting('autoDeloadEnabled', value)}
              trackColor={{ false: colors.textTertiary, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Auto-Swap Exercises</Text>
              <Text style={styles.settingDescription}>
                Suggest alternative exercises when plateaus are detected
              </Text>
            </View>
            <Switch
              value={settings.autoExerciseSwapEnabled}
              onValueChange={(value) => updateSetting('autoExerciseSwapEnabled', value)}
              trackColor={{ false: colors.textTertiary, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>

          <TouchableOpacity style={styles.advancedRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Plateau Detection</Text>
              <Text style={styles.settingDescription}>
                {settings.plateauDetectionWeeks} weeks without progress
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.advancedRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Deload Frequency</Text>
              <Text style={styles.settingDescription}>
                Every {settings.deloadFrequencyWeeks} weeks
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.advancedRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Recovery Threshold</Text>
              <Text style={styles.settingDescription}>
                Minimum recovery score: {settings.recoveryScoreThreshold}/10
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            The adaptive progression engine analyzes your workout history, RPE ratings, and
            recovery data to automatically optimize your training for continuous progress.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  modeContainer: {
    gap: 12,
  },
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.cardHighlight,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeTitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  modeTitleActive: {
    color: colors.white,
  },
  modeDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  modeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  modeStatText: {
    color: colors.textTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  advancedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    margin: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
