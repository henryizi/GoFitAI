import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, TouchableOpacity, Animated, Vibration } from 'react-native';
import { Text, TextInput, HelperText } from 'react-native-paper';
import { colors } from '../../../src/styles/colors';
import { useAuth } from '../../../src/hooks/useAuth';
import { Database } from '../../../src/types/database';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../src/services/supabase/client';

export default function DailyMealPlanScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [calories, setCalories] = useState<string>('');
  const [dietType, setDietType] = useState<string>('balanced');
  const [allergies, setAllergies] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [mealPlan, setMealPlan] = useState<any>(null);
  
  // Animations
  const scaleAnim = new Animated.Value(1);
  const successOpacity = new Animated.Value(0);
  const slideAnim = new Animated.Value(0);

  useEffect(() => {
    // Entrance animation
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  }, []);

  const handleCaloriesChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setCalories(cleaned);
  };

  const caloriesNum = calories ? parseInt(calories) : NaN;
  const isCaloriesInvalid = Number.isNaN(caloriesNum) || caloriesNum <= 0 || caloriesNum > 5000;
  const todayLabel = new Date().toLocaleDateString();

  const dietTypes = [
    { key: 'balanced', label: '均衡饮食', icon: 'scale-balance' },
    { key: 'low-carb', label: '低碳水', icon: 'leaf' },
    { key: 'high-protein', label: '高蛋白', icon: 'dumbbell' },
    { key: 'vegetarian', label: '素食', icon: 'sprout' },
    { key: 'keto', label: '生酮饮食', icon: 'fire' }
  ];
  const adjustCalories = (delta: number) => {
    const current = Number.isNaN(caloriesNum) ? 0 : caloriesNum;
    const next = Math.max(0, current + delta);
    setCalories(next.toString());
    
    // Haptic feedback
    Vibration.vibrate(50);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const showSuccessAlert = () => {
    setShowSuccessAnimation(true);
    Animated.parallel([
      Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1.1, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        setShowSuccessAnimation(false);
      }, 1500);
    });
  };

  const generateMealPlan = async () => {
    if (!user) {
      Alert.alert('未登录', '请先登录。');
      return;
    }
    if (Number.isNaN(caloriesNum) || caloriesNum <= 0) {
      Alert.alert('无效卡路里', '请输入有效的卡路里目标。');
      return;
    }
    setIsGenerating(true);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    
    try {
      // Mock meal plan generation - replace with actual API call
      const mockMealPlan = {
        breakfast: { name: '燕麦粥配蓝莓', calories: Math.floor(caloriesNum * 0.25) },
        lunch: { name: '烤鸡胸配蔬菜', calories: Math.floor(caloriesNum * 0.4) },
        dinner: { name: '三文鱼配糙米', calories: Math.floor(caloriesNum * 0.35) }
      };
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setMealPlan(mockMealPlan);
      Vibration.vibrate([100, 50, 100]); // Success vibration pattern
      showSuccessAlert();
      
    } catch (e) {
      console.error(e);
      Alert.alert('错误', '生成膳食计划时发生错误，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 64 : 0}
    >
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={[styles.scroll, { paddingBottom: (styles.scroll as any).paddingBottom + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          contentInset={{ bottom: insets.bottom }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {/* Enhanced Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0]
                  })
                }],
                opacity: slideAnim
              }
            ]}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(main)/nutrition')}>
              <Icon name="chevron-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>每日膳食计划</Text>
            <View style={styles.refreshButton}>
              <TouchableOpacity 
                style={styles.refreshButtonInner}
                onPress={() => setMealPlan(null)}
              >
                <Icon name="refresh" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Main Weight Input Card */}
          <Animated.View
            style={[
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }],
                opacity: slideAnim
              }
            ]}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.08)"]}
              style={styles.mainCard}
            >
              {/* Hero Meal Plan Display */}
              <View style={styles.weightDisplayContainer}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.weightIconContainer}>
                  <Icon name="food-apple" size={32} color={colors.text} />
                </LinearGradient>
                <Text style={styles.weightDisplayLabel}>今日膳食计划</Text>
                <Text style={styles.todayDate}>{todayLabel}</Text>
                
                {/* Large Calories Display */}
                <View style={styles.weightDisplayBox}>
                  <Text style={styles.weightDisplayNumber}>
                    {calories || '0'}
                  </Text>
                  <Text style={styles.weightDisplayUnit}>卡路里</Text>
                </View>
              </View>

              {/* Enhanced Input Section */}
              <View style={styles.inputSection}>
                <TextInput
                  label="目标卡路里"
                  value={calories}
                  onChangeText={handleCaloriesChange}
                  inputMode="numeric"
                  keyboardType="numeric"
                  returnKeyType="done"
                  mode="outlined"
                  style={styles.weightInput}
                  error={!!calories && isCaloriesInvalid}
                  left={<TextInput.Icon icon="fire" />}
                  right={<TextInput.Affix text="卡路里" />}
                  outlineColor={'rgba(255,255,255,0.2)'}
                  activeOutlineColor={colors.primary}
                  theme={{
                    roundness: 16,
                    colors: {
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.primary,
                      onSurface: colors.text,
                    }
                  }}
                  onSubmitEditing={() => {
                    if (!isCaloriesInvalid && calories) {
                      generateMealPlan();
                    }
                  }}
                />
                <HelperText type="error" visible={!!calories && isCaloriesInvalid}>
                  请输入有效的卡路里数值 (1-5000)
                </HelperText>

                {/* Diet Type Selection */}
                <View style={styles.dietTypeSection}>
                  <Text style={styles.dietTypeTitle}>饮食偏好</Text>
                  <View style={styles.dietTypeGrid}>
                    {dietTypes.map((type) => (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.dietTypeChip,
                          dietType === type.key && styles.dietTypeChipActive
                        ]}
                        onPress={() => setDietType(type.key)}
                      >
                        <Icon name={type.icon} size={16} color={dietType === type.key ? colors.text : colors.textSecondary} />
                        <Text style={[
                          styles.dietTypeText,
                          dietType === type.key && styles.dietTypeTextActive
                        ]}>{type.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Allergies Input */}
                <TextInput
                  label="过敏食材 (可选)"
                  value={allergies}
                  onChangeText={setAllergies}
                  mode="outlined"
                  style={styles.weightInput}
                  placeholder="例如：坚果、海鲜、乳制品"
                  left={<TextInput.Icon icon="alert-circle" />}
                  outlineColor={'rgba(255,255,255,0.2)'}
                  activeOutlineColor={colors.primary}
                  theme={{
                    roundness: 16,
                    colors: {
                      onSurfaceVariant: colors.textSecondary,
                      primary: colors.primary,
                      onSurface: colors.text,
                    }
                  }}
                />
              </View>

              {/* Enhanced Quick Adjust Buttons */}
              <View style={styles.quickAdjustSection}>
                <Text style={styles.quickAdjustTitle}>快速调整卡路里</Text>
                <Animated.View style={[styles.quickRow, { transform: [{ scale: scaleAnim }] }]}>
                  {[-200, -100, +100, +200].map((delta) => (
                    <TouchableOpacity 
                      key={delta} 
                      style={[
                        styles.quickChip,
                        delta > 0 ? styles.quickChipPositive : styles.quickChipNegative
                      ]} 
                      onPress={() => adjustCalories(delta)}
                      activeOpacity={0.7}
                    >
                      <Icon 
                        name={delta > 0 ? "plus" : "minus"} 
                        size={14} 
                        color={delta > 0 ? colors.success : colors.warning} 
                        style={styles.quickChipIcon}
                      />
                      <Text style={[
                        styles.quickChipText,
                        delta > 0 ? styles.quickChipTextPositive : styles.quickChipTextNegative
                      ]}>
                        {Math.abs(delta)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              </View>

              {/* Meal Plan Display Section */}
              {mealPlan && (
                <View style={styles.mealPlanSection}>
                  <Text style={styles.mealPlanTitle}>今日膳食计划</Text>
                  <View style={styles.mealList}>
                    <View style={styles.mealItem}>
                      <Icon name="weather-sunny" size={20} color={colors.warning} />
                      <View style={styles.mealDetails}>
                        <Text style={styles.mealName}>{mealPlan.breakfast.name}</Text>
                        <Text style={styles.mealCalories}>{mealPlan.breakfast.calories} 卡路里</Text>
                      </View>
                    </View>
                    <View style={styles.mealItem}>
                      <Icon name="weather-partly-cloudy" size={20} color={colors.primary} />
                      <View style={styles.mealDetails}>
                        <Text style={styles.mealName}>{mealPlan.lunch.name}</Text>
                        <Text style={styles.mealCalories}>{mealPlan.lunch.calories} 卡路里</Text>
                      </View>
                    </View>
                    <View style={styles.mealItem}>
                      <Icon name="weather-night" size={20} color={colors.primaryDark} />
                      <View style={styles.mealDetails}>
                        <Text style={styles.mealName}>{mealPlan.dinner.name}</Text>
                        <Text style={styles.mealCalories}>{mealPlan.dinner.calories} 卡路里</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Enhanced Generate Button */}
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  onPress={generateMealPlan}
                  activeOpacity={0.8}
                  disabled={isGenerating || !calories.trim()}
                  style={[styles.saveButtonContainer, (isGenerating || !calories.trim()) && { opacity: 0.7 }]}
                >
                  <LinearGradient 
                    colors={[colors.primary, colors.primaryDark]} 
                    style={styles.saveButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isGenerating ? (
                      <>
                        <Icon name="loading" size={20} color={colors.text} style={styles.saveButtonIcon} />
                        <Text style={styles.saveText}>正在生成...</Text>
                      </>
                    ) : (
                      <>
                        <Icon name="chef-hat" size={20} color={colors.text} style={styles.saveButtonIcon} />
                        <Text style={styles.saveText}>生成膳食计划</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>
          </Animated.View>

          {/* Success Animation Overlay */}
          {showSuccessAnimation && (
            <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
              <View style={styles.successContent}>
                <Icon name="check-circle" size={60} color={colors.success} />
                <Text style={styles.successText}>膳食计划已生成！</Text>
                <Text style={styles.successSubtext}>为您量身定制的营养方案</Text>
              </View>
            </Animated.View>
          )}

          {/* Cancel Button */}
          <TouchableOpacity onPress={() => router.replace('/(main)/nutrition')} style={styles.cancelButton}>
            <Text style={styles.cancelText}>返回</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: 60, // Increased to avoid status bar/notch
    marginTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  refreshButtonInner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main Card Styles
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
  
  // Weight Display Styles
  weightDisplayContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  weightIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  weightDisplayLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  todayDate: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  weightDisplayBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weightDisplayNumber: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  weightDisplayUnit: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Input Section Styles
  inputSection: {
    marginBottom: 24,
  },
  weightInput: {
    marginBottom: 8,
  },

  // Quick Adjust Styles
  quickAdjustSection: {
    marginBottom: 24,
  },
  quickAdjustTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickChipPositive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  quickChipNegative: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: 'rgba(255, 152, 0, 0.3)',
  },
  quickChipIcon: {
    marginRight: 4,
  },
  quickChipText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 12,
  },
  quickChipTextPositive: {
    color: colors.success,
  },
  quickChipTextNegative: {
    color: colors.warning,
  },

  // Notes Section
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    minHeight: 80,
  },

  // Save Button Styles
  saveButtonContainer: {
    marginTop: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Success Animation Styles
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  successContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  successText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  successSubtext: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },

  // Diet Type Styles
  dietTypeSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  dietTypeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  dietTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    marginBottom: 8,
  },
  dietTypeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dietTypeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  dietTypeTextActive: {
    color: colors.text,
  },

  // Meal Plan Styles
  mealPlanSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  mealPlanTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  mealList: {
    gap: 12,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mealDetails: {
    marginLeft: 12,
    flex: 1,
  },
  mealName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealCalories: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  // Cancel Button
  cancelButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
}); 