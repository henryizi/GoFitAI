import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  Vibration,
  Dimensions,
  ImageBackground
} from 'react-native';
import { Text, TextInput, HelperText, ActivityIndicator } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import { ProgressService } from '../../../src/services/progressService';
import { formatWeight, getWeightDisplayUnit, kgToLbs, lbsToKg } from '../../../src/utils/unitConversions';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ProgressPhotoPrivacyNotice from '../../../src/components/legal/ProgressPhotoPrivacyNotice';
import { usePhotoUpload } from '../../../src/hooks/usePhotoUpload';
import { BlurView } from 'expo-blur';
import { supabase } from '../../../src/services/supabase/client';
import { Database } from '../../../src/types/database';
import { SafeImage } from '../../../src/components/ui/SafeImage';

const { width } = Dimensions.get('window');

export default function LogProgressScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Weight state
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>(profile?.weight_unit_preference || 'kg');
  const [bodyFat, setBodyFat] = useState<string>('');
  
  // Photo state
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [activeSection, setActiveSection] = useState<'weight' | 'photos'>('weight');
  const [hasExistingWeightEntries, setHasExistingWeightEntries] = useState<boolean | null>(null);
  const [showUnitSelectionDialog, setShowUnitSelectionDialog] = useState(false);
  const [isFirstWeightEntry, setIsFirstWeightEntry] = useState(false);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const sectionSlideAnim = useRef(new Animated.Value(0)).current;

  // Photo upload hook
  const { 
    pickImage, 
    uploadPhoto, 
    isLoading: photoUploading,
    error: photoError 
  } = usePhotoUpload();

  useEffect(() => {
    // Entrance animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
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

  // Fetch progress entries for calendar
  useEffect(() => {
    if (user) {
      ProgressService.getProgressPhotos(user.id).then((entries: any) => {
        setProgressEntries(entries);
      });
    }
  }, [user]);

  // Clear photo URIs when changing dates
  useEffect(() => {
    setFrontPhotoUri(null);
    setBackPhotoUri(null);
  }, [selectedDate]);

  // Calendar marked dates
  const markedDates = useMemo(() => {
    const marks: { [date: string]: any } = {};
    progressEntries.forEach(entry => {
      marks[entry.date] = { marked: true, dotColor: colors.primary };
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary, activeOpacity: 0 };
    return marks;
  }, [progressEntries, selectedDate]);

  // Current entry for selected date
  const currentEntry = useMemo(() => progressEntries.find(e => e.date === selectedDate), [progressEntries, selectedDate]);

  const handleWeightChange = (value: string) => {
    const withDot = value.replace(/,/g, '.');
    const cleaned = withDot.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : parts[0];
    setWeight(normalized);
  };

  // Get weight value in the current unit for input field
  const getWeightInCurrentUnit = () => {
    if (!weight) return '';
    const weightNum = parseFloat(weight);
    if (Number.isNaN(weightNum)) return weight;
    
    // Weight is stored in kg, convert to display unit if needed
    if (unit === 'lbs') {
      return convertWeight(weightNum, 'kg', 'lbs').toFixed(1);
    }
    return weightNum.toFixed(1);
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
 
  const convertWeight = (value: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs') => {
    if (fromUnit === toUnit) return value;
    if (fromUnit === 'kg' && toUnit === 'lbs') return value * 2.20462;
    if (fromUnit === 'lbs' && toUnit === 'kg') return value / 2.20462;
    return value;
  };

  const getDisplayWeight = () => {
    return getWeightInCurrentUnit();
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
                await supabase
                  .from('profiles')
                  .update({ weight_unit_preference: selectedUnit })
                  .eq('id', user.id);
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
    const adjustedDelta = unit === 'lbs' ? delta * 2.20462 : delta; // Scale delta for lbs
    const next = Math.max(0, currentInUnit + adjustedDelta);
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

  const handlePickImage = async (type: 'front' | 'back') => {
    const existingPhoto = type === 'front' ? currentEntry?.front_photo : currentEntry?.back_photo;
    if (existingPhoto) {
      Alert.alert(
        'Replace Photo?',
        'Uploading a new photo will replace the existing one. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => pickImageForType(type) },
        ]
      );
    } else {
      pickImageForType(type);
    }
  };

  const pickImageForType = async (type: 'front' | 'back') => {
    try {
      const imageUri = await pickImage('library');
      if (imageUri) {
        if (type === 'front') {
          setFrontPhotoUri(imageUri);
        } else {
          setBackPhotoUri(imageUri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleTakePhoto = async (type: 'front' | 'back') => {
    const existingPhoto = type === 'front' ? currentEntry?.front_photo : currentEntry?.back_photo;
    if (existingPhoto) {
      Alert.alert(
        'Replace Photo?',
        'Taking a new photo will replace the existing one. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => takePhotoForType(type) },
        ]
      );
    } else {
      takePhotoForType(type);
    }
  };

  const takePhotoForType = async (type: 'front' | 'back') => {
    try {
      const imageUri = await pickImage('camera');
      if (imageUri) {
        if (type === 'front') {
          setFrontPhotoUri(imageUri);
        } else {
          setBackPhotoUri(imageUri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const showPhotoOptions = (type: 'front' | 'back') => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Camera', onPress: () => handleTakePhoto(type) },
        { text: 'Photo Library', onPress: () => handlePickImage(type) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderPhotoSelector = (type: 'front' | 'back') => {
    const newUri = type === 'front' ? frontPhotoUri : backPhotoUri;
    const photo = type === 'front' ? currentEntry?.front_photo : currentEntry?.back_photo;
    
    // If we have a new photo URI, show that
    if (newUri) {
      return (
        <View style={styles.calendarPhotoContainer}>
          <Text style={styles.calendarPhotoLabel}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
          <TouchableOpacity style={styles.calendarPhotoPlaceholder} onPress={() => handlePickImage(type)}>
            <SafeImage 
              sourceUrl={newUri} 
              style={styles.calendarPreviewImage}
              quality={1.0}
              maxWidth={2400}
              maxHeight={3200}
            />
          </TouchableOpacity>
        </View>
      );
    }
    
    // If we have a saved photo, use the local URI directly (no longer stored in Supabase)
    if (photo && photo.storage_path) {
      return (
        <View style={styles.calendarPhotoContainer}>
          <Text style={styles.calendarPhotoLabel}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
          <TouchableOpacity style={styles.calendarPhotoPlaceholder} onPress={() => handlePickImage(type)}>
            <SafeImage 
              sourceUrl={photo.storage_path} 
              style={styles.calendarPreviewImage}
              quality={1.0}
              maxWidth={2400}
              maxHeight={3200}
            />
          </TouchableOpacity>
        </View>
      );
    }
    
    // No photo available
    return (
      <View style={styles.calendarPhotoContainer}>
        <Text style={styles.calendarPhotoLabel}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
        <TouchableOpacity style={styles.calendarPhotoPlaceholder} onPress={() => showPhotoOptions(type)}>
          <View style={styles.photoPlaceholderContent}>
            <Icon name={type === 'front' ? 'human-handsup' : 'human-handsdown'} size={40} color={colors.primary} />
            <Text style={styles.photoPlaceholderText}>Tap to add photo</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
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

      // Create or update progress entry with photos
      if (frontPhotoUri || backPhotoUri) {
        await ProgressService.createOrUpdateProgressEntry(
          user.id,
          selectedDate,
          weight && !isWeightInvalid ? (unit === 'lbs' ? convertWeight(weightNum, 'lbs', 'kg') : weightNum) : null,
          frontPhotoUri || undefined,
          backPhotoUri || undefined
        );
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
  const canSavePhotos = frontPhotoUri || backPhotoUri;
  const canSave = canSaveWeight || canSavePhotos;

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

  const handleSavePhotos = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      return;
    }

    if (!canSavePhotos) {
      Alert.alert('No photos', 'Please select at least one photo to save.');
      return;
    }

    setIsSaving(true);
    
    try {
      await ProgressService.createOrUpdateProgressEntry(
        user.id,
        selectedDate,
        null, // No weight in photos-only save
        frontPhotoUri || undefined,
        backPhotoUri || undefined
      );

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
      console.error('Error saving photos:', error);
      Alert.alert('Error', 'Failed to save photos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.7)', 
            'rgba(18,18,18,0.85)', 
            'rgba(18,18,18,0.95)', 
            '#121212'
          ]}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Header */}
      <Animated.View style={[
        styles.header,
        { 
          paddingTop: insets.top + 16,
          opacity: slideAnim,
          transform: [{ translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, 0]
          })}]
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Progress</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 64}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          contentInset={{ bottom: insets.bottom }}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Section Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeSection === 'weight' && styles.activeTab]}
              onPress={() => setActiveSection('weight')}
              activeOpacity={0.7}
            >
              <Icon 
                name="scale-bathroom" 
                size={20} 
                color={activeSection === 'weight' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.tabText, activeSection === 'weight' && styles.activeTabText]}>
                Weight
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeSection === 'photos' && styles.activeTab]}
              onPress={() => setActiveSection('photos')}
              activeOpacity={0.7}
            >
              <Icon 
                name="camera" 
                size={20} 
                color={activeSection === 'photos' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.tabText, activeSection === 'photos' && styles.activeTabText]}>
                Photos
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weight Section */}
          {activeSection === 'weight' && (
            <Animated.View style={[styles.section, { opacity: slideAnim }]}>
              <View style={styles.sectionHeader}>
                <Icon name="scale-bathroom" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Log Weight</Text>
              </View>

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
            </Animated.View>
          )}

          {/* Photos Section */}
          {activeSection === 'photos' && (
            <Animated.View style={[styles.section, { opacity: slideAnim }]}>
              <View style={styles.sectionHeader}>
                <Icon name="camera" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Body Photos</Text>
              </View>

              <View style={styles.photosContainer}>
                {/* Privacy Notice */}
                <ProgressPhotoPrivacyNotice variant="compact" />

                {/* Calendar */}
                <Calendar
                  onDayPress={handleDayPress}
                  markedDates={markedDates}
                  markingType={'custom'}
                  theme={{
                    calendarBackground: 'transparent',
                    dayTextColor: colors.text,
                    monthTextColor: colors.text,
                    selectedDayBackgroundColor: colors.primary,
                    todayTextColor: colors.primary,
                    arrowColor: colors.primary,
                    textDayFontSize: 16,
                    textMonthFontSize: 18,
                    textDayHeaderFontSize: 14,
                    textSectionTitleColor: colors.text,
                    selectedDayTextColor: colors.text,
                    todayBackgroundColor: 'transparent',
                    dotColor: colors.primary,
                    selectedDotColor: colors.text,
                    disabledArrowColor: colors.textSecondary,
                    indicatorColor: colors.primary,
                    textDayFontWeight: '400',
                    textMonthFontWeight: '600',
                    textDayHeaderFontWeight: '500',
                  }}
                  style={styles.calendar}
                />

                {/* Photo Grid for Selected Date */}
                <View style={styles.calendarPhotoGrid}>
                  {renderPhotoSelector('front')}
                  {renderPhotoSelector('back')}
                </View>
              </View>

              {/* Photos Save Button */}
              <TouchableOpacity 
                style={[
                  styles.sectionSaveButton,
                  !canSavePhotos && styles.saveButtonDisabled
                ]}
                onPress={handleSavePhotos}
                disabled={!canSavePhotos || isSaving}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={canSavePhotos ? [colors.primary, colors.primaryDark] : [colors.textSecondary, colors.textSecondary]}
                  style={styles.saveButtonGradient}
                >
                  {isSaving ? (
                    <ActivityIndicator color={colors.text} size="small" />
                  ) : (
                    <>
                      <Icon name="check" size={20} color={colors.text} />
                      <Text style={styles.saveButtonText}>Save Photos</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unit Selection Dialog */}
      {showUnitSelectionDialog && (
        <View style={styles.modalOverlay}>
          <View style={styles.unitSelectionModal}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.modalGradient}
            >
              <Text style={styles.modalTitle}>Choose Your Weight Unit</Text>
              <Text style={styles.modalSubtitle}>
                This will be your default unit for all future weight logging
              </Text>
              
              <View style={styles.unitOptions}>
                <TouchableOpacity 
                  style={styles.unitOption}
                  onPress={() => selectUnit('kg')}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.unitOptionGradient}
                  >
                    <Text style={styles.unitOptionText}>Kilograms (kg)</Text>
                    <Text style={styles.unitOptionSubtext}>Metric system</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.unitOption}
                  onPress={() => selectUnit('lbs')}
                >
                  <LinearGradient
                    colors={[colors.secondary, colors.secondaryDark]}
                    style={styles.unitOptionGradient}
                  >
                    <Text style={styles.unitOptionText}>Pounds (lbs)</Text>
                    <Text style={styles.unitOptionSubtext}>Imperial system</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowUnitSelectionDialog(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </LinearGradient>
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
    backgroundColor: colors.background,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeTabText: {
    color: colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  weightContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  weightInput: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photosContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  calendar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary + '30',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  unitSelectionModal: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    borderRadius: 12,
    overflow: 'hidden',
  },
  unitOptionGradient: {
    padding: 16,
    alignItems: 'center',
  },
  unitOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  unitOptionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});


