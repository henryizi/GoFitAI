import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl, 
  Image,
  Alert,
  ScrollView,
  Text,
  Modal,
} from 'react-native';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutHistoryService, CompletedSessionListItem } from '../../../src/services/workout/WorkoutHistoryService';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#FF453A',
};

const WorkoutHistoryListScreen = () => {
  const { user } = useAuth();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<CompletedSessionListItem[]>([]);
  const [allSessions, setAllSessions] = useState<CompletedSessionListItem[]>([]);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deletingSessions, setDeletingSessions] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();

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
    
    message = sessions.length > 0 
      ? `You have ${sessions.length} workout${sessions.length !== 1 ? 's' : ''} in your history.`
      : "Complete workouts to see your history here.";
    
    return { greeting, message };
  }, [sessions.length]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    console.log('[WorkoutHistory] Loading workout history for user:', user.id);
    try {
      const data = await WorkoutHistoryService.getCompletedSessionsWithDetails(user.id);
      console.log('[WorkoutHistory] Loaded sessions:', data.length);
      setAllSessions(data);
      // Apply current filter
      filterSessionsByTimeFrame(data, selectedTimeFrame);
    } catch (error) {
      console.error('[WorkoutHistory] Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedTimeFrame]);

  const filterSessionsByTimeFrame = useCallback((allData: CompletedSessionListItem[], timeFrame: typeof selectedTimeFrame, customDate?: Date) => {
    if (timeFrame === 'all') {
      setSessions(allData);
      return;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const filtered = allData.filter(session => {
      const sessionDate = new Date(session.completed_at);
      const sessionDateOnly = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());
      
      switch (timeFrame) {
        case 'today':
          return sessionDate >= today;
        case 'week':
          return sessionDate >= thisWeek && sessionDate < today;
        case 'month':
          return sessionDate >= thisMonth && sessionDate < thisWeek;
        case 'lastMonth':
          return sessionDate >= lastMonth && sessionDate < thisMonth;
        case 'custom':
          if (customDate) {
            const customDateOnly = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
            return sessionDateOnly.getTime() === customDateOnly.getTime();
          }
          return false;
        default:
          return true;
      }
    });

    setSessions(filtered);
  }, []);

  useEffect(() => {
    if (allSessions.length > 0) {
      filterSessionsByTimeFrame(allSessions, selectedTimeFrame, selectedTimeFrame === 'custom' ? selectedDate : undefined);
    }
  }, [selectedTimeFrame, allSessions, filterSessionsByTimeFrame, selectedDate]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setSelectedTimeFrame('custom');
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('[WorkoutHistory] Refreshing workout history');
      const data = await WorkoutHistoryService.getCompletedSessions(user?.id || '');
      console.log('[WorkoutHistory] Refreshed sessions:', data.length);
      setAllSessions(data);
      filterSessionsByTimeFrame(data, selectedTimeFrame);
    } catch (error) {
      console.error('[WorkoutHistory] Error refreshing sessions:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, selectedTimeFrame, filterSessionsByTimeFrame]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user?.id) return;
    
    Alert.alert(
      'Delete Workout Session',
      'Are you sure you want to delete this workout session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Set loading state for this session
              setDeletingSessions(prev => new Set(prev).add(sessionId));
              
              console.log('[WorkoutHistory] Deleting session:', sessionId);
              const success = await WorkoutHistoryService.deleteSession(sessionId, user.id);
              
              if (success) {
                console.log('[WorkoutHistory] Session deleted successfully');
                // Remove the deleted session from the local state
                setSessions(prev => prev.filter(session => session.id !== sessionId));
                // Show success feedback
                Alert.alert('Success', 'Workout session deleted successfully');
              } else {
                console.error('[WorkoutHistory] Failed to delete session');
                Alert.alert('Error', 'Failed to delete workout session. Please try again.');
              }
            } catch (error) {
              console.error('[WorkoutHistory] Error deleting session:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              // Clear loading state
              setDeletingSessions(prev => {
                const newSet = new Set(prev);
                newSet.delete(sessionId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);
  
  // If refresh param is set, refresh the data
  useEffect(() => {
    if (refresh === 'true') {
      onRefresh();
    }
  }, [refresh, onRefresh]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  
  // Fix the getExerciseTypeIcon function to handle nullable input
  const getExerciseTypeIcon = (splitName?: string | null) => {
    if (!splitName) return 'dumbbell';
    
    const lowerName = splitName.toLowerCase();
    if (lowerName.includes('chest')) return 'pectoralMuscle';
    if (lowerName.includes('back')) return 'human-handsdown';
    if (lowerName.includes('leg')) return 'human-male';
    if (lowerName.includes('shoulder')) return 'arm-flex';
    if (lowerName.includes('arm') || lowerName.includes('bicep') || lowerName.includes('tricep')) return 'arm-flex';
    if (lowerName.includes('abs') || lowerName.includes('core')) return 'stomach';
    if (lowerName.includes('cardio')) return 'run-fast';
    
    return 'dumbbell';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* AI Coach Header */}
      <View style={[styles.coachHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => router.push('/(main)/workout/plans')} 
          style={styles.backButton}
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
      
      {/* Time Frame Selector */}
      <View style={styles.timeFrameSelector}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeFrameSelectorContent}
        >
          {[
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'This Month' },
            { key: 'lastMonth', label: 'Last Month' },
            { key: 'custom', label: selectedTimeFrame === 'custom' ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Pick Date' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.timeFrameButton,
                selectedTimeFrame === option.key && styles.timeFrameButtonActive
              ]}
              onPress={() => {
                if (option.key === 'custom') {
                  setShowDatePicker(true);
                } else {
                  setSelectedTimeFrame(option.key as typeof selectedTimeFrame);
                }
              }}
              activeOpacity={0.8}
            >
              {option.key === 'custom' && (
                <Icon 
                  name="calendar" 
                  size={14} 
                  color={selectedTimeFrame === 'custom' ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text style={[
                styles.timeFrameButtonText,
                selectedTimeFrame === option.key && styles.timeFrameButtonTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Empty State */}
      {sessions.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Icon name="history" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Workout History</Text>
          <Text style={styles.emptyText}>Complete workouts to see your history here</Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/(main)/workout/plans')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Back to Workouts</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sessions list */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 60 + insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(main)/workout/history-session/[sessionId]', params: { sessionId: item.id } })}
            style={styles.sessionCard}
            activeOpacity={0.8}
          >
            <View style={styles.sessionIconContainer}>
              <Icon 
                name={getExerciseTypeIcon(item.split_name)} 
                size={20} 
                color={colors.primary} 
              />
            </View>
            
            <View style={styles.sessionTextContent}>
              <Text style={styles.sessionTitle} numberOfLines={1}>
                {item.session_name || item.split_name || item.plan_name || `Week ${item.week_number || '-'} Day ${item.day_number || '-'}`}
              </Text>
              <Text style={styles.sessionDate}>
                {formatDate(item.completed_at)}
              </Text>
              
              <View style={styles.sessionMetaRow}>
                {item.week_number != null && (
                  <View style={styles.sessionMetaItem}>
                    <Icon name="calendar-week" size={12} color={colors.textSecondary} />
                    <Text style={styles.sessionMetaText}>
                      Week {item.week_number}
                    </Text>
                  </View>
                )}
                {item.day_number != null && (
                  <View style={styles.sessionMetaItem}>
                    <Icon name="calendar-today" size={12} color={colors.textSecondary} />
                    <Text style={styles.sessionMetaText}>
                      Day {item.day_number}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.sessionStatsRow}>
                {item.total_exercises != null && item.total_exercises > 0 && (
                  <View style={styles.sessionStatItem}>
                    <Icon name="dumbbell" size={12} color={colors.textSecondary} />
                    <Text style={styles.sessionStatText}>
                      {String(item.total_exercises).replace(/[?]/g, '')} {item.total_exercises === 1 ? 'Exercise' : 'Exercises'}
                    </Text>
                  </View>
                )}
                {item.total_sets != null && item.total_sets > 0 && (
                  <View style={styles.sessionStatItem}>
                    <Icon name="repeat" size={12} color={colors.textSecondary} />
                    <Text style={styles.sessionStatText}>
                      {String(item.total_sets).replace(/[?]/g, '')} {item.total_sets === 1 ? 'Set' : 'Sets'}
                    </Text>
                  </View>
                )}
                {item.estimated_calories != null && item.estimated_calories > 0 && (
                  <View style={styles.sessionStatItem}>
                    <Icon name="fire" size={12} color={colors.textSecondary} />
                    <Text style={styles.sessionStatText}>
                      {String(item.estimated_calories).replace(/[?]/g, '')} cal
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.sessionActionsContainer}>
              <TouchableOpacity
                onPress={() => deleteSession(item.id)}
                style={[
                  styles.deleteButton,
                  deletingSessions.has(item.id) && styles.deleteButtonDisabled
                ]}
                activeOpacity={0.8}
                disabled={deletingSessions.has(item.id)}
              >
                {deletingSessions.has(item.id) ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Icon 
                    name="delete-outline" 
                    size={18} 
                    color={colors.error}
                  />
                )}
              </TouchableOpacity>
              <Icon 
                name="chevron-right" 
                size={18} 
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.modalCloseButton}
                activeOpacity={0.8}
              >
                <Icon name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
              textColor={colors.text}
              themeVariant="dark"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default WorkoutHistoryListScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
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

  // Time Frame Selector
  timeFrameSelector: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  timeFrameSelectorContent: {
    paddingRight: 20,
    gap: 8,
  },
  timeFrameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginRight: 8,
  },
  timeFrameButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderColor: colors.primary,
  },
  timeFrameButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timeFrameButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  // List Content
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  
  // Session Card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  sessionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionTextContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionStatText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sessionActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
