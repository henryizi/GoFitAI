import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

export const MockFoodLibrary = () => {
  const insets = useSafeAreaInsets();

  // Mock food data
  const foods = [
    { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, category: 'protein' },
    { name: 'Salmon', calories: 206, protein: 22, carbs: 0, fat: 12, category: 'protein' },
    { name: 'Brown Rice', calories: 112, protein: 2.6, carbs: 23, fat: 0.9, category: 'carbs' },
    { name: 'Sweet Potato', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, category: 'carbs' },
    { name: 'Avocado', calories: 160, protein: 2, carbs: 9, fat: 15, category: 'fat' },
    { name: 'Greek Yogurt', calories: 100, protein: 10, carbs: 6, fat: 0, category: 'protein' },
  ];

  const categories = [
    { id: 'all', label: 'All', icon: 'food' },
    { id: 'protein', label: 'Protein', icon: 'food-drumstick' },
    { id: 'carbs', label: 'Carbs', icon: 'grain' },
    { id: 'fat', label: 'Fat', icon: 'water' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity style={styles.backButton}>
            <Icon name="arrow-left" size={22} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>Good morning</Text>
            <Text style={styles.coachMessage}>Browse {foods.length} foods to track your nutrition.</Text>
          </View>
        </View>

        {/* Search Box */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="rgba(235, 235, 245, 0.6)" />
          <Text style={styles.searchInput}>Search foods...</Text>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryChip,
                category.id === 'all' && styles.categoryChipActive,
              ]}
            >
              <Icon
                name={category.icon as any}
                size={16}
                color={category.id === 'all' ? colors.white : 'rgba(235, 235, 245, 0.6)'}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  category.id === 'all' && styles.categoryChipTextActive,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Count */}
        <Text style={styles.resultsCount}>{foods.length} foods found</Text>

        {/* Food List */}
        {foods.map((food, index) => (
          <View key={index} style={styles.foodItem}>
            <View style={styles.foodItemLeft}>
              <View style={styles.foodIcon}>
                <Icon name="food" size={20} color={colors.primary} />
              </View>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <View style={styles.foodMacros}>
                  <Text style={styles.macroText}>{food.calories} cal</Text>
                  <Text style={[styles.macroText, { color: '#3B82F6' }]}>
                    {food.protein}g P
                  </Text>
                  <Text style={[styles.macroText, { color: '#F59E0B' }]}>
                    {food.carbs}g C
                  </Text>
                  <Text style={[styles.macroText, { color: '#EC4899' }]}>
                    {food.fat}g F
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Icon name="plus" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    paddingHorizontal: 20,
  },
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: 'rgba(235, 235, 245, 0.6)',
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(235, 235, 245, 0.6)',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryContent: {
    gap: 8,
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    color: 'rgba(235, 235, 245, 0.6)',
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  foodItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  foodIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 6,
  },
  foodMacros: {
    flexDirection: 'row',
    gap: 12,
  },
  macroText: {
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.6)',
    fontWeight: '500',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});



