import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  FlatList,
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';

const { width } = Dimensions.get('window');

// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
};

interface FoodEntry {
  id: string;
  food_name: string;
  calories: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  timestamp: string;
  date: string;
}

interface DayHistory {
  date: string;
  entries: FoodEntry[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  entryCount: number;
}

export default function FoodHistoryScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [historyData, setHistoryData] = useState<DayHistory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7' | '14' | '30'>('7');

  const userId = user?.id || 'guest';

  const loadFoodHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const days = parseInt(selectedPeriod);
      const historyRange = await NutritionService.getFoodHistoryRange(userId, days);
      
      const processedHistory: DayHistory[] = [];
      
      // Process each date in the history
      for (const [date, entries] of Object.entries(historyRange)) {
        const summary = await NutritionService.getNutritionSummaryForDate(userId, date);
        
        processedHistory.push({
          date,
          entries: entries as FoodEntry[],
          ...summary
        });
      }
      
      // Sort by date (newest first)
      processedHistory.sort((a, b) => b.date.localeCompare(a.date));
      
      setHistoryData(processedHistory);
      console.log(`[FOOD HISTORY] Loaded history for ${processedHistory.length} days`);
    } catch (error) {
      console.error('[FOOD HISTORY] Error loading food history:', error);
      Alert.alert('Error', 'Failed to load food history. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, selectedPeriod]);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadFoodHistory();
    }, [loadFoodHistory])
  );

  // Reload when period changes
  useEffect(() => {
    if (!isLoading) {
      loadFoodHistory();
    }
  }, [selectedPeriod]);

  const handleRefresh = useCallback(() => {
    loadFoodHistory(true);
  }, [loadFoodHistory]);

  const handleDeleteEntry = async (date: string, entryId: string, foodName: string) => {
    Alert.alert(
      'Delete Food Entry',
      `Are you sure you want to delete "${foodName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await NutritionService.deleteFoodEntry(userId, date, entryId);
              if (success) {
                // Reload the history to reflect changes
                loadFoodHistory();
                Alert.alert('Success', 'Food entry deleted successfully.');
              } else {
                Alert.alert('Error', 'Failed to delete food entry.');
              }
            } catch (error) {
              console.error('[FOOD HISTORY] Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete food entry.');
            }
          }
        }
      ]
    );
  };

  const handleReLogEntry = async (entry: FoodEntry) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const entryDate = entry.date || entry.timestamp.split('T')[0];
      
      // Check if it's already today's entry
      if (entryDate === today) {
        Alert.alert('Already Logged', 'This food is already logged for today.');
        return;
      }

      // Log the food entry to today's date
      await NutritionService.logFoodEntry(userId, {
        food_name: entry.food_name,
        calories: entry.calories,
        protein_grams: entry.protein_grams,
        carbs_grams: entry.carbs_grams,
        fat_grams: entry.fat_grams,
      });

      Alert.alert(
        'Food Logged',
        `"${entry.food_name}" has been added to today's nutrition progress.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reload history to show the new entry
              loadFoodHistory();
            }
          }
        ]
      );
    } catch (error) {
      console.error('[FOOD HISTORY] Error re-logging entry:', error);
      Alert.alert('Error', 'Failed to log food entry. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderFoodEntry = (entry: FoodEntry, date: string) => {
    const today = new Date().toISOString().split('T')[0];
    // Use the date parameter (from DayHistory) or extract from timestamp
    const entryDate = date || entry.date || (entry.timestamp ? entry.timestamp.split('T')[0] : today);
    const isToday = entryDate === today;

    return (
      <View key={entry.id} style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryInfo}>
            <Text style={styles.entryName} numberOfLines={1}>
              {entry.food_name}
            </Text>
            <Text style={styles.entryTime}>
              {formatTime(entry.timestamp)}
            </Text>
          </View>
          <View style={styles.entryActions}>
            <View style={styles.caloriesBadge}>
              <Text style={styles.caloriesText}>{entry.calories}</Text>
              <Text style={styles.caloriesLabel}>kcal</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (!isToday) {
                  handleReLogEntry(entry);
                } else {
                  Alert.alert('Already Today', 'This food is already logged for today.');
                }
              }}
              style={styles.reLogButton}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteEntry(date, entry.id, entry.food_name)}
              style={styles.deleteButton}
            >
              <Icon name="delete-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      
        {(entry.protein_grams || entry.carbs_grams || entry.fat_grams) && (
          <View style={styles.macrosRow}>
            {entry.protein_grams ? (
              <View style={styles.macroChip}>
                <Text style={styles.macroValue}>{entry.protein_grams}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
            ) : null}
            {entry.carbs_grams ? (
              <View style={styles.macroChip}>
                <Text style={styles.macroValue}>{entry.carbs_grams}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
            ) : null}
            {entry.fat_grams ? (
              <View style={styles.macroChip}>
                <Text style={styles.macroValue}>{entry.fat_grams}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  const renderDayHistory = ({ item }: { item: DayHistory }) => (
    <View style={styles.dayCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.dayCardGradient}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayInfo}>
            <Text style={styles.dayDate}>{formatDate(item.date)}</Text>
            <Text style={styles.daySubtitle}>
              {item.entryCount} {item.entryCount === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
          <View style={styles.daySummary}>
            <Text style={styles.dayCalories}>{item.totalCalories}</Text>
            <Text style={styles.dayCaloriesLabel}>kcal</Text>
          </View>
        </View>

        <View style={styles.dayMacros}>
          <View style={styles.dayMacroItem}>
            <Text style={styles.dayMacroValue}>{item.totalProtein}g</Text>
            <Text style={styles.dayMacroLabel}>Protein</Text>
          </View>
          <View style={styles.dayMacroSeparator} />
          <View style={styles.dayMacroItem}>
            <Text style={styles.dayMacroValue}>{item.totalCarbs}g</Text>
            <Text style={styles.dayMacroLabel}>Carbs</Text>
          </View>
          <View style={styles.dayMacroSeparator} />
          <View style={styles.dayMacroItem}>
            <Text style={styles.dayMacroValue}>{item.totalFat}g</Text>
            <Text style={styles.dayMacroLabel}>Fat</Text>
          </View>
        </View>

        <View style={styles.entriesContainer}>
          {item.entries.map(entry => renderFoodEntry(entry, item.date))}
        </View>
      </LinearGradient>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['7', '14', '30'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodText,
            selectedPeriod === period && styles.periodTextActive
          ]}>
            {period} days
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Icon name="food-apple-outline" size={64} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>No Food History</Text>
      <Text style={styles.emptySubtitle}>
        Start logging your meals to see your nutrition history here
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/(main)/nutrition/log-food')}
        style={styles.logFoodButton}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.logFoodButtonGradient}
        >
          <Icon name="plus" size={20} color={colors.white} />
          <Text style={styles.logFoodButtonText}>Log Food</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading food history...</Text>
        </View>
      ) : historyData.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={historyData}
          renderItem={renderDayHistory}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    margin: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  dayCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dayCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayInfo: {
    flex: 1,
  },
  dayDate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  daySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  daySummary: {
    alignItems: 'flex-end',
  },
  dayCalories: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  dayCaloriesLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dayMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  dayMacroItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayMacroSeparator: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  dayMacroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dayMacroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  entriesContainer: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryInfo: {
    flex: 1,
    marginRight: 12,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  entryTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  caloriesBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  caloriesText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  caloriesLabel: {
    fontSize: 10,
    color: colors.primary,
  },
  reLogButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 53, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  macroChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  macroLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  logFoodButton: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  logFoodButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  logFoodButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});




