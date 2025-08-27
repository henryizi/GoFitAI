import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Button, Card, Chip, ActivityIndicator, Portal, Modal, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../styles/colors';
import { ProgressService } from '../../services/progressService';
import { Database } from '../../types/database';
import { supabase } from '../../services/supabase/client';
import { SafeImage } from '../ui/SafeImage';

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

interface BeforeAfterComparisonProps {
  userId: string;
  onPhotoUpload?: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function BeforeAfterComparison({ userId, onPhotoUpload }: BeforeAfterComparisonProps) {
  const insets = useSafeAreaInsets();
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [selectedView, setSelectedView] = useState<'front' | 'back'>('front');
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'timeline' | 'beforeAfter'>('beforeAfter');
  const [beforeIndex, setBeforeIndex] = useState<number>(0);
  const [afterIndex, setAfterIndex] = useState<number>(0);
  const [openSelector, setOpenSelector] = useState<null | 'before' | 'after'>(null);
  const isCompactLayout = screenWidth < 420;

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

  // Keep valid default indices whenever the view or data changes
  useEffect(() => {
    if (photoEntriesForView.length === 0) {
      setBeforeIndex(0);
      setAfterIndex(0);
      return;
    }
    setBeforeIndex(0);
    setAfterIndex(Math.max(photoEntriesForView.length - 1, 0));
  }, [photoEntriesForView.length]);

  // Selected entries for comparison (based on indices)
  const beforeEntry = useMemo(() => photoEntriesForView[beforeIndex], [photoEntriesForView, beforeIndex]);
  const afterEntry = useMemo(() => photoEntriesForView[afterIndex], [photoEntriesForView, afterIndex]);

  // Check if we have enough photos for comparison
  const hasBeforeAfterPhotos = useMemo(() => {
    if (comparisonMode === 'beforeAfter') {
      return (
        Boolean(beforeEntry) &&
        Boolean(afterEntry) &&
        beforeIndex < afterIndex
      );
    }
    return sortedEntries.length >= 2;
  }, [beforeEntry, afterEntry, beforeIndex, afterIndex, sortedEntries, comparisonMode]);

  useEffect(() => {
    if (userId) {
      loadProgressEntries();
    }
  }, [userId]);

  const loadProgressEntries = async () => {
    setIsLoading(true);
    try {
      const entries = await ProgressService.getProgressEntries(userId);
      setProgressEntries(entries);
    } catch (error) {
      console.error('Failed to load progress entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPhotoUrl = (photo: BodyPhoto | null) => {
    if (!photo?.storage_path || !supabase) return null;
    const publicUrlResult = supabase.storage.from('body-photos').getPublicUrl(photo.storage_path);
    return publicUrlResult.data.publicUrl;
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
      <View style={styles.comparisonContainer}>
        <View style={styles.photoRow}>
          {/* Before Photo */}
          <View style={styles.photoColumn}>
            <Card style={styles.photoCard}>
              <Card.Content style={[styles.photoContent, styles.photoContentRelative]}>
                {beforePhoto ? (
                  <SafeImage 
                    sourceUrl={getPhotoUrl(beforePhoto) || ''} 
                    style={styles.comparisonImage}
                  />
                ) : (
                  <View style={styles.noPhotoPlaceholder}>
                    <Icon name="image-off" size={48} color={colors.textSecondary} />
                    <Text style={styles.noPhotoText}>No {selectedView} photo</Text>
                  </View>
                )}
                <View style={styles.overlayBadgeContainer}>
                  <View style={[styles.overlayBadge]}>
                    <Text style={styles.badgeText}>BEFORE</Text>
                  </View>
                  <View style={styles.overlayDate}>
                    <Icon name="calendar" size={14} color={colors.text} />
                    <Text style={styles.overlayDateText}>{beforeEntry?.date}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerIconWrapper}>
              <Icon name={isCompactLayout ? 'arrow-down' : 'arrow-right'} size={18} color="#FFFFFF" />
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* After Photo */}
          <View style={styles.photoColumn}>
            <Card style={styles.photoCard}>
              <Card.Content style={[styles.photoContent, styles.photoContentRelative]}>
                {afterPhoto ? (
                  <SafeImage 
                    sourceUrl={getPhotoUrl(afterPhoto) || ''} 
                    style={styles.comparisonImage}
                  />
                ) : (
                  <View style={styles.noPhotoPlaceholder}>
                    <Icon name="image-off" size={48} color={colors.textSecondary} />
                    <Text style={styles.noPhotoText}>No {selectedView} photo</Text>
                  </View>
                )}
                <View style={styles.overlayBadgeContainer}>
                  <View style={[styles.overlayBadge]}>
                    <Text style={styles.badgeText}>AFTER</Text>
                  </View>
                  <View style={styles.overlayDate}>
                    <Icon name="calendar" size={14} color={colors.text} />
                    <Text style={styles.overlayDateText}>{afterEntry?.date}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Date selectors (moved below photos for above-the-fold comparison) */}
        <View style={styles.dateSelectorRow}>
          <View style={styles.dateSelectorItem}>
            <IconButton
              icon="chevron-left"
              size={18}
              onPress={() => setBeforeIndex(Math.max(0, beforeIndex - 1))}
              disabled={beforeIndex <= 0}
              style={styles.iconButtonCompact}
            />
            <Chip
              icon="calendar"
              style={styles.dateChip}
              textStyle={styles.dateChipText}
              onPress={() => setOpenSelector('before')}
            >
              <Text style={styles.dateChipText}>Before: {beforeEntry?.date || '—'}</Text>
            </Chip>
            <IconButton
              icon="chevron-right"
              size={18}
              onPress={() => setBeforeIndex(Math.min(afterIndex - 1, beforeIndex + 1))}
              disabled={beforeIndex >= afterIndex - 1}
              style={styles.iconButtonCompact}
            />
          </View>
          <View style={styles.dateSelectorItem}>
            <IconButton
              icon="chevron-left"
              size={18}
              onPress={() => setAfterIndex(Math.max(beforeIndex + 1, afterIndex - 1))}
              disabled={afterIndex <= beforeIndex + 1}
              style={styles.iconButtonCompact}
            />
            <Chip
              icon="calendar"
              style={styles.dateChip}
              textStyle={styles.dateChipText}
              onPress={() => setOpenSelector('after')}
            >
              <Text style={styles.dateChipText}>After: {afterEntry?.date || '—'}</Text>
            </Chip>
            <IconButton
              icon="chevron-right"
              size={18}
              onPress={() => setAfterIndex(Math.min(photoEntriesForView.length - 1, afterIndex + 1))}
              disabled={afterIndex >= photoEntriesForView.length - 1}
              style={styles.iconButtonCompact}
            />
          </View>
        </View>

        {/* Progress Summary */}
        {renderProgressSummary()}
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
          const isFirst = index === 0;
          const isLast = index === sortedEntries.length - 1;
          
          return (
            <View key={entry.id} style={styles.timelineItem}>
              <Text style={styles.timelineDate}>{entry.date}</Text>
              <Card style={[styles.timelinePhotoCard, isFirst && styles.firstPhoto, isLast && styles.lastPhoto]}>
                <Card.Content style={styles.timelinePhotoContent}>
                  {photo ? (
                    <SafeImage 
                      sourceUrl={getPhotoUrl(photo) || ''} 
                      style={styles.timelineImage}
                    />
                  ) : (
                    <View style={styles.timelineNoPhoto}>
                      <Icon name="image-off" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                </Card.Content>
              </Card>
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

    const weightChange = (afterEntry.weight_kg || 0) - (beforeEntry.weight_kg || 0);
    const daysBetween = Math.ceil(
      (new Date(afterEntry.date).getTime() - new Date(beforeEntry.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.summaryTitle}>Progress Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Icon name="calendar" size={16} color={colors.primary} />
              <Text style={styles.summaryLabel}>Duration</Text>
              <Text style={styles.summaryValue}>{daysBetween} days</Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon name="scale-bathroom" size={16} color={colors.primary} />
              <Text style={styles.summaryLabel}>Weight Change</Text>
              <Text style={[
                styles.summaryValue, 
                weightChange > 0 ? styles.weightGain : weightChange < 0 ? styles.weightLoss : styles.weightNeutral
              ]}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Icon name="camera" size={16} color={colors.primary} />
              <Text style={styles.summaryLabel}>Photos</Text>
              <Text style={styles.summaryValue}>{sortedEntries.length}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderNoPhotosMessage = () => {
    // Check if we have exactly 1 photo
    const hasOnePhoto = sortedEntries.length === 1;
    
    return (
      <View style={styles.noPhotosContainer}>
        <Icon name="camera-plus" size={64} color={colors.textSecondary} />
        <Text style={styles.noPhotosTitle}>
          {hasOnePhoto ? "One Photo Uploaded" : "No Photos Yet"}
        </Text>
        <Text style={styles.noPhotosSubtitle}>
          {hasOnePhoto 
            ? "Upload at least 2 photos to compare your progress"
            : "Upload your first photos to start tracking your progress"
          }
        </Text>
        <Button
          mode="contained"
          onPress={onPhotoUpload}
          style={styles.uploadButton}
          icon="camera"
        >
          <Text>{hasOnePhoto ? "Add Another Photo" : "Upload Photos"}</Text>
        </Button>
      </View>
    );
  };

  const renderViewToggle = () => (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        onPress={() => setSelectedView('front')}
        style={[styles.segment, selectedView === 'front' && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, selectedView === 'front' && styles.segmentTextActive]}>Front</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setSelectedView('back')}
        style={[styles.segment, selectedView === 'back' && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, selectedView === 'back' && styles.segmentTextActive]}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderComparisonModeToggle = () => (
    <View style={styles.segmentContainer}>
      <TouchableOpacity
        onPress={() => setComparisonMode('beforeAfter')}
        style={[styles.segment, comparisonMode === 'beforeAfter' && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, comparisonMode === 'beforeAfter' && styles.segmentTextActive]}>Before/After</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setComparisonMode('timeline')}
        style={[styles.segment, comparisonMode === 'timeline' && styles.segmentActive]}
      >
        <Text style={[styles.segmentText, comparisonMode === 'timeline' && styles.segmentTextActive]}>Timeline</Text>
      </TouchableOpacity>
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

  return (
    <ScrollView 
      style={[styles.container, { 
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24 
      }]}
      showsVerticalScrollIndicator={false}
    >


      {/* Compact controls card */}
      <Card style={styles.controlsCard}>
        <Card.Content>
          <View style={styles.controlsRowWrap}>
            {renderComparisonModeToggle()}
            {renderViewToggle()}
          </View>
          {comparisonMode === 'beforeAfter' && (
            <Text style={styles.compareHint}>Comparing {beforeEntry?.date || '—'} → {afterEntry?.date || '—'}</Text>
          )}
        </Card.Content>
      </Card>
      
      {renderPhotoComparison()}

      {/* Date selection modal */}
      <Portal>
        <Modal visible={openSelector !== null} onDismiss={() => setOpenSelector(null)} contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>{openSelector === 'before' ? 'Select Before Date' : 'Select After Date'}</Text>
          <ScrollView style={styles.modalList}>
            {photoEntriesForView.map((entry, index) => {
              const isDisabled = openSelector === 'before' ? index >= afterIndex : index <= beforeIndex;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[styles.modalItem, isDisabled && styles.modalItemDisabled]}
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
                  <Text style={styles.modalItemText}>{entry.date}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Button mode="text" onPress={() => setOpenSelector(null)}>
            <Text>Close</Text>
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 3,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    marginHorizontal: 1,
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  comparisonContainer: {
    paddingHorizontal: 20,
  },
  controlsCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 20,
    backgroundColor: colors.card,
    elevation: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlsRowWrap: {
    gap: 12,
  },
  compareHint: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    paddingVertical: 20,
    paddingHorizontal: 20,
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
  },
  dateSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 15,
    position: 'relative',
    elevation: 2,
    flex: 1,
    maxWidth: '48%',
    justifyContent: 'center',
  },
  dateChip: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    minHeight: 40,
    paddingVertical: 6,
    paddingHorizontal: 8,
    zIndex: 20,
    elevation: 3,
    flexShrink: 1,
    maxWidth: '100%',
  },
  dateChipText: {
    color: colors.primary,
    fontWeight: '600',
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
    gap: 8,
  },
  photoRowStack: {
    flexDirection: 'column',
  },
  photoColumn: {
    width: '42%',
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
  },
  photoCardFull: {
    width: screenWidth - 40,
  },
  photoContent: {
    padding: 0,
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
    height: 280,
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
    right: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  overlayDateText: {
    color: '#FFFFFF',
    fontSize: 12,
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
  summaryCard: {
    backgroundColor: colors.surface,
    marginTop: 8,
    marginBottom: 20,
    zIndex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  weightGain: {
    color: colors.success,
  },
  weightLoss: {
    color: colors.error,
  },
  weightNeutral: {
    color: colors.textSecondary,
  },
  timelineContainer: {
    paddingHorizontal: 20,
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
    width: 120,
    backgroundColor: 'transparent',
    elevation: 0,
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
  timelineImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  timelineNoPhoto: {
    width: '100%',
    height: 160,
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
    padding: 40,
  },
  noPhotosTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noPhotosSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  uploadButton: {
    backgroundColor: colors.primary,
  },
  modalContent: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 300,
    marginBottom: 8,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalItemDisabled: {
    opacity: 0.4,
  },
  modalItemText: {
    color: colors.text,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
});
