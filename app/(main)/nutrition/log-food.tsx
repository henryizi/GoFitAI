import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  // Platform, // Disabled during rebuild
  Dimensions,
  Text,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../src/hooks/useAuth';

import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
// import { BlurView } from 'expo-blur'; // Disabled during rebuild

import { ServerStatusIndicator } from '../../../src/components/ui/ServerStatusIndicator';
// import { environment } from '../../../src/config/environment'; // Disabled during rebuild

const { width } = Dimensions.get('window');

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  accent: '#FF8F65',
  accentLight: '#FFB08F',
  background: '#121212',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  border: 'rgba(255, 107, 53, 0.2)',
  borderLight: 'rgba(255, 107, 53, 0.1)',
  error: '#FF453A',
  success: '#34C759',
  warning: '#FF9500',
  dark: '#121212',
  card: 'rgba(28, 28, 30, 0.95)',
  cardGradient: ['rgba(28, 28, 30, 0.95)', 'rgba(44, 44, 46, 0.95)'],
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function LogFoodScreen() {
  const { user } = useAuth();
  // const serverStatus = useServerStatus(); // Disabled during rebuild
  // const { isServerConnected, checkServerStatus } = serverStatus; // Disabled during rebuild
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ image?: string }>();
  const [mode, setMode] = useState('manual');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  // const [servings, setServings] = useState<number>(1); // Disabled during rebuild

  const [foodName, setFoodName] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  
  // Loading overlay timing/progress - disabled during rebuild
  // const [analyzeElapsedMs, setAnalyzeElapsedMs] = useState(0);
  // const ANALYZE_ESTIMATE_MS = 45000; // matches client timeout
  // const [analyzeInterval, setAnalyzeInterval] = useState<NodeJS.Timeout | null>(null);

  // Create a safe user ID that's always a string
  const safeUserId = (user as any)?.id || 'guest';

  // Food analysis result rendering - disabled during rebuild
  /*
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;
    const proteinG = Number(analysisResult.protein_grams || 0);
    const carbsG = Number(analysisResult.carbs_grams || 0);
    const fatG = Number(analysisResult.fat_grams || 0);
    const calsFromMacros = proteinG * 4 + carbsG * 4 + fatG * 9;
    const totalCalories = Number(analysisResult.calories || calsFromMacros || 0);
    const safeTotal = Math.max(totalCalories, 1);
    const pctProtein = Math.min(100, Math.round(((proteinG * 4) / safeTotal) * 100));
    const pctCarbs = Math.min(100, Math.round(((carbsG * 4) / safeTotal) * 100));
    const pctFat = Math.min(100, Math.round(((fatG * 9) / safeTotal) * 100));

    // Multiply for servings
    const mult = Math.max(servings, 1);
    const dispCalories = Math.round(totalCalories * mult);
    const dispProtein = Math.round(proteinG * mult);
    const dispCarbs = Math.round(carbsG * mult);
    const dispFat = Math.round(fatG * mult);

    // Simple health score heuristic (0..10)
    const proteinShare = Math.min((proteinG * 4) / safeTotal, 0.4) / 0.4; // favor up to 40% protein kcal
    const fatShare = (fatG * 9) / safeTotal;
    const fatPenalty = Math.max(0, fatShare - 0.45) / 0.35; // penalize if fat > 45%
    const score = Math.max(0, Math.min(10, Math.round((proteinShare * 7 + (1 - fatPenalty) * 3))));
    const scorePct = (score / 10) * 100;
 
    return (
      <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.analysisCard}>
        <LinearGradient colors={["#1f1f22", "#141416"]} style={styles.analysisGradient}>
          <BlurView intensity={20} tint={Platform.OS === 'ios' ? 'dark' : 'default'} style={styles.blurOverlay} />
          <View style={styles.analysisHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodTitle} numberOfLines={2}>{analysisResult.food_name || analysisResult.meal_name || 'Detected Food'}</Text>
              <Text style={styles.foodSubtitle}>Analyzed nutrition</Text>
            </View>
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieValue}>{dispCalories || 0}</Text>
              <Text style={styles.calorieLabel}>kcal</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.servingsRow}>
            <Text style={styles.servingsLabel}>Servings</Text>
            <View style={styles.stepper}>
              <TouchableOpacity disabled={servings <= 1} onPress={() => setServings(Math.max(1, servings - 1))} style={[styles.stepperBtn, servings <= 1 && { opacity: 0.4 }]}>
                <Icon name="minus" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{servings}</Text>
              <TouchableOpacity onPress={() => setServings(servings + 1)} style={styles.stepperBtn}>
                <Icon name="plus" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59,130,246,0.35)' }]}>
              <View style={[styles.macroDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{dispProtein} g</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245,158,11,0.35)' }]}>
              <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{dispCarbs} g</Text>
            </View>
            <View style={[styles.macroChip, { backgroundColor: 'rgba(236, 72, 153, 0.12)', borderColor: 'rgba(236,72,153,0.35)' }]}>
              <View style={[styles.macroDot, { backgroundColor: '#EC4899' }]} />
              <Text style={styles.macroLabel}>Fat</Text>
              <Text style={styles.macroValue}>{dispFat} g</Text>
            </View>
          </View>

          <View style={styles.stackBar}>
            <View style={[styles.stackBarFill, { backgroundColor: '#3B82F6', width: `${pctProtein}%` }]} />
            <View style={[styles.stackBarFill, { backgroundColor: '#F59E0B', width: `${pctCarbs}%` }]} />
            <View style={[styles.stackBarFill, { backgroundColor: '#EC4899', width: `${pctFat}%` }]} />
          </View>
          <View style={styles.stackBarLegend}>
            <Text style={styles.legendText}>{pctProtein}% protein</Text>
            <Text style={styles.legendText}>{pctCarbs}% carbs</Text>
            <Text style={styles.legendText}>{pctFat}% fat</Text>
          </View>

          <View style={styles.healthRow}>
            <View style={styles.healthLabelWrap}>
              <Icon name="heart-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.healthLabel}>Health score</Text>
            </View>
            <Text style={styles.healthScore}>{score}/10</Text>
          </View>
          <View style={styles.healthBar}>
            <View style={[styles.healthFill, { width: `${scorePct}%` }]} />
          </View>

          {analysisResult.notice ? (
            <View style={styles.noticeBox}>
              <Icon name="alert-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.noticeText}>{analysisResult.notice}</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => setMode('manual')} style={styles.fixBtn} disabled={isLoading}>
              <Text style={styles.fixBtnText}>Fix Results</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <AnimatedTouchableOpacity 
              onPress={handleLogFood}
              disabled={isLoading}
              style={[styles.logCta, { flex: 0.6 }]}
              entering={FadeInUp.delay(200).duration(400)}
            >
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.buttonGradient}>
                {isLoading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.buttonText}>Done</Text>
                )}
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };
  */

  const resetForm = () => {
    setFoodName('');
    setServingSize('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
  };

  const handleLogFood = async () => {
    setIsLoading(true);
    try {
      let entry;
      if (analysisResult) {
        entry = {
          food_name: analysisResult.food_name,
          calories: analysisResult.calories,
          protein_grams: analysisResult.protein_grams,
          carbs_grams: analysisResult.carbs_grams,
          fat_grams: analysisResult.fat_grams,
        };
      } else {
        if (!foodName || !calories) {
          Alert.alert('Missing Fields', 'Food name and calories are required.');
          setIsLoading(false);
          return;
        }
        entry = {
        food_name: foodName,
        serving_size_grams: servingSize ? parseInt(servingSize, 10) : undefined,
        calories: parseInt(calories, 10),
        protein_grams: protein ? parseFloat(protein) : undefined,
        carbs_grams: carbs ? parseFloat(carbs) : undefined,
        fat_grams: fat ? parseFloat(fat) : undefined,
      };
      }

      await NutritionService.logFoodEntry(safeUserId, entry);
      Alert.alert('Success', `${entry.food_name} has been logged.`, [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            setAnalysisResult(null);
            setImageUri(null);
          },
        },
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    router.push('/(modals)/nutrition/food-camera');
  };

  const handleAnalyzeFood = async () => {
    if (!imageUri) return;

    console.log('[FOOD ANALYZE] Starting food analysis for image:', imageUri);
    setIsLoading(true);

    try {
      // Call the NutritionService to analyze the food image
      const result = await NutritionService.analyzeFoodImage(imageUri);
      
      console.log('[FOOD ANALYZE] Analysis result:', result);
      
      if (result.success && result.data) {
        const foodData = result.data;
        
        // Create a food entry from the analysis result
        const foodEntry = {
          food_name: foodData.foodName,
          calories: foodData.nutrition.calories,
          protein_grams: foodData.nutrition.protein,
          carbs_grams: foodData.nutrition.carbohydrates,
          fat_grams: foodData.nutrition.fat,
          serving_size: foodData.estimatedServingSize,
          confidence: foodData.confidence,
          analysis_notes: foodData.notes,
          assumptions: foodData.assumptions?.join(', ') || '',
          food_items: foodData.foodItems || []
        };

        // Navigate to the food results page instead of showing popup
        console.log('[FOOD ANALYZE] Navigating to food results page');
        
        // Navigate to the food-result page with the analysis data and image
        router.push({
          pathname: '/(main)/nutrition/food-result',
          params: {
            data: JSON.stringify(result.data),
            image: imageUri
          }
        });
      } else {
        throw new Error(result.message || 'Analysis failed');
      }
    } catch (error: any) {
      console.error('[FOOD ANALYZE] Error:', error.message);
      
      Alert.alert(
        '🔍 Analysis Failed',
        error.message || 'Could not analyze the food image. Please try again with a clearer photo or log manually.',
        [
          { text: 'Try Again', onPress: () => setImageUri(null) },
          { text: 'Log Manually', onPress: () => setMode('manual') }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up interval on unmount - disabled during rebuild
  /*
  useEffect(() => {
    return () => {
      if (analyzeInterval) {
        clearInterval(analyzeInterval);
      }
    };
  }, [analyzeInterval]);
  */

  useEffect(() => {
    if (analysisResult) {
      setMode('manual');
    }
  }, [analysisResult]);

  // Accept image URI passed from custom camera
  useEffect(() => {
    const incoming = params?.image ? String(params.image) : '';
    if (incoming && incoming !== imageUri) {
      setImageUri(incoming);
      setMode('ai');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.image]);

  const renderAiLogFood = () => (
    <Animated.View 
      style={styles.contentContainer}
      entering={FadeInUp.duration(500)}
    >
      {imageUri ? (
        <View style={styles.aiCard}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity onPress={() => setImageUri(null)} style={styles.closeIcon}>
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAnalyzeFood}
            disabled={isLoading}
            style={[styles.analyzeButton, { marginBottom: 20 }]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.buttonGradient}>
              {isLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="brain" size={20} color={colors.text} />
                  <Text style={styles.buttonText}>Analyze Food</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View>
              <Text style={styles.aiTitle}>Log with AI</Text>
              <Text style={styles.aiSubtitle}>Upload a photo of your meal</Text>
            </View>
            <ServerStatusIndicator size={12} showBorder={true} />
          </View>
          <AnimatedTouchableOpacity 
            style={styles.aiButton} 
            onPress={takePhoto}
            entering={FadeInUp.delay(200).duration(500)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={[styles.aiButtonGradient, { marginRight: 16 }]}
            >
              <Icon name="camera-outline" size={24} color={colors.text} />
            </LinearGradient>
            <Text style={styles.aiButtonText}>Take Photo</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </AnimatedTouchableOpacity>
          <AnimatedTouchableOpacity 
            style={styles.aiButton} 
            onPress={pickImage}
            entering={FadeInUp.delay(400).duration(500)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={[styles.aiButtonGradient, { marginRight: 16 }]}
            >
              <Icon name="image-outline" size={24} color={colors.text} />
            </LinearGradient>
            <Text style={styles.aiButtonText}>Choose from Gallery</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} style={{ marginLeft: 'auto' }} />
          </AnimatedTouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderManualForm = () => (
    <Animated.View 
      style={styles.formContainer}
      entering={FadeInUp.duration(500)}
    >
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.inputContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.inputIconGradient}
          >
            <Icon name="food-croissant" size={20} color={colors.text} />
          </LinearGradient>
        <TextInput
            placeholder="Food Name"
          value={foodName}
          onChangeText={setFoodName}
          style={styles.input}
            placeholderTextColor={colors.textSecondary}
        />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.inputContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.inputIconGradient}
          >
            <Icon name="weight-gram" size={20} color={colors.text} />
          </LinearGradient>
        <TextInput
            placeholder="Serving Size (g)"
          value={servingSize}
          onChangeText={setServingSize}
          keyboardType="numeric"
          style={styles.input}
            placeholderTextColor={colors.textSecondary}
        />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.inputContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.inputIconGradient}
          >
            <Icon name="fire" size={20} color={colors.text} />
          </LinearGradient>
        <TextInput
            placeholder="Calories"
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          style={styles.input}
            placeholderTextColor={colors.textSecondary}
        />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.inputContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.inputIconGradient}
          >
            <Icon name="food-drumstick" size={20} color={colors.text} />
          </LinearGradient>
        <TextInput
            placeholder="Protein (g)"
          value={protein}
          onChangeText={setProtein}
          keyboardType="numeric"
          style={styles.input}
            placeholderTextColor={colors.textSecondary}
        />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.inputContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.inputIconGradient}
          >
            <Icon name="bread-slice" size={20} color={colors.text} />
          </LinearGradient>
        <TextInput
            placeholder="Carbohydrates (g)"
          value={carbs}
          onChangeText={setCarbs}
          keyboardType="numeric"
          style={styles.input}
            placeholderTextColor={colors.textSecondary}
        />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.inputContainer}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.inputIconGradient}
          >
            <Icon name="oil" size={20} color={colors.text} />
          </LinearGradient>
        <TextInput
            placeholder="Fat (g)"
          value={fat}
          onChangeText={setFat}
          keyboardType="numeric"
          style={styles.input}
            placeholderTextColor={colors.textSecondary}
        />
        </Animated.View>
        
        <Animated.View entering={FadeInUp.delay(700).duration(500)}>
          <TouchableOpacity
            onPress={handleLogFood}
            disabled={isLoading}
            style={[styles.logButton, isLoading && styles.logButtonDisabled]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.buttonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="plus" size={18} color={colors.text} />
                  <Text style={styles.buttonText}>LOG FOOD</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
  );

  const renderSearch = () => (
    <Animated.View 
      style={styles.contentContainer}
      entering={FadeInUp.duration(500)}
    >
      <View style={styles.emptyState}>
        <Icon name="magnify" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyStateText}>Search is coming soon!</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={styles.header} entering={FadeInDown.duration(500)}>
        <TouchableOpacity onPress={() => router.replace('/(main)/nutrition')} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Food</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View 
          style={styles.segmentedControl}
          entering={FadeInDown.delay(200).duration(500)}
        >
          <TouchableOpacity
            style={[styles.segmentButton, mode === 'manual' && styles.segmentButtonActive]}
            onPress={() => setMode('manual')}>
            <Text style={[styles.segmentText, mode === 'manual' && styles.segmentTextActive]}>
              Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, mode === 'ai' && styles.segmentButtonActive]}
            onPress={() => setMode('ai')}>
            <Text style={[styles.segmentText, mode === 'ai' && styles.segmentTextActive]}>
              AI
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, mode === 'search' && styles.segmentButtonActive]}
            onPress={() => setMode('search')}>
            <Text style={[styles.segmentText, mode === 'search' && styles.segmentTextActive]}>
              Search
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {mode === 'manual' && renderManualForm()}
        {mode === 'ai' && renderAiLogFood()}
        {mode === 'search' && renderSearch()}
      </ScrollView>

      {/* Loading overlay disabled during rebuild */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120, // Add extra padding at the bottom to ensure content is not covered by the tab bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginVertical: 24,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  formContainer: {
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  inputContainer: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    paddingLeft: 20,
  },
  inputIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  logButton: {
    marginTop: 24,
    borderRadius: 20,
    height: 60,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aiCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    alignItems: 'stretch',
    overflow: 'hidden',
    marginBottom: 80,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  aiTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  aiSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  aiButton: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  aiButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 16,
    letterSpacing: 0.2,
  },
  aiButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: width - 48,
    height: (width - 48) * (16/9),
    borderRadius: 20,
    marginBottom: 20,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: colors.border,
  },
  closeIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: colors.glass,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  analyzeButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  // Full-screen analyzing overlay
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  fullOverlayBg: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingPanel: {
    width: '88%',
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  loadingTitle: {
    marginTop: 16,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingSubtitle: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    marginTop: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 12,
  },
  emptyStateText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: 20,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  analysisCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  analysisGradient: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  analysisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  foodSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  calorieBadge: {
    width: 84,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  calorieValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22,
  },
  calorieLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 12,
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  servingsLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stepperValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 8,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  macroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: (width - 88) / 3 - 6,
    justifyContent: 'space-between',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  macroLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  macroValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  stackBar: {
    height: 12,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
  },
  stackBarFill: {
    height: '100%',
  },
  stackBarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  healthLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  healthLabel: {
    color: colors.textSecondary,
    marginLeft: 6,
    fontSize: 13,
  },
  healthScore: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  healthBar: {
    marginTop: 6,
    width: '100%',
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    backgroundColor: '#34D399',
  },
  noticeBox: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(28,28,30,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  fixBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  fixBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  logCta: {
    marginTop: 14,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bubbleTag: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  bubbleText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '700',
  },
  logButtonDisabled: {
    opacity: 0.6,
  },
});

 