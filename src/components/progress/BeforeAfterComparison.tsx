import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Pressable, Alert, Image, Text, ActivityIndicator, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Portal } from 'react-native-paper';

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import ViewShot from 'react-native-view-shot';
import { ProgressService } from '../../services/progressService';
import { Database } from '../../types/database';
import { supabase } from '../../services/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
import { ImageOptimizer } from '../../services/storage/imageOptimizer';
import HealthDisclaimer from '../legal/HealthDisclaimer';
import ContentSafetyWarning from '../legal/ContentSafetyWarning';

// Modern design colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  background: '#000000',
  surface: '#1C1C1E',
  card: 'rgba(28, 28, 30, 0.8)',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  border: 'rgba(84, 84, 88, 0.6)',
  success: '#34C759',
  white: '#FFFFFF',
};

type BodyPhoto = Database['public']['Tables']['body_photos']['Row'];

// Extend the database type to include joined photo data
type ProgressEntryWithPhotos = Database['public']['Tables']['progress_entries']['Row'] & {
  front_photo?: BodyPhoto | null;
  back_photo?: BodyPhoto | null;
};

interface BeforeAfterComparisonProps {
  userId: string;
  onPhotoUpload?: () => void;
  showScrollView?: boolean; // New prop to control whether to render ScrollView
  refreshControl?: React.ReactElement<any>; // Optional refresh control
  onScroll?: (event: any) => void; // Optional scroll event handler
  scrollEventThrottle?: number; // Optional scroll throttle
  headerComponent?: React.ReactElement; // Optional header component to render above content
}

const { width: screenWidth } = Dimensions.get('window');

export default function BeforeAfterComparison({ 
  userId, 
  onPhotoUpload, 
  showScrollView = true, 
  refreshControl, 
  onScroll, 
  scrollEventThrottle, 
  headerComponent 
}: BeforeAfterComparisonProps) {

  const [progressEntries, setProgressEntries] = useState<ProgressEntryWithPhotos[]>([]);
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front');
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'timeline' | 'beforeAfter'>('beforeAfter');
  const [beforeIndex, setBeforeIndex] = useState<number>(0);
  const [afterIndex, setAfterIndex] = useState<number>(0);
  const [openSelector, setOpenSelector] = useState<null | 'before' | 'after'>(null);
  const [showContentWarning, setShowContentWarning] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const [imageDimensions, setImageDimensions] = useState<Record<string, { width: number; height: number }>>({});


  // Get progress entries and sort by date
  const sortedEntries = useMemo(() => {
    return progressEntries
      .filter(entry => entry.front_photo || entry.back_photo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [progressEntries]);

  // Filter entries that actually have a photo for the selected view
  const photoEntriesForView = useMemo(() => {
    return sortedEntries.filter(entry =>
      selectedView === 'front' ? Boolean(entry.front_photo) : Boolean(entry.back_photo)
    );
  }, [sortedEntries, selectedView]);

  const loadProgressEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await ProgressService.getProgressPhotos(userId) as ProgressEntryWithPhotos[];
      console.log('loadProgressEntries - Loaded entries:', entries);
      console.log('Entries with photos:', entries.filter(entry => entry.front_photo || entry.back_photo));
      setProgressEntries(entries);
      
      // Load image dimensions for timeline display
      const dimensions: Record<string, { width: number; height: number }> = {};
      for (const entry of entries) {
        const frontPhoto = entry.front_photo?.storage_path;
        const backPhoto = entry.back_photo?.storage_path;
        
        if (frontPhoto) {
          try {
            const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
              Image.getSize(frontPhoto, (width, height) => resolve({ width, height }), reject);
            });
            dimensions[`${entry.id}-front`] = { width, height };
          } catch (error) {
            console.warn('Failed to get front photo dimensions:', error);
          }
        }
        
        if (backPhoto) {
          try {
            const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
              Image.getSize(backPhoto, (width, height) => resolve({ width, height }), reject);
            });
            dimensions[`${entry.id}-back`] = { width, height };
          } catch (error) {
            console.warn('Failed to get back photo dimensions:', error);
          }
        }
      }
      setImageDimensions(dimensions);
    } catch (error) {
      console.error('Failed to load progress entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Keep valid default indices whenever the view or data changes
  useEffect(() => {
    if (photoEntriesForView.length === 0) {
      setBeforeIndex(0);
      setAfterIndex(0);
      return;
    }
    if (photoEntriesForView.length === 1) {
      setBeforeIndex(0);
      setAfterIndex(0);
      return;
    }
    // Ensure we have at least 2 different entries for comparison
    setBeforeIndex(0);
    setAfterIndex(Math.max(photoEntriesForView.length - 1, 1));
  }, [photoEntriesForView.length, selectedView]);

  // Selected entries for comparison (based on indices)
  const beforeEntry = useMemo(() => photoEntriesForView[beforeIndex], [photoEntriesForView, beforeIndex]);
  const afterEntry = useMemo(() => photoEntriesForView[afterIndex], [photoEntriesForView, afterIndex]);

  // Check if we have enough photos for comparison
  const hasBeforeAfterPhotos = useMemo(() => {
    if (comparisonMode === 'beforeAfter') {
      // More robust check: ensure we have valid entries and they're different
      return (
        Boolean(beforeEntry) &&
        Boolean(afterEntry) &&
        beforeEntry.id !== afterEntry.id &&
        photoEntriesForView.length >= 2
      );
    }
    return sortedEntries.length >= 2;
  }, [beforeEntry, afterEntry, photoEntriesForView.length, sortedEntries.length, comparisonMode]);

  useEffect(() => {
    if (userId) {
      loadProgressEntries();
    }
  }, [userId, loadProgressEntries]);

  // Preload images for better performance
  useEffect(() => {
    const preloadImages = async () => {
      if (sortedEntries.length > 0) {
        const imageUris = sortedEntries
          .flatMap(entry => [
            entry.front_photo?.storage_path,
            entry.back_photo?.storage_path
          ])
          .filter(Boolean) as string[];
        
        // Preload first few images
        const priorityUris = imageUris.slice(0, 6); // Preload first 6 images
        
        console.log('🚀 Preloading', priorityUris.length, 'priority images...');
        await ImageOptimizer.preloadImages(priorityUris, {
          maxWidth: 2400, // Increased to preserve high-res photos
          maxHeight: 3200, // Increased to preserve high-res photos
          quality: 1.0, // Maximum quality for best photo display
          enableCache: true
        });
        console.log('✅ Priority images preloaded');
      }
    };

    if (sortedEntries.length > 0) {
      // Delay preloading to not interfere with initial render
      setTimeout(preloadImages, 1000);
    }
  }, [sortedEntries]);


  const generateProgressFilename = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Create filename based on comparison type and view
    const viewType = selectedView === 'front' ? 'Front' : 'Back';
    const comparisonType = comparisonMode === 'beforeAfter' ? 'BeforeAfter' : 'Timeline';
    
    return `GoFitAI-Progress-${comparisonType}-${viewType}-${dateStr}.png`;
  };

  const handleShareProgress = async () => {
    console.log('[BeforeAfterComparison] Share Progress button pressed');
    console.log('hasBeforeAfterPhotos:', hasBeforeAfterPhotos);
    console.log('viewShotRef.current exists:', !!viewShotRef.current);
    console.log('showContentWarning before:', showContentWarning);
    
    // Check if we have enough photos first
    if (!hasBeforeAfterPhotos) {
      console.log('Not enough photos for sharing');
      Alert.alert(
        'Not enough photos', 
        'You need at least 2 different progress photos to share a comparison. Please upload more photos first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check ViewShot ref with a small retry mechanism
    if (!viewShotRef.current) {
      console.log('ViewShot ref not available, retrying...');
      setTimeout(() => {
        if (!viewShotRef.current) {
          console.log('ViewShot ref still not available after retry');
          Alert.alert('Error', 'Unable to capture progress view. Please try again.');
          return;
        }
        console.log('ViewShot ref available after retry, showing modal');
        setShowContentWarning(true);
      }, 100);
      return;
    }
    
    // Show content safety warning first
    console.log('Setting showContentWarning to true');
    setShowContentWarning(true);
    console.log('showContentWarning after:', true);
  };

  const proceedWithSharing = async () => {
    setShowContentWarning(false);
    setIsSharing(true);
    
    if (!viewShotRef.current || !hasBeforeAfterPhotos) {
      setIsSharing(false);
      Alert.alert('Error', 'Unable to capture progress view. Please try again.');
      return;
    }
    
    try {
      // Wait for images to load and layout to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Debug: Log photo information
      const beforePhoto = selectedView === 'front' ? beforeEntry?.front_photo : beforeEntry?.back_photo;
      const afterPhoto = selectedView === 'front' ? afterEntry?.front_photo : afterEntry?.back_photo;
      
      console.log('About to capture ViewShot...');
      console.log('Before photo:', beforePhoto);
      console.log('After photo:', afterPhoto);
      console.log('Before photo URL:', beforePhoto?.storage_path);
      console.log('After photo URL:', afterPhoto?.storage_path);
      
      // Capture the comparison view
      const uri = await viewShotRef.current.capture();
      console.log('ViewShot captured:', uri);
      
      const filename = generateProgressFilename();
      
      // Create a copy with the proper filename in the document directory
      const documentDirectory = FileSystem.documentDirectory || '';
      const newUri = `${documentDirectory}${filename}`;
      
      // Copy the file with the new name
      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });
      
      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Your Progress',
          UTI: 'public.png'
        });
        
        // Clean up the temporary files after sharing
        try {
          await FileSystem.deleteAsync(newUri, { idempotent: true });
          if (uri !== newUri) {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          }
        } catch (cleanupError) {
          console.log('[BeforeAfterComparison] Cleanup warning:', cleanupError);
        }
        
        // Show success message (you could add a toast notification here)
        console.log('Progress shared successfully!');
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Failed to share progress:', error);
      Alert.alert('Error', `Failed to share progress: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSharing(false);
    }
  };

  const cancelSharing = () => {
    console.log('[BeforeAfterComparison] Cancelling sharing, setting showContentWarning to false');
    setShowContentWarning(false);
  };


  const renderPhotoComparison = () => {
    if (comparisonMode === 'beforeAfter') {
      return renderBeforeAfterComparison();
    } else {
      return renderTimelineComparison();
    }
  };

  const renderBeforeAfterComparison = () => {
    if (!hasBeforeAfterPhotos) {
      return renderNoPhotosMessage();
    }

    const beforePhoto = selectedView === 'front' ? beforeEntry?.front_photo : beforeEntry?.back_photo;
    const afterPhoto = selectedView === 'front' ? afterEntry?.front_photo : afterEntry?.back_photo;

    return (
      <View>
        {/* Main App Layout - Side by Side */}
        <View style={styles.comparisonContainer}>
          {/* Before Photo - Left */}
          <TouchableOpacity 
            style={styles.photoColumn} 
            onPress={() => setOpenSelector('before')}
            activeOpacity={0.9}
          >
            <View style={styles.photoFrame}>
              {beforePhoto ? (
                <Image 
                  source={{ uri: beforePhoto.storage_path }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.noPhotoPlaceholder}>
                  <Icon name="image-off" size={32} color={colors.textSecondary} />
                </View>
              )}
              
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              <View style={styles.photoHeader}>
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>BEFORE</Text>
                </View>
              </View>

              <View style={styles.photoFooter}>
                <Icon name="calendar" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.dateText}>{beforeEntry?.date}</Text>
                <Icon name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>

          {/* After Photo - Right */}
          <TouchableOpacity 
            style={styles.photoColumn} 
            onPress={() => setOpenSelector('after')}
            activeOpacity={0.9}
          >
            <View style={styles.photoFrame}>
              {afterPhoto ? (
                <Image 
                  source={{ uri: afterPhoto.storage_path }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.noPhotoPlaceholder}>
                  <Icon name="image-off" size={32} color={colors.textSecondary} />
                </View>
              )}
              
              <LinearGradient
                colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
                style={StyleSheet.absoluteFillObject}
                pointerEvents="none"
              />

              <View style={styles.photoHeader}>
                <View style={[styles.badgeContainer, styles.badgeContainerActive]}>
                  <Text style={[styles.badgeText, styles.badgeTextActive]}>AFTER</Text>
                </View>
              </View>

              <View style={styles.photoFooter}>
                <Icon name="calendar" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.dateText}>{afterEntry?.date}</Text>
                <Icon name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Progress Summary */}
        {renderProgressSummary()}

        {/* Hidden ViewShot for Sharing - Full Screen Before/After Layout */}
        <ViewShot ref={viewShotRef} style={styles.shareViewShotContainer} options={{ format: 'png', quality: 0.9 }}>
          <View style={styles.shareLayoutContainer}>
            {/* GoFitAI Header - positioned on top of the shared photo */}
            <View style={styles.shareHeader}>
              <View style={styles.shareHeaderLine} />
              <Text style={styles.shareAppName}>GoFit<Text style={{ color: '#FF6B35' }}>AI</Text></Text>
              <View style={styles.shareHeaderLine} />
            </View>
            
            {/* Before Photo - Top Half */}
            <View style={styles.sharePhotoContainer}>
              {beforePhoto ? (
                <Image 
                  source={{ uri: beforePhoto.storage_path }} 
                  style={styles.shareImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.shareNoPhotoPlaceholder}>
                  <Icon name="image-off" size={48} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.shareNoPhotoText}>No {selectedView} photo</Text>
                </View>
              )}
              <View style={styles.shareOverlayBadge}>
                <Text style={styles.shareBadgeText}>BEFORE</Text>
              </View>
              <View style={styles.shareDateOverlay}>
                <Icon name="calendar" size={18} color="#FFFFFF" />
                <Text style={styles.shareDateText}>{beforeEntry?.date}</Text>
              </View>
            </View>
            
            {/* After Photo - Bottom Half */}
            <View style={styles.sharePhotoContainer}>
              {afterPhoto ? (
                <Image 
                  source={{ uri: afterPhoto.storage_path }} 
                  style={styles.shareImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.shareNoPhotoPlaceholder}>
                  <Icon name="image-off" size={48} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.shareNoPhotoText}>No {selectedView} photo</Text>
                </View>
              )}
              <View style={styles.shareOverlayBadge}>
                <Text style={styles.shareBadgeText}>AFTER</Text>
              </View>
              <View style={styles.shareDateOverlay}>
                <Icon name="calendar" size={18} color="#FFFFFF" />
                <Text style={styles.shareDateText}>{afterEntry?.date}</Text>
              </View>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  };

  const renderTimelineComparison = () => {
    if (sortedEntries.length < 2) {
      return renderNoPhotosMessage();
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineContainer}
      >
        {sortedEntries.map((entry, index) => {
          const photo = selectedView === 'front' ? entry.front_photo : entry.back_photo;
          
          return (
            <View key={entry.id} style={styles.timelineItem}>
              <Text style={styles.timelineDate}>{entry.date}</Text>
              <View style={styles.timelinePhotoCard}>
                <View style={styles.timelinePhotoContent}>
                  <View style={styles.timelineImageContainer}>
                    {photo ? (
                      <Image 
                        source={{ uri: photo.storage_path }} 
                        style={styles.timelineImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.timelineNoPhoto}>
                        <Icon name="image-off" size={32} color={colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.timelineLabelOverlay}>
                      <Text style={styles.timelineLabelText}>{selectedView.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {index < sortedEntries.length - 1 && (
                <View style={styles.timelineArrow}>
                  <Icon name="arrow-right" size={16} color={colors.primary} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderProgressSummary = () => {
    if (!beforeEntry || !afterEntry) return null;

    const daysBetween = Math.ceil(
      (new Date(afterEntry.date).getTime() - new Date(beforeEntry.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate weight change if available
    const weightChange = beforeEntry.weight_kg && afterEntry.weight_kg
      ? afterEntry.weight_kg - beforeEntry.weight_kg
      : null;
    
    // Calculate body fat change if available
    const bodyFatChange = beforeEntry.body_fat_percentage && afterEntry.body_fat_percentage
      ? afterEntry.body_fat_percentage - beforeEntry.body_fat_percentage
      : null;

    const weeksBetween = Math.floor(daysBetween / 7);
    const monthsBetween = Math.floor(daysBetween / 30);

    return (
      <View style={styles.summaryCardContainer}>
        <LinearGradient
          colors={[
            'rgba(255, 107, 53, 0.15)',
            'rgba(255, 107, 53, 0.08)',
            'rgba(255, 255, 255, 0.05)'
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCardGradient}
        >
          {/* Header */}
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderIconContainer}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.summaryHeaderIcon}
              >
                <Icon name="chart-line-variant" size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.summaryHeaderText}>
          <Text style={styles.summaryTitle}>Progress Summary</Text>
              <Text style={styles.summarySubtitle}>Your transformation journey</Text>
            </View>
            </View>

          {/* Stats Grid */}
          <View style={styles.summaryStatsGrid}>
            {/* Duration Card */}
            <View style={styles.summaryStatCard}>
              <View style={styles.summaryStatIconContainer}>
                <LinearGradient
                  colors={['rgba(255, 107, 53, 0.2)', 'rgba(255, 107, 53, 0.1)']}
                  style={styles.summaryStatIconBg}
                >
                  <Icon name="calendar-clock" size={20} color={colors.primary} />
                </LinearGradient>
              </View>
              <Text style={styles.summaryStatValue}>
                {daysBetween}
              </Text>
              <Text style={styles.summaryStatLabel}>Days</Text>
              {(weeksBetween > 0 || monthsBetween > 0) && (
                <Text style={styles.summaryStatSubtext}>
                  {monthsBetween > 0 ? `${monthsBetween}mo` : ''}
                  {monthsBetween > 0 && weeksBetween % 4 > 0 ? ' ' : ''}
                  {weeksBetween % 4 > 0 ? `${weeksBetween % 4}w` : ''}
                </Text>
              )}
          </View>
          
            {/* Photos Card */}
            <View style={styles.summaryStatCard}>
              <View style={styles.summaryStatIconContainer}>
                <LinearGradient
                  colors={['rgba(255, 107, 53, 0.2)', 'rgba(255, 107, 53, 0.1)']}
                  style={styles.summaryStatIconBg}
                >
                  <Icon name="image-multiple" size={20} color={colors.primary} />
                </LinearGradient>
              </View>
              <Text style={styles.summaryStatValue}>
                {sortedEntries.length}
              </Text>
              <Text style={styles.summaryStatLabel}>Photos</Text>
              <Text style={styles.summaryStatSubtext}>
                {photoEntriesForView.length} {selectedView}
              </Text>
            </View>

            {/* Weight Change Card (if available) */}
            {weightChange !== null && (
              <View style={styles.summaryStatCard}>
                <View style={styles.summaryStatIconContainer}>
                  <LinearGradient
                    colors={[
                      weightChange < 0 
                        ? 'rgba(52, 199, 89, 0.2)' 
                        : 'rgba(255, 107, 53, 0.2)',
                      weightChange < 0 
                        ? 'rgba(52, 199, 89, 0.1)' 
                        : 'rgba(255, 107, 53, 0.1)'
                    ]}
                    style={styles.summaryStatIconBg}
                  >
                    <Icon 
                      name={weightChange < 0 ? "trending-down" : "trending-up"} 
                      size={20} 
                      color={weightChange < 0 ? colors.success : colors.primary} 
                    />
                  </LinearGradient>
                </View>
                <Text style={[
                  styles.summaryStatValue,
                  weightChange < 0 && styles.summaryStatValuePositive
                ]}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                </Text>
                <Text style={styles.summaryStatLabel}>kg</Text>
                <Text style={styles.summaryStatSubtext}>Weight</Text>
              </View>
            )}

            {/* Body Fat Change Card (if available) */}
            {bodyFatChange !== null && (
              <View style={styles.summaryStatCard}>
                <View style={styles.summaryStatIconContainer}>
                  <LinearGradient
                    colors={[
                      bodyFatChange < 0 
                        ? 'rgba(52, 199, 89, 0.2)' 
                        : 'rgba(255, 107, 53, 0.2)',
                      bodyFatChange < 0 
                        ? 'rgba(52, 199, 89, 0.1)' 
                        : 'rgba(255, 107, 53, 0.1)'
                    ]}
                    style={styles.summaryStatIconBg}
                  >
                    <Icon 
                      name={bodyFatChange < 0 ? "trending-down" : "trending-up"} 
                      size={20} 
                      color={bodyFatChange < 0 ? colors.success : colors.primary} 
                    />
                  </LinearGradient>
                </View>
                <Text style={[
                  styles.summaryStatValue,
                  bodyFatChange < 0 && styles.summaryStatValuePositive
                ]}>
                  {bodyFatChange > 0 ? '+' : ''}{bodyFatChange.toFixed(1)}%
                </Text>
                <Text style={styles.summaryStatLabel}>Body Fat</Text>
                <Text style={styles.summaryStatSubtext}>Change</Text>
              </View>
            )}
          </View>

          {/* Date Range Footer */}
          <View style={styles.summaryFooter}>
            <View style={styles.summaryDateRange}>
              <View style={styles.summaryDateItem}>
                <Icon name="calendar-start" size={14} color={colors.textSecondary} />
                <Text style={styles.summaryDateText}>{beforeEntry.date}</Text>
              </View>
              <Icon name="arrow-right" size={16} color={colors.primary} style={{ marginHorizontal: 12 }} />
              <View style={styles.summaryDateItem}>
                <Icon name="calendar-end" size={14} color={colors.textSecondary} />
                <Text style={styles.summaryDateText}>{afterEntry.date}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderNoPhotosMessage = () => {
    // Check if we have exactly 1 photo
    const hasOnePhoto = sortedEntries.length === 1;
    
    return (
      <View style={styles.noPhotosContainer}>
        <View style={styles.noPhotosIconContainer}>
          <Icon name="camera-plus" size={48} color={colors.primary} />
        </View>
        <Text style={styles.noPhotosTitle}>
          {hasOnePhoto ? "One Photo Uploaded" : "No Photos Yet"}
        </Text>
        <Text style={styles.noPhotosSubtitle}>
          {hasOnePhoto 
            ? "Upload at least 2 photos to compare your progress"
            : "Upload your first photos to start tracking your progress"
          }
        </Text>
        <TouchableOpacity
          onPress={onPhotoUpload}
          style={styles.uploadButton}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.uploadButtonGradient}
          >
            <Icon name="camera" size={18} color={colors.white} />
            <Text style={styles.uploadButtonText}>
              {hasOnePhoto ? "Add Another Photo" : "Upload Photos"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const renderControls = () => (
    <View style={styles.controlsCard}>
      <View style={styles.controlsRow}>
        {/* View Selector (Front/Back) */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            onPress={() => setSelectedView('front')}
            style={[styles.viewToggleItem, selectedView === 'front' && styles.viewToggleItemActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewToggleText, selectedView === 'front' && styles.viewToggleTextActive]}>Front</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedView('back')}
            style={[styles.viewToggleItem, selectedView === 'back' && styles.viewToggleItemActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.viewToggleText, selectedView === 'back' && styles.viewToggleTextActive]}>Back</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Selector (Icons) */}
        <View style={styles.modeToggleContainer}>
           <TouchableOpacity
            onPress={() => setComparisonMode('beforeAfter')}
            style={[styles.modeIconBtn, comparisonMode === 'beforeAfter' && styles.modeIconBtnActive]}
            activeOpacity={0.8}
          >
            <Icon name="compare" size={20} color={comparisonMode === 'beforeAfter' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
           <TouchableOpacity
            onPress={() => setComparisonMode('timeline')}
            style={[styles.modeIconBtn, comparisonMode === 'timeline' && styles.modeIconBtnActive]}
            activeOpacity={0.8}
          >
            <Icon name="timeline-clock-outline" size={20} color={comparisonMode === 'timeline' ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {comparisonMode === 'beforeAfter' && beforeEntry && afterEntry && (
        <View style={{ paddingBottom: 12, alignItems: 'center' }}>
           <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
             Comparing <Text style={{ color: colors.text, fontWeight: 'bold' }}>{beforeEntry.date}</Text> vs <Text style={{ color: colors.text, fontWeight: 'bold' }}>{afterEntry.date}</Text>
           </Text>
        </View>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading progress...</Text>
      </View>
    );
  }

  const contentComponent = (
    <>
      {/* Optional header component */}
      {headerComponent}

      {/* Controls */}
      {renderControls()}

      {/* Photo Comparison */}
      {renderPhotoComparison()}

      {/* Health Disclaimer - Moved to bottom */}
      <HealthDisclaimer 
        variant="compact" 
        title="Progress Photo Disclaimer"
        showAcceptButton={false}
      />
    </>
  );

  return (
    <>
    <View style={styles.container}>
      {/* Main content */}
      {showScrollView ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {contentComponent}
        </ScrollView>
      ) : (
        <View style={styles.scrollContent}>
          {contentComponent}
        </View>
      )}

      {/* Date selection modal - moved outside ScrollView */}
      <Modal
        visible={openSelector !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenSelector(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOpenSelector(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{openSelector === 'before' ? 'Select Before Date' : 'Select After Date'}</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {photoEntriesForView.map((entry, index) => {
                const isDisabled = openSelector === 'before' ? index >= afterIndex : index <= beforeIndex;
                const isSelected = openSelector === 'before' ? index === beforeIndex : index === afterIndex;
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.modalItem, 
                      isDisabled && styles.modalItemDisabled,
                      isSelected && styles.modalItemSelected
                    ]}
                    disabled={isDisabled}
                    onPress={() => {
                      if (openSelector === 'before') {
                        setBeforeIndex(index);
                        if (index >= afterIndex) {
                          setAfterIndex(Math.min(index + 1, photoEntriesForView.length - 1));
                        }
                      } else if (openSelector === 'after') {
                        setAfterIndex(index);
                        if (index <= beforeIndex) {
                          setBeforeIndex(Math.max(index - 1, 0));
                        }
                      }
                      setOpenSelector(null);
                    }}
                  >
                    <Icon 
                      name="calendar" 
                      size={16} 
                      color={isSelected ? colors.primary : colors.textSecondary} 
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{entry.date}</Text>
                    {isSelected && <Icon name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setOpenSelector(null)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Debug info */}
      {console.log('[BeforeAfterComparison] Render - showContentWarning:', showContentWarning)}
      
      {/* Loading overlay for sharing */}
      {isSharing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Preparing your progress...</Text>
          </View>
        </View>
      )}
    </View>
    
    {/* Content Safety Warning Modal - Rendered outside main container */}
    <Portal>
      {showContentWarning && (
        <ContentSafetyWarning
          onProceed={proceedWithSharing}
          onCancel={cancelSharing}
          variant="sharing"
        />
      )}
    </Portal>
    </>
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
  scrollContent: {
    paddingBottom: 120, // Increased to account for bottom tab bar (60px + safe area + extra margin)
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  viewToggleItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewToggleItemActive: {
    backgroundColor: colors.primary,
  },
  viewToggleText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  viewToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  modeIconBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeIconBtnActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  controlsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  photoFrame: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoHeader: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeContainerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  photoFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    paddingVertical: 24,
    paddingHorizontal: 8,
    backgroundColor: colors.background,
    zIndex: 50,
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxWidth: '100%',
    overflow: 'hidden',
    gap: 12,
  },
  dateSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    maxWidth: '48%',
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateSelectorItemPressed: {
    backgroundColor: colors.primary,
    transform: [{ scale: 0.98 }],
    elevation: 2,
  },
  dateButtonIcon: {
    marginRight: 8,
  },
  dateChip: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    zIndex: 20,
    elevation: 3,
    flexShrink: 1,
    maxWidth: '100%',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderRadius: 24,
  },
  dateChipText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    flexShrink: 1,
    maxWidth: '100%',
  },
  iconButtonCompact: {
    margin: 0,
    minWidth: 32,
    minHeight: 32,
    width: 32,
    height: 32,
    zIndex: 20,
    elevation: 3,
    flexShrink: 0,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 2,
  },
  photoRowStack: {
    flexDirection: 'column',
  },
  photoColumn: {
    flex: 1,
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  photoDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  photoCard: {
    width: (screenWidth - 64) / 2,
    backgroundColor: colors.card,
    elevation: 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'visible',
  },
  photoCardFull: {
    width: screenWidth - 40,
  },
  photoContent: {
    padding: 0,
    overflow: 'visible',
  },
  photoContentRelative: {
    position: 'relative',
  },
  comparisonImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  comparisonImageLarge: {
    height: 360,
  },
  noPhotoPlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderStyle: 'dashed',
  },
  overlayBadgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  overlayDate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  overlayDateText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16%',
  },
  dividerLine: {
    height: 1,
    backgroundColor: colors.border,
    flex: 1,
  },
  dividerIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  noPhotoText: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  progressArrow: {
    marginHorizontal: 16,
  },
  arrowGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCardContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryCardGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryHeaderIconContainer: {
    marginRight: 12,
  },
  summaryHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  summaryHeaderText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  summaryStatCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  summaryStatIconContainer: {
    marginBottom: 12,
  },
  summaryStatIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  summaryStatValuePositive: {
    color: colors.success,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryStatSubtext: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryFooter: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryDateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryDateText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 36,
    marginTop: 28,
    marginBottom: 12,
    marginHorizontal: 8,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ scale: 1 }],
    overflow: 'hidden',
  },
  shareButtonPressed: {
    transform: [{ scale: 0.95 }],
    shadowOpacity: 0.6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  shareButtonIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  shareButtonGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    zIndex: -1,
  },
  shareButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
  },
  appWatermark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
  },
  appWatermarkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  timelineContainer: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  timelineItem: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  timelinePhotoCard: {
    width: (screenWidth - 16) * 0.49, // Same width calculation as before/after comparison photos (49% of container width)
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  firstPhoto: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  lastPhoto: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  timelinePhotoContent: {
    padding: 0,
  },
  timelineImageContainer: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
  },
  timelineImage: {
    width: '100%',
    height: 240, // Same height as before/after comparison photos
    borderRadius: 16,
  },
  timelineLabelOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timelineLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timelineNoPhoto: {
    width: '100%',
    height: 240, // Same height as before/after comparison photos
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  timelineArrow: {
    marginTop: 8,
  },
  noPhotosContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  noPhotosIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noPhotosTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  noPhotosSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  uploadButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalItemSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  modalItemDisabled: {
    opacity: 0.4,
  },
  modalItemText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  modalItemTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    marginTop: 4,
  },
  modalCloseButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownIcon: {
    marginLeft: 4,
  },

  // Loading Overlay Styles
  loadingOverlay: {
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

  // Sharing Layout Styles
  shareViewShotContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 400,
    height: 500,
    backgroundColor: 'transparent',
    opacity: 0,
    zIndex: -1,
    pointerEvents: 'none',
  },
  shareLayoutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    overflow: 'hidden',
    width: 400,
    height: 500,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  shareHeaderGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.primary,
    zIndex: 1,
  },
  shareHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  shareHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shareAppName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginHorizontal: 8,
  },
  brandingContainer: {
    position: 'relative',
    zIndex: 2,
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandingTextGo: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  brandingTextFit: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  brandingTextAI: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  brandingUnderline: {
    width: 80,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  shareContentContainer: {
    position: 'relative',
    zIndex: 2,
    paddingHorizontal: 0,
    paddingBottom: 0,
    flex: 1,
  },
  sharePhotoContainer: {
    position: 'relative',
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
  },
  shareImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  shareOverlayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shareBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shareDateOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  shareDateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  shareArrowContainer: {
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 8,
  },
  shareArrowText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  shareNoPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
    borderStyle: 'dashed',
  },
  shareNoPhotoText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },

  photoContainer: {
    width: '49.5%',
    alignItems: 'center',
  },
  photoImageContainer: {
    position: 'relative',
    width: '100%',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  photoLabelOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoLabelOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  photoLabelMainText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoDateMainText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },

  shareCard: {
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    elevation: 2,
  },
});
