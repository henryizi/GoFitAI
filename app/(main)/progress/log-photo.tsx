import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../../../src/hooks/useAuth';
import { ProgressService } from '../../../src/services/progressService';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import { SafeImage } from '../../../src/components/ui/SafeImage';
import ProgressPhotoPrivacyNotice from '../../../src/components/legal/ProgressPhotoPrivacyNotice';

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

export default function LogPhotoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Photo state
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

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
    
    message = "Capture your progress photos to track your transformation visually.";
    
    return { greeting, message };
  }, []);

  // Fetch existing progress entries for calendar dots
  const fetchProgressEntries = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const entries = await ProgressService.getProgressPhotos(user.id);
      setProgressEntries(entries);
    } catch (error) {
      console.error('Error fetching progress entries:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProgressEntries();
  }, [fetchProgressEntries]);

  // Clear photos when date changes
  useEffect(() => {
    setFrontPhotoUri(null);
    setBackPhotoUri(null);
  }, [selectedDate]);

  // Calendar marked dates
  const markedDates = useMemo(() => {
    const marked: any = {};
    const today = new Date().toISOString().split('T')[0];
    
    marked[today] = {
      customStyles: {
        container: {
          backgroundColor: colors.primary + '20',
          borderColor: colors.primary,
          borderWidth: 1,
        },
        text: {
          color: colors.primary,
          fontWeight: 'bold',
        },
      },
    };

    if (selectedDate !== today) {
      marked[selectedDate] = {
        customStyles: {
          container: {
            backgroundColor: colors.primary,
          },
          text: {
            color: colors.text,
            fontWeight: 'bold',
          },
        },
      };
    }

    progressEntries.forEach((entry: any) => {
      const date = entry.metric_date || entry.date;
      if (date && date !== selectedDate && date !== today) {
        marked[date] = {
          customStyles: {
            container: {
              backgroundColor: colors.success + '40',
            },
            text: {
              color: colors.text,
            },
          },
        };
      }
    });

    return marked;
  }, [selectedDate, progressEntries]);

  const handleTakePhoto = async (type: 'front' | 'back') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (type === 'front') {
          setFrontPhotoUri(uri);
        } else {
          setBackPhotoUri(uri);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickPhoto = async (type: 'front' | 'back') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (type === 'front') {
          setFrontPhotoUri(uri);
        } else {
          setBackPhotoUri(uri);
        }
      }
    } catch (error) {
      console.error('Error picking photo:', error);
      Alert.alert('Error', 'Failed to pick photo. Please try again.');
    }
  };

  const showPhotoOptions = (type: 'front' | 'back') => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your photo',
      [
        { text: 'Camera', onPress: () => handleTakePhoto(type) },
        { text: 'Photo Library', onPress: () => handlePickPhoto(type) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
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

  const canSavePhotos = frontPhotoUri || backPhotoUri;

  const handleSavePhotos = async () => {
    if (!user) {
      Alert.alert('Not logged in', 'Please log in first.');
      return;
    }

    if (!canSavePhotos) {
      Alert.alert('No photos', 'Please add at least one photo before saving.');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await ProgressService.createOrUpdateProgressEntry(
        user.id,
        selectedDate,
        null,
        frontPhotoUri ?? undefined,
        backPhotoUri ?? undefined
      );

      if (result) {
        setFrontPhotoUri(null);
        setBackPhotoUri(null);
        showSuccessAlert();
      } else {
        throw new Error('Failed to save progress entry');
      }
    } catch (error) {
      console.error('Error saving photos:', error);
      Alert.alert('Error', 'Failed to save photos. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhotoSelector = (type: 'front' | 'back') => {
    const photoUri = type === 'front' ? frontPhotoUri : backPhotoUri;
    const title = type === 'front' ? 'Front Photo' : 'Back Photo';
    const icon = type === 'front' ? 'human-handsup' : 'human-handsdown';

    return (
      <TouchableOpacity 
        style={styles.photoSelector}
        onPress={() => showPhotoOptions(type)}
        activeOpacity={0.7}
      >
        {photoUri ? (
          <View style={styles.photoContainer}>
            <SafeImage 
              sourceUrl={photoUri} 
              style={styles.photoPreview}
              quality={1.0}
              maxWidth={2400}
              maxHeight={3200}
            />
            <View style={styles.photoOverlay}>
              <Icon name="camera" size={24} color={colors.text} />
              <Text style={styles.photoOverlayText}>Tap to change</Text>
            </View>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <LinearGradient
              colors={[colors.primary + '20', colors.primary + '10']}
              style={styles.photoGradient}
            >
              <Icon name={icon} size={40} color={colors.primary} />
              <Text style={styles.photoTitle}>{title}</Text>
              <Text style={styles.photoSubtitle}>Tap to add photo</Text>
            </LinearGradient>
          </View>
        )}
      </TouchableOpacity>
    );
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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 }]}
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

          {/* Photo Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log Progress Photo</Text>

            <View style={styles.photoContent}>
              {/* Calendar */}
              <Calendar
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markedDates={markedDates}
                markingType={'custom'}
                theme={{
                  calendarBackground: 'rgba(255, 255, 255, 0.04)',
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

              {/* Photo Grid */}
              <View style={styles.photoGrid}>
                {renderPhotoSelector('front')}
                {renderPhotoSelector('back')}
              </View>

              {/* Privacy Notice */}
              <ProgressPhotoPrivacyNotice variant="compact" />
            </View>

            {/* Save Button */}
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
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Animation */}
      {showSuccessAnimation && (
        <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
          <BlurView intensity={20} tint="dark" style={styles.successBlur}>
            <Animated.View style={[styles.successContent, { transform: [{ scale: scaleAnim }] }]}>
              <Icon name="check-circle" size={60} color={colors.success} />
              <Text style={styles.successText}>Photos Saved!</Text>
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
  photoContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
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
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  photoSelector: {
    flex: 1,
    aspectRatio: 3/4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoContainer: {
    flex: 1,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  photoOverlayText: {
    color: colors.text,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  photoPlaceholder: {
    flex: 1,
  },
  photoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  photoTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  photoSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
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
});



