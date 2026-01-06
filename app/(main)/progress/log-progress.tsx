import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Vibration,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';
import { DateData } from 'react-native-calendars';
import { useAuth } from '../../../src/hooks/useAuth';
import { ProgressService } from '../../../src/services/progressService';
import { formatWeight, getWeightDisplayUnit, kgToLbs, lbsToKg } from '../../../src/utils/unitConversions';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../../src/services/supabase/client';
import { Database } from '../../../src/types/database';

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
};

const { width } = Dimensions.get('window');

const convertWeight = (value: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => {
  if (fromUnit === toUnit) {
    return value;
  }
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return value * 2.20462;
  }
  if (fromUnit === 'lbs' && toUnit === 'kg') {
    return value / 2.20462;
  }
  return value; // Should not happen
};

export default function LogProgressScreen() {
  const { user, profile, updateProfile } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Weight state
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(profile?.weight_unit_preference || 'kg');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [hasExistingWeightEntries, setHasExistingWeightEntries] = useState<boolean | null>(null);
  const [showUnitSelectionDialog, setShowUnitSelectionDialog] = useState(false);
  const [isFirstWeightEntry, setIsFirstWeightEntry] = useState(false);

  // Animation refs for success feedback
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    message = "Track your weight to monitor your progress over time.";
    
    return { greeting, message };
  }, []);

  // Update unit when profile changes
  useEffect(() => {
    if (profile?.weight_unit_preference) {
      const newUnit = profile.weight_unit_preference;
      if (newUnit !== unit) {
        // Convert existing weight value if there is one
        if (weight) {
          const currentWeightNum = parseFloat(weight);
          if (!Number.isNaN(currentWeightNum)) {
            let convertedWeight;
            if (unit === 'kg' && newUnit === 'lbs') {
              convertedWeight = convertWeight(currentWeightNum, 'kg', 'lbs');
            } else if (unit === 'lbs' && newUnit === 'kg') {
              convertedWeight = convertWeight(currentWeightNum, 'lbs', 'kg');
            } else {
              convertedWeight = currentWeightNum;
            }
            setWeight(convertedWeight.toFixed(1));
          }
        }
        setUnit(newUnit);
      }
    }
  }, [profile?.weight_unit_preference, unit, weight]);

  // Check if user has existing weight entries
  useEffect(() => {
    if (user) {
      ProgressService.hasExistingWeightEntries(user.id).then((hasEntries) => {
        setHasExistingWeightEntries(hasEntries);
        setIsFirstWeightEntry(!hasEntries);
      });
    }
  }, [user]);

  const handleWeightChange = (value: string) => {
    const withDot = value.replace(/,/g, '.');
    const cleaned = withDot.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    setWeight(normalized);
  };

  // Get weight value in kg for calculations and saving
  const getWeightInKg = () => {
    if (!weight) return NaN;
    const weightNum = parseFloat(weight);
    if (Number.isNaN(weightNum)) return NaN;
    
    // If current unit is lbs, convert to kg; otherwise it's already in kg
    if (unit === 'lbs') {
      return convertWeight(weightNum, 'lbs', 'kg');
    }
    return weightNum;
  };

  const weightNum = getWeightInKg();
  const isWeightInvalid = Number.isNaN(weightNum) || weightNum <= 0;
  const todayLabel = new Date().toLocaleDateString();

  const handleBodyFatChange = (value: string) => {
    const withDot = value.replace(/,/g, '.');
    const cleaned = withDot.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    setBodyFat(normalized);
  };
  const bodyFatNum = bodyFat ? parseFloat(bodyFat) : NaN;
  const isBodyFatInvalid = bodyFat.length > 0 && (Number.isNaN(bodyFatNum) || bodyFatNum < 0 || bodyFatNum > 100);
 
  const getDisplayWeight = () => {
    if (!weight) return '0.0';
    const weightNum = parseFloat(weight);
    if (Number.isNaN(weightNum)) return '0.0';
    return weightNum.toFixed(1);
  };

  // Handle first-time unit selection
  const handleFirstTimeUnitSelection = () => {
    if (hasExistingWeightEntries) {
      // User already has weight entries, don't allow unit change
      Alert.alert(
        "Unit Already Set",
        "You've already logged weight entries. Your unit preference is locked to maintain data consistency.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // Show unit selection dialog for first-time users
    setShowUnitSelectionDialog(true);
  };

  // Handle unit selection with commitment alert
  const selectUnit = (selectedUnit: 'kg' | 'lbs') => {
    Alert.alert(
      "Confirm Weight Unit",
      `You've selected ${selectedUnit.toUpperCase()} as your weight unit.\n\nThis unit will be used for all future weight logging to keep your data consistent.\n\nYou can continue logging your weight in ${selectedUnit.toUpperCase()}.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm",
          style: "default",
          onPress: async () => {
            // Convert current weight value to new unit if needed
            if (weight && unit !== selectedUnit) {
              const currentWeightNum = parseFloat(weight);
              if (!Number.isNaN(currentWeightNum)) {
                const convertedWeight = convertWeight(currentWeightNum, unit, selectedUnit);
                setWeight(convertedWeight.toFixed(1));
              }
            }
            
            setUnit(selectedUnit);
            setShowUnitSelectionDialog(false);
            
            // Update user's weight unit preference in profile
            if (user) {
              try {
                const { error } = await supabase
                  .from('profiles')
                  .update({ weight_unit_preference: selectedUnit })
                  .eq('id', user.id);

                if (error) throw error;
                
                // Manually update local profile state
                updateProfile({ weight_unit_preference: selectedUnit });
                console.log('Weight unit preference updated to:', selectedUnit);
              } catch (error) {
                console.error('Error updating weight unit preference:', error);
              }
            }
          }
        }
      ]
    );
  };

  // Handle unit toggle with proper conversion (only for existing users)
  const handleUnitToggle = () => {
    if (isFirstWeightEntry) {
      handleFirstTimeUnitSelection();
      return;
    }

    const newUnit = unit === 'kg' ? 'lbs' : 'kg';
    
    // Convert current weight value to new unit
    if (weight) {
      const currentWeightNum = parseFloat(weight);
      if (!Number.isNaN(currentWeightNum)) {
        let convertedWeight;
        if (unit === 'kg' && newUnit === 'lbs') {
          // Currently in kg, switching to lbs: convert kg to lbs
          convertedWeight = convertWeight(currentWeightNum, 'kg', 'lbs');
        } else if (unit === 'lbs' && newUnit === 'kg') {
          // Currently in lbs, switching to kg: convert lbs to kg
          convertedWeight = convertWeight(currentWeightNum, 'lbs', 'kg');
        } else {
          convertedWeight = currentWeightNum;
        }
        setWeight(convertedWeight.toFixed(1));
      }
    }
    
    setUnit(newUnit);
  };

  const adjustWeight = (delta: number) => {
    // Get current weight in the display unit
    const currentInUnit = weight ? parseFloat(weight) : 0;
    if (Number.isNaN(currentInUnit)) return;
    
    // Adjust in the current unit
    const next = Math.max(0, currentInUnit + delta);
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
        router.back();
      }, 1500);
    });
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };


  const handleSave = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Save weight if provided
      if (weight && !isWeightInvalid) {
        const weightToSave = unit === 'lbs' ? convertWeight(weightNum, 'lbs', 'kg') : weightNum;
        await ProgressService.addWeightEntry({
          user_id: user.id,
          weight_kg: weightToSave,
          metric_date: selectedDate,
          notes: notes || null,
          body_fat_percentage: bodyFat && !isBodyFatInvalid ? bodyFatNum : null,
        });
      }

      // Optionally update profile body fat percentage
      if (bodyFat && !isBodyFatInvalid) {
        try {
          await supabase
            .from('profiles')
            .update({ body_fat: bodyFatNum })
            .eq('id', user.id);
        } catch (e) {
          console.warn('Failed to update body fat percentage:', e);
          // Non-blocking: do not prevent success if this fails
        }
      }

      // Refresh progress entries to show updated data
      if (user) {
        const updatedEntries = await ProgressService.getProgressPhotos(user.id);
        setProgressEntries(updatedEntries);
      }

      // Clear temporary photo URIs since they're now saved
      setFrontPhotoUri(null);
      setBackPhotoUri(null);

      showSuccessAlert();
    } catch (error) {
      console.error('Error saving progress:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Separate validation for each section
  const canSaveWeight = weight && !isWeightInvalid;

  // Separate save handlers for each section
  const handleSaveWeight = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      return;
    }

    if (!canSaveWeight) {
      Alert.alert('Invalid data', 'Please enter a valid weight.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Always save in kg - weightNum is already converted by getWeightInKg()
      await ProgressService.addWeightEntry({
        user_id: user.id,
        weight_kg: weightNum,
        metric_date: selectedDate,
        notes: notes || null,
        body_fat_percentage: bodyFat && !isBodyFatInvalid ? bodyFatNum : null,
      });

      // Optionally update profile body fat percentage
      if (bodyFat && !isBodyFatInvalid) {
        try {
          await supabase
            .from('profiles')
            .update({ body_fat: bodyFatNum })
            .eq('id', user.id);
        } catch (e) {
          console.warn('Failed to update body fat percentage:', e);
          // Non-blocking: do not prevent success if this fails
        }
      }

      // Clear weight form
      setWeight('');
      setBodyFat('');
      setNotes('');

      // Refresh weight entries check since user now has at least one entry
      if (user) {
        ProgressService.hasExistingWeightEntries(user.id).then((hasEntries) => {
          setHasExistingWeightEntries(hasEntries);
          setIsFirstWeightEntry(!hasEntries);
        });
      }

      showSuccessAlert();
    } catch (error) {
      console.error('Error saving weight:', error);
      Alert.alert('Error', 'Failed to save weight. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 64}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        >
          {/* AI Coach Header */}
          <View style={styles.coachHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Icon name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.coachAvatarContainer}>
              <Image
                source={require('../../../assets/mascot.png')}
                style={styles.coachAvatar}
              />
              <View style={styles.coachOnlineIndicator} />
            </View>
            <View style={styles.coachTextContainer}>
              <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
              <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
            </View>
          </View>

          {/* Weight Section */}
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Log Weight</Text>

              <View style={styles.weightContainer}>
                <View style={styles.weightDisplay}>
                  <Text style={styles.weightLabel}>Today's Weight</Text>
                  <View style={styles.weightValueContainer}>
                    <Text style={styles.weightValue}>{getDisplayWeight() || '0.0'}</Text>
                    {isFirstWeightEntry ? (
                      <TouchableOpacity 
                        style={[styles.unitToggle, styles.unitToggleSelectable]}
                        onPress={handleUnitToggle}
                      >
                        <Text style={[styles.unitText, styles.unitTextSelectable]}>
                          {unit.toUpperCase()} ⚙️
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.unitToggle, styles.unitToggleFixed]}>
                        <Text style={[styles.unitText, styles.unitTextFixed]}>
                          {unit.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.weightAdjuster}>
                  <TouchableOpacity 
                    style={styles.adjustButton}
                    onPress={() => adjustWeight(-0.5)}
                    activeOpacity={0.7}
                  >
                    <Icon name="minus" size={24} color={colors.text} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.weightInput}
                    value={weight}
                    onChangeText={handleWeightChange}
                    placeholder={`Enter weight (${unit})`}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  
                  <TouchableOpacity 
                    style={styles.adjustButton}
                    onPress={() => adjustWeight(0.5)}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.bodyFatContainer}>
                  <Text style={styles.bodyFatLabel}>Body Fat % (optional)</Text>
                  <TextInput
                    style={styles.bodyFatInput}
                    value={bodyFat}
                    onChangeText={handleBodyFatChange}
                    placeholder="e.g. 18.5"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  {isBodyFatInvalid && (
                    <HelperText type="error" visible={true}>
                      Enter a value between 0 and 100
                    </HelperText>
                  )}
                </View>

                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes (optional)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Weight Save Button */}
              <TouchableOpacity 
                style={[
                  styles.sectionSaveButton,
                  !canSaveWeight && styles.saveButtonDisabled
                ]}
                onPress={handleSaveWeight}
                disabled={!canSaveWeight || isSaving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={canSaveWeight ? [colors.primary, colors.primaryDark] : [colors.textSecondary, colors.textSecondary]}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <>
                      <Icon name="check" size={20} color={colors.text} />
                      <Text style={styles.saveButtonText}>Save Weight</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unit Selection Dialog */}
      {showUnitSelectionDialog && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowUnitSelectionDialog(false)}
          />
          <View style={styles.unitSelectionModal}>
            <Text style={styles.modalTitle}>Choose Your Weight Unit</Text>
            <Text style={styles.modalSubtitle}>
              This will be your default unit for all future weight logging
            </Text>
            
            <View style={styles.unitOptions}>
              <TouchableOpacity 
                style={[styles.unitOption, unit === 'kg' && styles.unitOptionActive]}
                onPress={() => selectUnit('kg')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitOptionText, unit === 'kg' && styles.unitOptionTextActive]}>
                  Kilograms (kg)
                </Text>
                <Text style={[styles.unitOptionSubtext, unit === 'kg' && styles.unitOptionSubtextActive]}>
                  Metric system
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.unitOption, unit === 'lbs' && styles.unitOptionActive]}
                onPress={() => selectUnit('lbs')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitOptionText, unit === 'lbs' && styles.unitOptionTextActive]}>
                  Pounds (lbs)
                </Text>
                <Text style={[styles.unitOptionSubtext, unit === 'lbs' && styles.unitOptionSubtextActive]}>
                  Imperial system
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowUnitSelectionDialog(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Success Animation */}
      {showSuccessAnimation && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
          <BlurView intensity={20} tint="dark" style={styles.successBlur}>
            <Animated.View style={[styles.successContent, { transform: [{ scale: scaleAnim }] }]}>
              <Icon name="check-circle" size={60} color={colors.success} />
              <Text style={styles.successText}>Progress Saved!</Text>
            </Animated.View>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Tab Container
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  weightContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  weightDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weightLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightValue: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '800',
    marginRight: 12,
  },
  unitToggle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  unitText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  unitToggleSelectable: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  unitToggleFixed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unitTextSelectable: {
    color: colors.primary,
  },
  unitTextFixed: {
    color: colors.textSecondary,
  },
  weightAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  adjustButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  weightInput: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photosContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  photoSection: {
    marginBottom: 24,
  },
  photoLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  photoPreview: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  photoPreviewText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionSaveButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successBlur: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    padding: 40,
  },
  successText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  bodyFatContainer: {
    marginBottom: 16,
  },
  bodyFatLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bodyFatInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  calendar: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
  },
  calendarPhotoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  calendarPhotoContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  calendarPhotoLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  calendarPhotoPlaceholder: {
    width: 140,
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoPlaceholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  calendarPreviewImage: {
    width: 140,
    height: 200,
    borderRadius: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  unitSelectionModal: {
    width: width * 0.85,
    maxWidth: 400,
    backgroundColor: '#000000',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary || 'rgba(235, 235, 245, 0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  unitOptions: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  unitOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  unitOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  unitOptionTextActive: {
    color: colors.white,
  },
  unitOptionSubtext: {
    fontSize: 12,
    color: colors.textSecondary || 'rgba(235, 235, 245, 0.6)',
  },
  unitOptionSubtextActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: colors.textSecondary || 'rgba(235, 235, 245, 0.6)',
    fontWeight: '600',
  },
});


