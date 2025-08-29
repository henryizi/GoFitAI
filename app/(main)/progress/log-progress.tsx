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
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { usePhotoUpload } from '../../../src/hooks/usePhotoUpload';
import { BlurView } from 'expo-blur';
import { supabase } from '../../../src/services/supabase/client';
import { SafeImage } from '../../../src/components/ui/SafeImage';

const { width } = Dimensions.get('window');

export default function LogProgressScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Weight state
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
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

  // Fetch progress entries for calendar
  useEffect(() => {
    if (user) {
      ProgressService.getProgressEntries(user.id).then((entries: any) => {
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

  const weightNum = weight ? parseFloat(weight) : NaN;
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



  const renderPhotoSelector = (type: 'front' | 'back') => {
    const newUri = type === 'front' ? frontPhotoUri : backPhotoUri;
    const photo = type === 'front' ? currentEntry?.front_photo : currentEntry?.back_photo;
    
    // If we have a new photo URI, show that
    if (newUri) {
      return (
        <View style={styles.calendarPhotoContainer}>
          <Text style={styles.calendarPhotoLabel}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
          <TouchableOpacity style={styles.calendarPhotoPlaceholder} onPress={() => handlePickImage(type)}>
            <SafeImage sourceUrl={newUri} style={styles.calendarPreviewImage} />
          </TouchableOpacity>
        </View>
      );
    }
    
    // If we have a saved photo with storage_path, get the public URL
    if (photo && photo.storage_path && supabase) {
      const publicUrlResult = supabase.storage.from('body-photos').getPublicUrl(photo.storage_path);
      const photoUrl = publicUrlResult.data.publicUrl;
      
      return (
        <View style={styles.calendarPhotoContainer}>
          <Text style={styles.calendarPhotoLabel}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
          <TouchableOpacity style={styles.calendarPhotoPlaceholder} onPress={() => handlePickImage(type)}>
            <SafeImage sourceUrl={photoUrl} style={styles.calendarPreviewImage} />
          </TouchableOpacity>
        </View>
      );
    }
    
    // No photo available
    return (
      <View style={styles.calendarPhotoContainer}>
        <Text style={styles.calendarPhotoLabel}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
        <TouchableOpacity style={styles.calendarPhotoPlaceholder} onPress={() => handlePickImage(type)}>
          <View style={styles.photoActions}>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => handleTakePhoto(type)}
              activeOpacity={0.7}
            >
              <Icon name="camera" size={16} color={colors.white} />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.photoButton}
              onPress={() => handlePickImage(type)}
              activeOpacity={0.7}
            >
              <Icon name="image" size={16} color={colors.white} />
              <Text style={styles.photoButtonText}>Choose</Text>
            </TouchableOpacity>
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
        const updatedEntries = await ProgressService.getProgressEntries(user.id);
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

  const canSave = (weight && !isWeightInvalid) || frontPhotoUri || backPhotoUri;

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
          <Icon name="chevron-left" size={24} color={colors.white} />
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
                    <TouchableOpacity 
                      style={styles.unitToggle}
                      onPress={() => setUnit(unit === 'kg' ? 'lbs' : 'kg')}
                    >
                      <Text style={styles.unitText}>{unit.toUpperCase()}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.weightAdjuster}>
                  <TouchableOpacity 
                    style={styles.adjustButton}
                    onPress={() => adjustWeight(-0.5)}
                    activeOpacity={0.7}
                  >
                    <Icon name="minus" size={24} color={colors.white} />
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.weightInput}
                    value={weight}
                    onChangeText={handleWeightChange}
                    placeholder="Enter weight"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  
                  <TouchableOpacity 
                    style={styles.adjustButton}
                    onPress={() => adjustWeight(0.5)}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={24} color={colors.white} />
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
            </Animated.View>
          )}

          {/* Photos Section */}
          {activeSection === 'photos' && (
            <Animated.View style={[styles.section, { opacity: slideAnim }]}>
              <View style={styles.sectionHeader}>
                <Icon name="camera" size={24} color={colors.primary} />
                <Text style={styles.sectionTitle}>Body Photos</Text>
              </View>

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
                  selectedDayTextColor: colors.white,
                  todayBackgroundColor: 'transparent',
                  dotColor: colors.primary,
                  selectedDotColor: colors.white,
                  disabledArrowColor: colors.textSecondary,
                  monthTextColor: colors.text,
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
            </Animated.View>
          )}

          {/* Save Button */}
          <TouchableOpacity 
            style={[
              styles.saveButton,
              !canSave && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!canSave || isSaving}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canSave ? [colors.primary, colors.primaryDark] : [colors.textSecondary, colors.textSecondary]}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Icon name="check" size={20} color={colors.white} />
                  <Text style={styles.saveButtonText}>Save Progress</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: colors.dark,
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
    color: colors.white,
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
    color: colors.white,
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
    color: colors.white,
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
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
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
    color: colors.white,
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
    color: colors.white,
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
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  photoButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
    color: colors.white,
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
    color: colors.white,
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
    color: colors.white,
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
    color: colors.white,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  calendarPreviewImage: {
    width: 140,
    height: 200,
    borderRadius: 12,
  },
});


