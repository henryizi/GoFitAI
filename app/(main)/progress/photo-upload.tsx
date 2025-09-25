import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  Image
} from 'react-native';
import { Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';

import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import { usePhotoUpload } from '../../../src/hooks/usePhotoUpload';
import { ProgressService } from '../../../src/services/progressService';
import ProgressPhotoPrivacyNotice from '../../../src/components/legal/ProgressPhotoPrivacyNotice';
import { SafeImage } from '../../../src/components/ui/SafeImage';

const { width } = Dimensions.get('window');

export default function PhotoUploadScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string }>();
  
  // Photo state
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(params.date || new Date().toISOString().split('T')[0]);
  const [progressEntries, setProgressEntries] = useState<any[]>([]);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const showSuccessAlert = () => {
    setShowSuccessAnimation(true);
    successOpacity.setValue(0);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      })
    ]).start();

    setTimeout(() => {
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setShowSuccessAnimation(false);
      });
    }, 2000);
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const markedDates = React.useMemo(() => {
    const marked: any = {};
    
    // Mark today
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

    // Mark selected date
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

    // Mark dates with progress entries
    progressEntries.forEach((entry: any) => {
      const date = entry.metric_date;
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
            <SafeImage sourceUrl={photoUri} style={styles.photoPreview} />
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
      // Use the ProgressService to save photos locally and create progress entry
      const result = await ProgressService.createOrUpdateProgressEntry(
        user.id,
        selectedDate,
        null, // no weight data
        frontPhotoUri ?? undefined,
        backPhotoUri ?? undefined
      );

      if (result) {
        // Clear form
        setFrontPhotoUri(null);
        setBackPhotoUri(null);

        // Refresh progress entries
        ProgressService.getProgressPhotos(user.id).then((entries: any) => {
          setProgressEntries(entries);
        });

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
        <Text style={styles.headerTitle}>Upload Photos</Text>
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
          <Animated.View style={[styles.section, { opacity: slideAnim }]}>
            <View style={styles.sectionHeader}>
              <Icon name="camera" size={24} color={colors.primary} />
              <Text style={styles.sectionTitle}>Progress Photos</Text>
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

            {/* Save Button */}
            <TouchableOpacity 
              style={[
                styles.saveButton,
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
    backgroundColor: colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  photosContainer: {
    marginBottom: 24,
  },
  calendar: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  calendarPhotoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
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
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
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
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  successBlur: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 40,
    paddingVertical: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  successText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
}); 