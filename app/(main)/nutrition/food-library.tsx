/**
 * FOOD LIBRARY
 * Browse and search the complete food database
 */

import { router } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  FlatList,
  Dimensions,
  RefreshControl,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';

const { width: screenWidth } = Dimensions.get('window');

// Clean color palette
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#EF4444',
  white: '#FFFFFF',
  protein: '#3B82F6',
  carbs: '#F59E0B',
  fat: '#EC4899',
};

// Get all foods from the service
const getAllFoods = () => {
  return NutritionService.getFoodDatabase();
};

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All', icon: 'food' },
  { id: 'protein', label: 'Protein', icon: 'food-drumstick' },
  { id: 'carbs', label: 'Carbs', icon: 'grain' },
  { id: 'fat', label: 'Fat', icon: 'water' },
];

export default function FoodLibraryScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [allFoods] = useState(() => getAllFoods());
  const [refreshing, setRefreshing] = useState(false);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    let message = `Browse ${allFoods.length} foods to track your nutrition.`;
    
    return { greeting, message };
  }, [allFoods.length]);

  const filteredFoods = useMemo(() => {
    let filtered = allFoods;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(food => food.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(food =>
        food.name.toLowerCase().includes(query) ||
        food.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allFoods, selectedCategory, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const renderFoodItem = ({ item }: { item: typeof allFoods[0] }) => {
    const categoryConfig = {
      protein: { color: colors.protein, icon: 'food-drumstick' },
      carbs: { color: colors.carbs, icon: 'grain' },
      fat: { color: colors.fat, icon: 'water' },
    };

    const config = categoryConfig[item.category] || { color: colors.primary, icon: 'food' };

    return (
      <View style={styles.foodCard}>
        <View style={styles.foodHeader}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
            {item.commonServing && (
              <Text style={styles.foodServing}>{item.commonServing}</Text>
            )}
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: `${config.color}15` }]}>
            <Icon name={config.icon} size={12} color={config.color} />
          </View>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroValue}>{item.calories}</Text>
            <Text style={styles.macroLabel}>Cal</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: colors.protein }]}>{item.protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: colors.carbs }]}>{item.carbs}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroDivider} />
          <View style={styles.macroItem}>
            <Text style={[styles.macroValue, { color: colors.fat }]}>{item.fat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <FlatList
        data={filteredFoods}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            {/* AI Coach Header */}
            <View style={styles.coachHeader}>
              <TouchableOpacity 
                onPress={() => router.back()} 
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

            {/* Search Box */}
            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search foods..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryContent}
            >
              {CATEGORY_OPTIONS.map(category => {
                const isSelected = selectedCategory === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name={category.icon}
                      size={16}
                      color={isSelected ? colors.white : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Results Count */}
            <Text style={styles.resultsCount}>
              {filteredFoods.length} {filteredFoods.length === 1 ? 'food' : 'foods'} found
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="food-off" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Foods Found</Text>
            <Text style={styles.emptyDescription}>
              Try adjusting your search or category filter.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
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
    color: colors.white,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.white,
    padding: 0,
  },

  // Category Filter
  categoryScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  categoryContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.white,
  },

  // Results
  resultsCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
  },

  // Food Card
  foodCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  foodInfo: {
    flex: 1,
    marginRight: 8,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  foodServing: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2,
  },
  macroLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
