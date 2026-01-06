/**
 * LOG FOOD PAGE
 * Manual and AI-powered food logging
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { ServerStatusIndicator } from '../../../src/components/ui/ServerStatusIndicator';
import { TutorialWrapper } from '../../../src/components/tutorial/TutorialWrapper';
import { useTutorial } from '../../../src/contexts/TutorialContext';

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

export default function LogFoodScreen() {
  const { user } = useAuth();
  const { state: tutorialState } = useTutorial();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ image?: string }>();
  
  const [mode, setMode] = useState<'manual' | 'ai'>('ai');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Manual form fields
  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  const safeUserId = (user as any)?.id || 'guest';

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    let greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    let message = mode === 'ai' 
      ? "Take a photo of your food for instant nutrition analysis."
      : "Enter your food details manually to track nutrition.";
    
    return { greeting, message };
  }, [mode]);

  // Accept image URI passed from custom camera
  useEffect(() => {
    const incoming = params?.image ? String(params.image) : '';
    if (incoming && incoming !== imageUri) {
      setImageUri(incoming);
      setMode('ai');
      Image.getSize(incoming, (w, h) => {
        if (w && h) setImageAspectRatio(w / h);
      }, () => {});
    }
  }, [params?.image]);

  const resetForm = () => {
    setFoodName('');
    setServingSize('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  const handleLogFood = async () => {
        if (!foodName || !calories) {
          Alert.alert('Missing Fields', 'Food name and calories are required.');
          return;
        }

    setIsLoading(true);
    try {
      const entry = {
        food_name: foodName,
        serving_size_grams: servingSize ? parseInt(servingSize, 10) : undefined,
        calories: parseInt(calories, 10),
        protein_grams: protein ? parseFloat(protein) : undefined,
        carbs_grams: carbs ? parseFloat(carbs) : undefined,
        fat_grams: fat ? parseFloat(fat) : undefined,
      };

      await NutritionService.logFoodEntry(safeUserId, entry);
      Alert.alert('Success', `${entry.food_name} has been logged.`, [
        { text: 'OK', onPress: () => { resetForm(); router.back(); } },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      Alert.alert('Error', `Failed to log food: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });
    
    if (!result.canceled) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      Image.getSize(asset.uri, (w, h) => {
        if (w && h) setImageAspectRatio(w / h);
      }, () => {});
    }
  };

  const takePhoto = async () => {
    router.push('/(modals)/nutrition/food-camera');
  };

  const handleAnalyzeFood = async () => {
    if (!imageUri) return;

    setIsLoading(true);

    // Tutorial mock response
    if (tutorialState.isActive) {
      setTimeout(() => {
        setIsLoading(false);
        const mockResult = {
          foodName: 'Grilled Chicken Salad',
          nutrition: { calories: 450, protein: 40, carbohydrates: 12, fat: 20 },
          estimatedServingSize: '1 bowl',
          confidence: 0.95,
          foodItems: [
            { name: 'Grilled Chicken', calories: 280, protein: 35, carbs: 0, fat: 6 },
            { name: 'Mixed Greens', calories: 20, protein: 1, carbs: 3, fat: 0 },
          ]
        };
        router.push({
          pathname: '/(main)/nutrition/food-result',
          params: { data: JSON.stringify(mockResult), image: imageUri }
        });
      }, 1500);
      return;
    }

    try {
      const result = await NutritionService.analyzeFoodImage(imageUri, additionalInfo);
      
      if (result.success && result.data) {
        router.push({
          pathname: '/(main)/nutrition/food-result',
          params: { data: JSON.stringify(result.data), image: imageUri }
        });
      } else {
        throw new Error(result.message || 'Analysis failed');
      }
    } catch (error: any) {
      Alert.alert(
        'Analysis Failed',
        error.message || 'Could not analyze the food image.',
        [
          { text: 'Try Again', onPress: () => setImageUri(null) },
          { text: 'Log Manually', onPress: () => setMode('manual') }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
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

        {/* Quick Actions */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Icon name="arrow-left" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/nutrition/food-library')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="book-open-variant" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(main)/nutrition/food-history')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="history" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <ServerStatusIndicator size={18} showBorder={false} />
            </View>
            <Text style={styles.quickActionLabel}>Server</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'ai' && styles.modeButtonActive]}
            onPress={() => setMode('ai')}
          >
            <Icon name="brain" size={18} color={mode === 'ai' ? colors.white : colors.textSecondary} />
            <Text style={[styles.modeButtonText, mode === 'ai' && styles.modeButtonTextActive]}>
              AI Scan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
            onPress={() => setMode('manual')}
          >
            <Icon name="pencil" size={18} color={mode === 'manual' ? colors.white : colors.textSecondary} />
            <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
              Manual
            </Text>
          </TouchableOpacity>
        </View>

        {/* AI Mode */}
        {mode === 'ai' && (
          <View style={styles.section}>
      {imageUri ? (
              <>
                <View style={styles.imageContainer}>
                  <Image 
                    source={{ uri: imageUri }} 
                    style={[styles.imagePreview, { aspectRatio: imageAspectRatio }]} 
                  />
                  <TouchableOpacity 
                    onPress={() => setImageUri(null)} 
                    style={styles.removeImageButton}
                  >
                    <Icon name="close" size={20} color={colors.white} />
          </TouchableOpacity>
                </View>
          
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Additional details (optional)</Text>
            <TextInput
                    placeholder="e.g., 'small portion', 'steamed not fried'"
              placeholderTextColor={colors.textSecondary}
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
                    style={styles.textArea}
                    multiline
              numberOfLines={2}
            />
          </View>
          
          <TouchableOpacity
            onPress={handleAnalyzeFood}
            disabled={isLoading}
                  style={styles.analyzeButton}
                  activeOpacity={0.9}
                >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
                    style={styles.analyzeButtonGradient}
                  >
              {isLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <>
                        <Icon name="brain" size={20} color={colors.white} />
                        <Text style={styles.analyzeButtonText}>Analyze Food</Text>
                      </>
              )}
            </LinearGradient>
          </TouchableOpacity>
              </>
            ) : (
              <>
                <TutorialWrapper tutorialId="ai-camera-button">
                  <TouchableOpacity style={styles.photoOption} onPress={takePhoto} activeOpacity={0.8}>
                    <View style={[styles.photoOptionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                      <Icon name="camera" size={24} color={colors.primary} />
            </View>
                    <View style={styles.photoOptionText}>
                      <Text style={styles.photoOptionTitle}>Take Photo</Text>
                      <Text style={styles.photoOptionSubtitle}>Use camera to capture food</Text>
          </View>
                    <Icon name="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          </TutorialWrapper>

                <TouchableOpacity style={styles.photoOption} onPress={pickImage} activeOpacity={0.8}>
                  <View style={[styles.photoOptionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
                    <Icon name="image" size={24} color="#6366F1" />
                  </View>
                  <View style={styles.photoOptionText}>
                    <Text style={styles.photoOptionTitle}>Choose from Gallery</Text>
                    <Text style={styles.photoOptionSubtitle}>Select an existing photo</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
              </>
            )}
        </View>
      )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <View style={styles.section}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Food Name *</Text>
        <TextInput
                placeholder="e.g., Grilled Chicken Breast"
                placeholderTextColor={colors.textSecondary}
          value={foodName}
          onChangeText={setFoodName}
          style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Serving Size (g)</Text>
        <TextInput
                placeholder="e.g., 150"
                placeholderTextColor={colors.textSecondary}
          value={servingSize}
          onChangeText={setServingSize}
          keyboardType="numeric"
          style={styles.input}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Calories *</Text>
        <TextInput
                placeholder="e.g., 250"
                placeholderTextColor={colors.textSecondary}
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          style={styles.input}
              />
            </View>

            <View style={styles.macroInputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.protein }]}>Protein (g)</Text>
        <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
          value={protein}
          onChangeText={setProtein}
          keyboardType="numeric"
          style={styles.input}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.carbs }]}>Carbs (g)</Text>
        <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="numeric"
          style={styles.input}
                />
              </View>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.fat }]}>Fat (g)</Text>
        <TextInput
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
          value={fat}
          onChangeText={setFat}
          keyboardType="numeric"
          style={styles.input}
        />
              </View>
            </View>
        
          <TouchableOpacity
            onPress={handleLogFood}
            disabled={isLoading}
              style={styles.logButton}
              activeOpacity={0.9}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
                style={styles.logButtonGradient}
            >
              {isLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <>
                    <Icon name="plus" size={20} color={colors.white} />
                    <Text style={styles.logButtonText}>Log Food</Text>
                  </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
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

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionCard: {
    width: (screenWidth - 40 - 24) / 4,
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.white,
  },

  // Section
  section: {
    marginBottom: 24,
  },

  // Photo Options
  photoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  photoOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  photoOptionText: {
    flex: 1,
  },
  photoOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  photoOptionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Image Preview
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Inputs
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  macroInputRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Buttons
  analyzeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  logButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  logButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
