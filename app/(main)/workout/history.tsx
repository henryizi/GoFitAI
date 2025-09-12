import React, { useCallback, useEffect, useState } from 'react';
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl, 
  Dimensions,
  Image,
  Animated,
  Alert
} from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutHistoryService, CompletedSessionListItem } from '../../../src/services/workout/WorkoutHistoryService';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MotiView } from 'moti';


// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Premium dark theme colors
const colors = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryDark: '#E55A2B',
  primaryGradient: ['#FF6B35', '#FF8F65'] as const,
  primaryAlpha: 'rgba(255, 107, 53, 0.15)',
  secondaryAlpha: 'rgba(255, 143, 101, 0.1)',
  background: '#121212',
  backgroundDark: '#0A0A0A',
  backgroundGradient: ['#000000', '#121212'] as const,
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  surfaceGradient: ['rgba(28, 28, 30, 0.8)', 'rgba(44, 44, 46, 0.9)'] as const,
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  border: 'rgba(84, 84, 88, 0.6)',
  borderLight: 'rgba(84, 84, 88, 0.3)',
  borderLighter: 'rgba(84, 84, 88, 0.15)',
  shadow: '#000000',
  success: '#34C759',
  warning: '#FFCC00',
  error: '#FF3B30',
  info: '#5AC8FA',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassStrong: 'rgba(255, 255, 255, 0.1)',
  cardGradient: ['rgba(28, 28, 30, 0.7)', 'rgba(44, 44, 46, 0.8)'] as const,
  cardGlow: 'rgba(255, 107, 53, 0.1)',
};

export default function WorkoutHistoryListScreen() {
  const { user } = useAuth();
  const { refresh } = useLocalSearchParams<{ refresh?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<CompletedSessionListItem[]>([]);
  const [deletingSessions, setDeletingSessions] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();
  const scrollY = new Animated.Value(0);
  
  // Header animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  
  const headerScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0.97, 1],
    extrapolate: 'clamp'
  });

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    console.log('[WorkoutHistory] Loading workout history for user:', user.id);
    console.log('[WorkoutHistory] User object:', JSON.stringify(user, null, 2));
    try {
      const data = await WorkoutHistoryService.getCompletedSessions(user.id);
      console.log('[WorkoutHistory] Loaded sessions:', data.length);
      console.log('[WorkoutHistory] Session data:', JSON.stringify(data, null, 2));
      setSessions(data);
    } catch (error) {
      console.error('[WorkoutHistory] Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log('[WorkoutHistory] Refreshing workout history');
      const data = await WorkoutHistoryService.getCompletedSessions(user?.id || '');
      console.log('[WorkoutHistory] Refreshed sessions:', data.length);
      console.log('[WorkoutHistory] Refreshed session data:', JSON.stringify(data, null, 2));
      setSessions(data);
    } catch (error) {
      console.error('[WorkoutHistory] Error refreshing sessions:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

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
        <LinearGradient
          colors={colors.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        <MotiView
          from={{ opacity: 0.5, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          style={styles.loadingContent}
        >
          <Icon 
            name="dumbbell" 
            size={80} 
            color={colors.primary} 
            style={styles.loadingLogo}
          />
          <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Loading workout history...</Text>
        </MotiView>
      </View>
    );
  }

  // Empty state
  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar style="light" />
        <LinearGradient
          colors={colors.backgroundGradient}
          style={StyleSheet.absoluteFill}
        />
        
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 800 }}
          style={styles.emptyContent}
        >
          <View style={styles.emptyIconContainer}>
            <Icon name="history" size={60} color={colors.primary} style={styles.emptyIcon} />
            <View style={styles.emptyIconGlow} />
          </View>
          
          <Text style={styles.emptyTitle}>No Workout History</Text>
          <Text style={styles.emptyText}>Complete workouts to see your history here</Text>
          
          <View style={styles.emptyButtonsContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                console.log('[WorkoutHistory] Empty state back button pressed - navigating to workout plans');
                router.push('/(main)/workout/plans');
              }}
            >
              <LinearGradient
                colors={colors.primaryGradient}
                style={styles.backButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.backButtonText}>Back to Workouts</Text>
              </LinearGradient>
            </TouchableOpacity>
            

          </View>
        </MotiView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background gradient & image */}
      <LinearGradient
        colors={colors.backgroundGradient}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={{uri: 'https://images.unsplash.com/photo-1580086319619-3ed498161c77?q=80&w=2069&auto=format&fit=crop'}}
        style={styles.backgroundImage}
        blurRadius={3}
      />
      <View style={styles.backgroundOverlay} />
      
      {/* Floating Header Background with Blur */}
      <Animated.View 
        style={[
          styles.headerBackground,
          { 
            opacity: headerOpacity, 
            transform: [{ scale: headerScale }],
            paddingTop: insets.top
          }
        ]}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.headerBackgroundGradient} />
      </Animated.View>
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => {
            console.log('[WorkoutHistory] Back button pressed - navigating to workout plans');
            router.push('/(main)/workout/plans');
          }} 
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout History</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Sessions list */}
      <Animated.FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ 
              type: 'timing', 
              duration: 600, 
              delay: index * 100 
            }}
            style={styles.sessionCardContainer}
          >
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(main)/workout/history-session/[sessionId]', params: { sessionId: item.id } })}
              style={styles.sessionCard}
              activeOpacity={0.8}
            >
              <BlurView intensity={10} tint="dark" style={styles.sessionCardBlur}>
                <LinearGradient
                  colors={colors.cardGradient}
                  style={styles.sessionCardGradient}
                >
                  <View style={styles.sessionCardContent}>
                    <View style={styles.sessionIconSection}>
                      <View style={styles.sessionIconContainer}>
                        <LinearGradient
                          colors={['rgba(255,107,53,0.2)', 'rgba(255,107,53,0.1)']}
                          style={styles.sessionIconGradient}
          >
                          <Icon 
                            name={getExerciseTypeIcon(item.split_name)} 
                            size={20} 
                            color={colors.primary} 
                          />
                        </LinearGradient>
                      </View>
                    </View>
                    
                    <View style={styles.sessionTextContent}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {item.session_name || item.split_name || item.plan_name || `Week ${item.week_number || '-'} Day ${item.day_number || '-'}`}
                      </Text>
                      <Text style={styles.sessionDate}>
                        {formatDate(item.completed_at)}
                      </Text>
                      
                      <View style={styles.sessionMetaRow}>
                        <View style={styles.sessionMetaItem}>
                          <Icon name="calendar-week" size={14} color={colors.primary} />
                          <Text style={styles.sessionMetaText}>
                            Week {item.week_number ?? '-'}
                          </Text>
                        </View>
                        <View style={styles.sessionMetaItem}>
                          <Icon name="calendar-today" size={14} color={colors.primary} />
                          <Text style={styles.sessionMetaText}>
                            Day {item.day_number ?? '-'}
                          </Text>
                        </View>
                        {item.split_name && (
                          <View style={styles.sessionMetaItem}>
                            <Icon name="dumbbell" size={14} color={colors.primary} />
                            <Text style={styles.sessionMetaText}>
                              Workout
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Exercise and Set Counts */}
                      <View style={styles.sessionStatsRow}>
                        {item.total_exercises != null && item.total_exercises > 0 ? (
                          <View style={styles.sessionStatItem}>
                            <Icon name="fitness-center" size={14} color={colors.textSecondary} />
                            <Text style={styles.sessionStatText}>
                              {item.total_exercises} {item.total_exercises === 1 ? 'Exercise' : 'Exercises'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.sessionStatItem}>
                            <Icon name="fitness-center" size={14} color={colors.textSecondary} />
                            <Text style={styles.sessionStatText}>
                              No exercises
                            </Text>
                          </View>
                        )}
                        {item.total_sets != null && item.total_sets > 0 ? (
                          <View style={styles.sessionStatItem}>
                            <Icon name="repeat" size={14} color={colors.textSecondary} />
                            <Text style={styles.sessionStatText}>
                              {item.total_sets} {item.total_sets === 1 ? 'Set' : 'Sets'}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.sessionStatItem}>
                            <Icon name="repeat" size={14} color={colors.textSecondary} />
                            <Text style={styles.sessionStatText}>
                              No sets
                            </Text>
                          </View>
                        )}
                        {item.estimated_calories != null && item.estimated_calories > 0 ? (
                          <View style={styles.sessionStatItem}>
                            <Icon name="local-fire-department" size={14} color={colors.textSecondary} />
                            <Text style={styles.sessionStatText}>
                              {item.estimated_calories} cal
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.sessionStatItem}>
                            <Icon name="local-fire-department" size={14} color={colors.textSecondary} />
                            <Text style={styles.sessionStatText}>
                              No calories
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
                        activeOpacity={0.7}
                        disabled={deletingSessions.has(item.id)}
                      >
                        {deletingSessions.has(item.id) ? (
                          <ActivityIndicator size="small" color={colors.error} />
                        ) : (
                          <Icon 
                            name="delete-outline" 
                            size={20} 
                            color={colors.error}
                          />
                        )}
                      </TouchableOpacity>
                      <View style={styles.sessionArrowContainer}>
                        <Icon 
                          name="chevron-right" 
                          size={20} 
                          color={colors.primary}
                        />
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </BlurView>
          </TouchableOpacity>
          </MotiView>
        )}
      />
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
    height: 300,
    top: 0,
    left: 0,
    opacity: 0.3,
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  headerBackgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLighter,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    zIndex: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sessionCardContainer: {
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  sessionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  sessionCardBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassStrong,
  },
  sessionCardGradient: {
    borderRadius: 16,
  },
  sessionCardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconSection: {
    marginRight: 16,
  },
  sessionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  sessionIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
    borderRadius: 24,
  },
  sessionTextContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: colors.glass,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  sessionMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  sessionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionStatText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
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
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  sessionArrowContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 80,
    height: 80,
    marginBottom: 24,
    opacity: 0.8,
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,107,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    opacity: 0.8,
  },
  emptyIconGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
    maxWidth: '80%',
  },
  emptyButtonsContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
