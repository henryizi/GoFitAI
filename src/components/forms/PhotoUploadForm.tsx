import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, DateData } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../styles/colors';
import { ProgressService } from '../../services/progressService';
import { Database } from '../../types/database';
import { supabase } from '../../services/supabase/client';
import { SafeImage } from '../ui/SafeImage';
import { track as analyticsTrack } from '../../services/analytics/analytics';

type BodyPhoto = Database['public']['Tables']['body_photos']['Row'];

type ProgressEntry = {
    id: string;
    date: string;
    weight_kg: number | null;
    front_photo_id: string | null;
    back_photo_id: string | null;
    front_photo?: BodyPhoto | null;
    back_photo?: BodyPhoto | null;
};

interface PhotoUploadFormProps {
  userId: string;
  initialDate?: string;
}

const PhotoUploadForm: React.FC<PhotoUploadFormProps> = ({ userId, initialDate }) => {
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  
  const currentEntry = useMemo(() => progressEntries.find(e => e.date === selectedDate), [progressEntries, selectedDate]);



  useEffect(() => {
    if (userId) {
      ProgressService.getProgressEntries(userId).then((entries: any) => {
        setProgressEntries(entries);
      });
    }
  }, [userId]);

  // Refresh data when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        ProgressService.getProgressEntries(userId).then((entries: any) => {
          setProgressEntries(entries);
        });
      }
    }, [userId])
  );

  useEffect(() => {
    // Only reset photo URIs when changing dates, not when currentEntry updates
    setFrontPhotoUri(null);
    setBackPhotoUri(null);
  }, [selectedDate]);

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  const markedDates = useMemo(() => {
    const marks: { [date: string]: any } = {};
    progressEntries.forEach(entry => {
      marks[entry.date] = { marked: true, dotColor: colors.primary };
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary, activeOpacity: 0 };
    return marks;
  }, [progressEntries, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  const handlePickImage = (type: 'front' | 'back') => {
    const currentEntry = progressEntries.find(e => e.date === selectedDate);
    const existingPhoto = type === 'front' ? currentEntry?.front_photo : currentEntry?.back_photo;
    if (existingPhoto) {
      Alert.alert(
        'Replace Photo?',
        'Uploading a new photo will replace the existing one. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', onPress: () => pickImage(type) },
        ]
      );
    } else {
      pickImage(type);
    }
  };

  const pickImage = async (type: 'front' | 'back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      if (type === 'front') setFrontPhotoUri(result.assets[0].uri);
      if (type === 'back') setBackPhotoUri(result.assets[0].uri);
    }
  };

  const handleSaveProgress = async () => {
    if (!userId) return;
    const hasFront = !!frontPhotoUri || !!currentEntry?.front_photo_id;
    const hasBack = !!backPhotoUri || !!currentEntry?.back_photo_id;
    analyticsTrack('photo_upload_start', { user_id: userId, date: selectedDate, has_front: hasFront, has_back: hasBack });
    setIsLoading(true);

    try {
      const result = await ProgressService.createOrUpdateProgressEntry(
        userId,
        selectedDate,
        null,
        frontPhotoUri ?? undefined,
        backPhotoUri ?? undefined
      );

      if (result) {
        analyticsTrack('photo_upload_success', { user_id: userId, date: selectedDate, entry_id: result.id, has_front: !!result.front_photo_id, has_back: !!result.back_photo_id });
        
        // Refresh the full data to get the photo objects with storage_path
        ProgressService.getProgressEntries(userId).then((entries: any) => {
          setProgressEntries(entries);
        });
        
        // Clear the temporary photo URIs since they're now saved
        setFrontPhotoUri(null);
        setBackPhotoUri(null);
        
        Alert.alert('Success', 'Progress saved!');
      } else {
        analyticsTrack('photo_upload_failure', { user_id: userId, date: selectedDate, reason: 'result_null' });
        Alert.alert('Error', 'Failed to save progress.');
      }
    } catch (error: any) {
      analyticsTrack('photo_upload_failure', { user_id: userId, date: selectedDate, error: String(error?.message || error) });
      Alert.alert('Error', 'Failed to save progress.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPhotoSelector = (type: 'front' | 'back') => {
    const newUri = type === 'front' ? frontPhotoUri : backPhotoUri;
    const currentEntry = progressEntries.find(e => e.date === selectedDate);
    const photo = type === 'front' ? currentEntry?.front_photo : currentEntry?.back_photo;
    
    // If we have a new photo URI, show that
    if (newUri) {
      return (
        <View style={styles.photoContainer}>
          <Text style={{color: 'white'}}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
          <TouchableOpacity style={styles.photoPlaceholder} onPress={() => handlePickImage(type)}>
            <SafeImage sourceUrl={newUri} style={styles.previewImage} />
          </TouchableOpacity>
        </View>
      );
    }
    
    // If we have a saved photo with storage_path, get the public URL
    if (photo && photo.storage_path && supabase) {
      const publicUrlResult = supabase.storage.from('body-photos').getPublicUrl(photo.storage_path);
      const photoUrl = publicUrlResult.data.publicUrl;
      
      return (
        <View style={styles.photoContainer}>
          <Text style={{color: 'white'}}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
          <TouchableOpacity style={styles.photoPlaceholder} onPress={() => handlePickImage(type)}>
            <SafeImage sourceUrl={photoUrl} style={styles.previewImage} />
          </TouchableOpacity>
        </View>
      );
    }
    
    // No photo available
    return (
      <View style={styles.photoContainer}>
        <Text style={{color: 'white'}}>{type === 'front' ? 'Front Photo' : 'Back Photo'}</Text>
        <TouchableOpacity style={styles.photoPlaceholder} onPress={() => handlePickImage(type)}>
          <IconButton icon="camera-plus" size={32} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={true}
      bounces={true}
      alwaysBounceVertical={false}
    >
        <Calendar
          onDayPress={handleDayPress}
          markedDates={markedDates}
          markingType={'custom'}
          theme={{
            calendarBackground: colors.background,
            dayTextColor: colors.text,
            monthTextColor: colors.text,
            selectedDayBackgroundColor: colors.primary,
            todayTextColor: colors.primary,
            arrowColor: colors.primary,
          }}
          style={styles.calendar}
        />
        <View style={styles.photoGrid}>
          {renderPhotoSelector('front')}
          {renderPhotoSelector('back')}
        </View>
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSaveProgress}
            loading={isLoading}
            disabled={isLoading}
            style={[
              styles.saveButton,
              isLoading && styles.saveButtonLoading
            ]}
            contentStyle={styles.buttonContent}
            labelStyle={[
              styles.buttonLabel,
              isLoading && styles.buttonLabelLoading
            ]}
          >
            {isLoading ? 'Saving Progress...' : 'Save Progress'}
          </Button>
          
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Uploading photos and saving progress...</Text>
            </View>
          )}
        </View>
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16 },
  calendar: { borderBottomWidth: 1, borderColor: colors.border, marginBottom: 16 },
  photoGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  photoContainer: { alignItems: 'center' },
  photoPlaceholder: { width: 150, height: 225, borderRadius: 8, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  previewImage: { width: 150, height: 225, borderRadius: 8 },
  buttonContainer: { 
    marginTop: 16, 
    marginBottom: 32,
    paddingHorizontal: 16 
  },
  saveButton: { 
    width: '100%',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonContent: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  saveButtonLoading: {
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  buttonLabelLoading: {
    color: colors.text,
    fontWeight: '700',
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loadingText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default PhotoUploadForm; 