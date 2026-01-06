import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

export const MockFoodSuggestions = () => {
  const insets = useSafeAreaInsets();

  // Mock food suggestions
  const suggestions = [
    {
      id: 'protein_power',
      title: 'Protein Power Bowl',
      description: 'Ideal when you still need a big protein boost without blowing up carbs.',
      foods: [
        '150g grilled chicken breast',
        '1 cup cooked quinoa',
        '1 cup roasted broccoli',
        '1 tbsp olive oil drizzle'
      ],
      macros: { calories: 520, protein: 45, carbs: 42, fat: 18 }
    },
    {
      id: 'carb_recharge',
      title: 'Clean Carb Recharge',
      description: 'Refill glycogen to fuel your next workout while keeping fat moderate.',
      foods: [
        '1 medium sweet potato',
        '120g baked salmon',
        '1 cup steamed green beans',
        '1 tbsp pumpkin seeds'
      ],
      macros: { calories: 480, protein: 32, carbs: 50, fat: 16 }
    },
    {
      id: 'healthy_fats',
      title: 'Healthy Fats Plate',
      description: 'Balances hormones and satiety when fat is the missing macro.',
      foods: [
        '2 whole eggs + 2 egg whites',
        '1/2 avocado',
        '30g mixed nuts',
        'Handful of cherry tomatoes'
      ],
      macros: { calories: 430, protein: 24, carbs: 16, fat: 30 }
    },
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
            <Text style={styles.coachMessage}>Get personalized meal suggestions based on your macros!</Text>
          </View>
        </View>

        {/* Suggestions List */}
        {suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <TouchableOpacity style={styles.addButton}>
                <Icon name="plus" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
            
            {/* Foods List */}
            <View style={styles.foodsList}>
              {suggestion.foods.map((food, foodIndex) => (
                <View key={foodIndex} style={styles.foodItem}>
                  <Icon name="circle-small" size={16} color={colors.primary} />
                  <Text style={styles.foodItemText}>{food}</Text>
                </View>
              ))}
            </View>

            {/* Macros */}
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroValue}>{suggestion.macros.calories}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: '#3B82F6' }]}>Protein</Text>
                <Text style={[styles.macroValue, { color: '#3B82F6' }]}>{suggestion.macros.protein}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: '#F59E0B' }]}>Carbs</Text>
                <Text style={[styles.macroValue, { color: '#F59E0B' }]}>{suggestion.macros.carbs}g</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: '#EC4899' }]}>Fat</Text>
                <Text style={[styles.macroValue, { color: '#EC4899' }]}>{suggestion.macros.fat}g</Text>
              </View>
            </View>
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
  suggestionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionDescription: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 16,
    lineHeight: 20,
  },
  foodsList: {
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  foodItemText: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.8)',
    marginLeft: 8,
  },
  macrosContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 11,
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  macroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});



