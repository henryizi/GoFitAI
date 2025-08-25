import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, TouchableOpacity, Animated, Vibration } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import { ProgressService } from '../../../src/services/progressService';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function LogMetricsScreen() {
  const { user } = useAuth();
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  // Animations
  const scaleAnim = new Animated.Value(1);
  const successOpacity = new Animated.Value(0);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    // Entrance animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const handleWeightChange = (value: string) => {
    const withDot = value.replace(/,/g, '.');
    const cleaned = withDot.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    setWeight(normalized);
  };

  const weightNum = weight ? parseFloat(weight) : NaN;
  const isWeightInvalid = Number.isNaN(weightNum) || weightNum <= 0;
  const todayLabel = new Date().toLocaleDateString();
 
  const convertWeight = (value: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'kg' && toUnit === 'lbs') return value * 2.20462;
    if (fromUnit === 'lbs' && toUnit === 'kg') return value / 2.20462;
    return value;
  };

  const getDisplayWeight = () => {
    if (!weight) return '';
    const weightNum = parseFloat(weight);
    if (Number.isNaN(weightNum)) return weight;
    return unit === 'kg' ? weightNum.toFixed(1) : convertWeight(weightNum, 'kg', 'lbs').toFixed(1);
  };

  const adjustWeight = (delta: number) => {
    const current = Number.isNaN(weightNum) ? 0 : weightNum;
    const adjustedDelta = unit === 'lbs' ? delta / 2.20462 : delta; // Convert delta to kg for storage
    const next = Math.max(0, current + adjustedDelta);
    setWeight(next ? next.toFixed(1) : '');
    
    // Haptic feedback
    Vibration.vibrate(50);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const showSuccessAlert = () => {
    setShowSuccessAnimation(true);
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        setShowSuccessAnimation(false);
      }, 1500);
    });
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      return;
    }
    const weightNum = weight ? parseFloat(weight) : NaN;
    if (Number.isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Invalid weight', 'Please enter a valid weight.');
      return;
    }
    setIsSaving(true);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await ProgressService.addWeightEntry({
        user_id: user.id,
        weight_kg: weightNum, // Always store in kg
        metric_date: today,
        notes: notes || null,
      });
      if (result) {
        Vibration.vibrate([100, 50, 100]); // Success vibration pattern
        showSuccessAlert();
        setTimeout(() => {
          router.replace('/(main)/progress?saved=weight');
        }, 1000);
      } else {
        Alert.alert('Failed', 'Save failed. Please try again later.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'An error occurred. Please try again later.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Enhanced Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0]
                  })
                }],
                opacity: slideAnim
              }
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(main)/progress')}>
              <Icon name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Log Weight</Text>
            <View style={styles.unitToggle}>
              <TouchableOpacity 
                style={[styles.unitButton, unit === 'kg' && styles.unitButtonActive]}
                onPress={() => setUnit('kg')}
              >
                <Text style={[styles.unitButtonText, unit === 'kg' && styles.unitButtonTextActive]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.unitButton, unit === 'lbs' && styles.unitButtonActive]}
                onPress={() => setUnit('lbs')}
              >
                <Text style={[styles.unitButtonText, unit === 'lbs' && styles.unitButtonTextActive]}>lbs</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Main Weight Input Card */}
          <Animated.View
            style={[
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }],
                opacity: slideAnim
              }
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.08)"]}
              style={styles.mainCard}
            >
              {/* Hero Weight Display */}
              <View style={styles.weightDisplayContainer}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.weightIconContainer}>
                  <Icon name="scale-bathroom" size={32} color={colors.text} />
                </LinearGradient>
                <Text style={styles.weightDisplayLabel}>Today's Weight</Text>
                <Text style={styles.todayDate}>{todayLabel}</Text>
                
                {/* Large Weight Display */}
                <View style={styles.weightDisplayBox}>
                  <Text style={styles.weightDisplayNumber}>
                    {getDisplayWeight() || '0.0'}
                  </Text>
                  <Text style={styles.weightDisplayUnit}>{unit}</Text>
                </View>
              </View>

              {/* Enhanced Input Section */}
              <View style={styles.inputSection}>
                <TextInput
                  label={`Enter weight in ${unit}`}
                  value={weight}
                  onChangeText={handleWeightChange}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  mode="outlined"
                  style={styles.weightInput}
                  error={!!weight && isWeightInvalid}
                  left={<TextInput.Icon icon="scale-bathroom" />}
                  right={<TextInput.Affix text={unit} />}
                  outlineColor={'rgba(255,255,255,0.2)'}
                  activeOutlineColor={colors.primary}
                  theme={{ 
                    roundness: 16,
                    colors: {
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.primary,
                    }
                  }}
                  onSubmitEditing={() => {
                    if (!isWeightInvalid && weight) {
                      handleSave();
                    }
                  }}
                />
                <HelperText type="error" visible={!!weight && isWeightInvalid}>
                  Please enter a positive number.
                </HelperText>
              </View>

              {/* Enhanced Quick Adjust Buttons */}
              <View style={styles.quickAdjustSection}>
                <Text style={styles.quickAdjustTitle}>Quick Adjust</Text>
                <Animated.View style={[styles.quickRow, { transform: [{ scale: scaleAnim }] }]}>
                  {(unit === 'kg' ? [-1.0, -0.5, +0.5, +1.0] : [-2, -1, +1, +2]).map((delta) => (
                    <TouchableOpacity 
                      key={delta} 
                      style={[
                        styles.quickChip,
                        delta > 0 ? styles.quickChipPositive : styles.quickChipNegative
                      ]} 
                      onPress={() => adjustWeight(delta)}
                      activeOpacity={0.7}
                    >
                      <Icon 
                        name={delta > 0 ? "plus" : "minus"} 
                        size={14} 
                        color={delta > 0 ? colors.success : colors.warning} 
                        style={styles.quickChipIcon}
                      />
                      <Text style={[
                        styles.quickChipText,
                        delta > 0 ? styles.quickChipTextPositive : styles.quickChipTextNegative
                      ]}>
                        {Math.abs(delta)} {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              </View>

              {/* Enhanced Notes Section */}
              <View style={styles.notesSection}>
                <TextInput
                  label="Add a note (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  mode="outlined"
                  style={styles.notesInput}
                  multiline
                  numberOfLines={3}
                  placeholder="How are you feeling? Any insights about your progress?"
                  outlineColor={'rgba(255,255,255,0.2)'}
                  activeOutlineColor={colors.primary}
                  theme={{ 
                    roundness: 16,
                    colors: {
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.primary,
                    }
                  }}
                  left={<TextInput.Icon icon="note-text-outline" />}
                />
              </View>

              {/* Enhanced Save Button */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={isSaving || !weight.trim()}
                  style={[styles.saveButtonContainer, (isSaving || !weight.trim()) && { opacity: 0.7 }]}
                >
                  <LinearGradient 
                    colors={[colors.primary, colors.primaryDark]} 
                    style={styles.saveButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isSaving ? (
                      <>
                        <Icon name="loading" size={20} color={colors.text} style={styles.saveButtonIcon} />
                        <Text style={styles.saveText}>Saving...</Text>
                      </>
                    ) : (
                      <>
                        <Icon name="check-circle" size={20} color={colors.text} style={styles.saveButtonIcon} />
                        <Text style={styles.saveText}>Save Weight</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          {/* Success Animation Overlay */}
          {showSuccessAnimation && (
            <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
              <View style={styles.successContent}>
                <Icon name="check-circle" size={60} color={colors.success} />
                <Text style={styles.successText}>Weight Saved!</Text>
                <Text style={styles.successSubtext}>Great job tracking your progress</Text>
              </View>
            </Animated.View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity onPress={() => router.replace('/(main)/progress')} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 60, // Increased to avoid status bar/notch
    marginTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    minWidth: 40,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  unitButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  unitButtonTextActive: {
    color: colors.text,
    fontWeight: '700',
  },

  // Main Card Styles
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
  
  // Weight Display Styles
  weightDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  weightIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  weightDisplayLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  todayDate: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  weightDisplayBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weightDisplayNumber: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  weightDisplayUnit: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Input Section Styles
  inputSection: {
    marginBottom: 24,
  },
  weightInput: {
    marginBottom: 8,
  },

  // Quick Adjust Styles
  quickAdjustSection: {
    marginBottom: 24,
  },
  quickAdjustTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickChipPositive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  quickChipNegative: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  quickChipIcon: {
    marginRight: 4,
  },
  quickChipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  quickChipTextPositive: {
    color: colors.success,
  },
  quickChipTextNegative: {
    color: colors.warning,
  },

  // Notes Section
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    minHeight: 80,
  },

  // Save Button Styles
  saveButtonContainer: {
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Success Animation Styles
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  successContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  successText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtext: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },

  // Cancel Button
  cancelButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
}); 