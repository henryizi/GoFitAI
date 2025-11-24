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
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import {
  AdaptiveProgressionService,
  ProgressionSettings,
} from '../../../src/services/progression/AdaptiveProgressionService';

export default function ProgressionSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        user.id
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
    setSettings((prev) => prev ? { ...prev, [key]: value } : null);
  };

  const selectProgressionMode = (mode: 'aggressive' | 'moderate' | 'conservative') => {
    if (!settings) {
      console.log('[ProgressionSettings] Cannot select mode - settings not loaded');
      return;
    }
    
    console.log('[ProgressionSettings] Selecting progression mode:', mode);
    
    // Update all settings at once to avoid state batching issues
    let updatedSettings: Partial<ProgressionSettings> = {
      progressionMode: mode,
    };
    
    // Update related settings based on mode
    if (mode === 'aggressive') {
      updatedSettings = {
        ...updatedSettings,
        weightIncrementPercentage: 5.0,
        volumeIncrementSets: 2,
        rpeTargetMin: 8,
        rpeTargetMax: 10,
      };
    } else if (mode === 'conservative') {
      updatedSettings = {
        ...updatedSettings,
        weightIncrementPercentage: 1.0,
        volumeIncrementSets: 0,
        rpeTargetMin: 6,
        rpeTargetMax: 8,
      };
    } else {
      updatedSettings = {
        ...updatedSettings,
        weightIncrementPercentage: 2.5,
        volumeIncrementSets: 1,
        rpeTargetMin: 7,
        rpeTargetMax: 9,
      };
    }
    
    const newSettings = { ...settings, ...updatedSettings };
    console.log('[ProgressionSettings] Updated settings:', newSettings);
    setSettings(newSettings);
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={styles.headerButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={28} color={colors.white} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Progression Settings</Text>
      <TouchableOpacity 
        onPress={saveSettings} 
        disabled={saving || loading}
        style={styles.headerButton}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.saveText, { opacity: loading ? 0.5 : 1 }]}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        {renderHeader()}
        <View style={styles.centerContent}>
          <Ionicons name="warning-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.errorText}>Failed to load settings</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSettings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const MODES = [
    {
      id: 'conservative',
      title: 'Conservative',
      icon: 'shield-checkmark',
      description: 'Steady, safe progress prioritizing form and recovery.',
      stats: { weight: '+1%', rpe: '6-8' }
    },
    {
      id: 'moderate',
      title: 'Balanced',
      icon: 'fitness',
      description: 'Optimal mix of intensity and recovery for consistent gains.',
      stats: { weight: '+2.5%', rpe: '7-9' }
    },
    {
      id: 'aggressive',
      title: 'Aggressive',
      icon: 'flash',
      description: 'Push your limits with higher intensity and faster load increases.',
      stats: { weight: '+5%', rpe: '8-10' }
    }
  ] as const;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {renderHeader()}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progression Mode Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Progression Mode</Text>
          <Text style={styles.sectionSubheader}>
            Select how the AI should adapt your training difficulty over time.
          </Text>

          <View style={styles.modeContainer}>
            {MODES.map((mode) => {
              const isActive = settings.progressionMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  onPress={() => selectProgressionMode(mode.id as any)}
                  activeOpacity={0.9}
                  style={[styles.modeCardWrapper, isActive && styles.modeCardActiveWrapper]}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.modeCardGradient}
                    >
                      <View style={styles.modeCardContent}>
                        <View style={styles.modeCardHeader}>
                          <View style={[styles.iconBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Ionicons name={mode.icon as any} size={24} color={colors.white} />
                          </View>
                          <Ionicons name="checkmark-circle" size={24} color={colors.white} />
                        </View>
                        <Text style={styles.modeTitleActive}>{mode.title}</Text>
                        <Text style={styles.modeDescActive}>{mode.description}</Text>
                        <View style={styles.statsContainer}>
                          <View style={styles.statBadgeActive}>
                            <Text style={styles.statTextActive}>Weight {mode.stats.weight}</Text>
                          </View>
                          <View style={styles.statBadgeActive}>
                            <Text style={styles.statTextActive}>RPE {mode.stats.rpe}</Text>
                          </View>
                        </View>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.modeCardContent}>
                      <View style={styles.modeCardHeader}>
                        <View style={[styles.iconBadge, { backgroundColor: colors.secondaryLight }]}>
                          <Ionicons name={mode.icon as any} size={24} color={colors.textSecondary} />
                        </View>
                        <View style={styles.radioButton} />
                      </View>
                      <Text style={styles.modeTitle}>{mode.title}</Text>
                      <Text style={styles.modeDesc}>{mode.description}</Text>
                      <View style={styles.statsContainer}>
                        <View style={styles.statBadge}>
                          <Text style={styles.statText}>Weight {mode.stats.weight}</Text>
                        </View>
                        <View style={styles.statBadge}>
                          <Text style={styles.statText}>RPE {mode.stats.rpe}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Automation Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Automation</Text>
          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto-Adjust Workouts</Text>
                <Text style={styles.settingDescription}>
                  Adjust weights & reps based on performance
                </Text>
              </View>
              <Switch
                value={settings.autoAdjustEnabled}
                onValueChange={(value) => updateSetting('autoAdjustEnabled', value)}
                trackColor={{ false: colors.secondaryLight, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            
            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto-Schedule Deloads</Text>
                <Text style={styles.settingDescription}>
                  Plan deload weeks when fatigue is high
                </Text>
              </View>
              <Switch
                value={settings.autoDeloadEnabled}
                onValueChange={(value) => updateSetting('autoDeloadEnabled', value)}
                trackColor={{ false: colors.secondaryLight, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            
            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto-Swap Exercises</Text>
                <Text style={styles.settingDescription}>
                  Suggest alternatives for stalled exercises
                </Text>
              </View>
              <Switch
                value={settings.autoExerciseSwapEnabled}
                onValueChange={(value) => updateSetting('autoExerciseSwapEnabled', value)}
                trackColor={{ false: colors.secondaryLight, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Advanced Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Advanced</Text>
          <View style={styles.settingsGroup}>
            <TouchableOpacity style={styles.advancedRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Plateau Detection</Text>
                <Text style={styles.settingValue}>{settings.plateauDetectionWeeks} weeks</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.advancedRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Deload Frequency</Text>
                <Text style={styles.settingValue}>Every {settings.deloadFrequencyWeeks} weeks</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.advancedRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Recovery Threshold</Text>
                <Text style={styles.settingValue}>Min Score: {settings.recoveryScoreThreshold}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            The adaptive progression engine analyzes your workout history, RPE ratings, and
            recovery data to automatically optimize your training.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  sectionSubheader: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  modeContainer: {
    gap: 16,
  },
  modeCardWrapper: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeCardActiveWrapper: {
    borderColor: colors.primary,
    borderWidth: 0, // Gradient handles the border/background
  },
  modeCardGradient: {
    padding: 1, // Slight padding if needed, but here we just use it as background
  },
  modeCardContent: {
    padding: 16,
  },
  modeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textTertiary,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  modeTitleActive: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  modeDescActive: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 72,
  },
  advancedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 60,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginTop: -8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
