import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, FlatList, Platform } from 'react-native';
import { PanGestureHandler, GestureHandlerRootView, State, NativeViewGestureHandler } from 'react-native-gesture-handler';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/styles/colors';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

const { height: screenHeight, width } = Dimensions.get('window');
const isTablet = Platform.OS === 'ios' && (width >= 768 || screenHeight >= 768);
const ITEM_HEIGHT = isTablet ? 70 : 60;
const WEIGHT_MIN_KG = 40;
const WEIGHT_MAX_KG = 120;
const WEIGHT_DATA_KG = Array.from({ length: WEIGHT_MAX_KG - WEIGHT_MIN_KG + 1 }, (_, i) => WEIGHT_MIN_KG + i);
const WEIGHT_DATA_LBS = WEIGHT_DATA_KG.map(kg => Math.round(kg * 2.20462));

// Calculate picker height and center offset - make it very compact to fit button
// Show 3 items on both iPad and phone to ensure button is always visible
const PICKER_HEIGHT = ITEM_HEIGHT * 3;
const CENTER_OFFSET = PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2;

const WeightScreen = () => {
  const [weightKg, setWeightKg] = useState(70); // Set to 154lbs (70kg) as default
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Default to 70kg (154lbs)
    const defaultWeightKg = 70;
    const kgIndex = WEIGHT_DATA_KG.findIndex(weight => weight === defaultWeightKg);
    const lbsValue = Math.round(defaultWeightKg * 2.20462); // 154 lbs
    const lbsIndex = WEIGHT_DATA_LBS.findIndex(weight => weight === lbsValue);
    return lbsIndex >= 0 ? lbsIndex : kgIndex;
  });
  const flatListRef = useRef<FlatList<number>>(null);
  const gestureStartY = useRef(0);
  const initialScrollOffset = useRef(0);
  const isGesturing = useRef(false);
  const currentOffset = useRef(0);
  const lastUpdateTime = useRef(0);
  const panGestureRef = useRef<any>(null);
  const flatListGestureRef = useRef<any>(null);

  const weightData = unit === 'kg' ? WEIGHT_DATA_KG : WEIGHT_DATA_LBS;
  const displayed = unit === 'kg' ? weightKg : weightKg * 2.20462;

  // Initial scroll to selected position
  useEffect(() => {
    if (flatListRef.current) {
      const timeout = setTimeout(() => {
        flatListRef.current?.scrollToOffset({ 
          offset: selectedIndex * ITEM_HEIGHT, 
          animated: false 
        });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Handle unit changes
  useEffect(() => {
    const value = unit === 'kg' ? Math.round(weightKg) : Math.round(weightKg * 2.20462);
    const index = weightData.findIndex(x => x === value);
    if (index >= 0) {
      setSelectedIndex(index);
      // Position scroll to center the selected item
      const centeredOffset = index * ITEM_HEIGHT;
      currentOffset.current = centeredOffset;
      flatListRef.current?.scrollToOffset({ 
        offset: currentOffset.current, 
        animated: true 
      });
    }
  }, [unit, weightData]);

  const handleValueChange = (index: number) => {
    const val = weightData[index];
    setSelectedIndex(index);
    if (unit === 'kg') {
      setWeightKg(val);
    } else {
      setWeightKg(val / 2.20462);
    }
  };

  // Optimized update function to minimize re-renders
  const updateStateFromOffset = useCallback((offset: number) => {
    const newIndex = Math.round(offset / ITEM_HEIGHT);
    
    if (newIndex >= 0 && newIndex < weightData.length && newIndex !== selectedIndex) {
      const selectedValue = weightData[newIndex];
      setSelectedIndex(newIndex);
      
      if (unit === 'kg') {
        setWeightKg(selectedValue);
      } else {
        setWeightKg(selectedValue / 2.20462);
      }
    }
  }, [selectedIndex, unit, weightData]);

  const onPanGestureEvent = (event: any) => {
    const { translationY, state } = event.nativeEvent;
    
    if (state === State.BEGAN) {
      isGesturing.current = true;
      gestureStartY.current = translationY;
      initialScrollOffset.current = selectedIndex * ITEM_HEIGHT;
      currentOffset.current = initialScrollOffset.current;
    } else if (state === State.ACTIVE && isGesturing.current) {
      const deltaY = translationY - gestureStartY.current;
      const newOffset = initialScrollOffset.current - deltaY;
      const maxOffset = (weightData.length - 1) * ITEM_HEIGHT;
      const clampedOffset = Math.max(0, Math.min(newOffset, maxOffset));
      
      currentOffset.current = clampedOffset;
      
      // Immediately update the visual position
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToOffset({ 
          offset: clampedOffset, 
          animated: false 
        });
      });
      
      // Update state immediately for real-time feedback
      const newIndex = Math.round(clampedOffset / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(newIndex, weightData.length - 1));
      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex);
      }
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      isGesturing.current = false;
      gestureStartY.current = 0;
      initialScrollOffset.current = 0;
      
      // Snap to final position with animation
      const finalIndex = Math.round(currentOffset.current / ITEM_HEIGHT);
      const clampedFinalIndex = Math.max(0, Math.min(finalIndex, weightData.length - 1));
      const finalCenteredOffset = clampedFinalIndex * ITEM_HEIGHT;
      
      setSelectedIndex(clampedFinalIndex);
      flatListRef.current?.scrollToOffset({ offset: Math.max(0, finalCenteredOffset), animated: true });
    }
  };

  const handleNext = async () => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    
    // 计算原始值和公制值
    let originalValue: number;
    let kgValue: number;
    
    if (unit === 'lbs') {
      // 对于磅，存储用户输入的磅值
      originalValue = Math.round(weightKg * 2.20462);
      kgValue = weightKg; // 已经是kg
    } else {
      // 对于kg，原始值就是kg值
      originalValue = weightKg;
      kgValue = weightKg;
    }
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ 
        id: user.id,
        weight_kg: kgValue,
        weight_original_value: originalValue,
        weight_unit_preference: unit,
        onboarding_completed: false
      }).select(),
      `Saving weight: ${kgValue}kg (${originalValue}${unit === 'lbs' ? 'lbs' : 'kg'})`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { weight_kg: weightKg }); } catch {}
    
    console.log('🚀 Navigating to weight-trend screen...');
    router.replace('/(onboarding)/weight-trend');
  };

  const handleBack = () => {
    router.replace('/(onboarding)/height');
  };

  const handleClose = () => {
    router.replace('/(main)/dashboard');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingLayout
      title="Your Current Weight"
      subtitle="We use your weight to tailor your fitness and nutrition plan"
      progress={0.416}
      currentStep={5}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/height"
      onClose={handleClose}
      disableScroll={true}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.questionLabel}>
            <Text style={styles.questionLabelText}>Question 5</Text>
          </View>
          <View style={styles.unitSelector}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.08)']}
            style={styles.unitSelectorGradient}
          >
              <TouchableOpacity 
                style={[styles.unitButton, unit === 'kg' && styles.unitButtonSelected]} 
                onPress={() => setUnit('kg')}
                activeOpacity={0.7}
                hitSlop={{ top: isTablet ? 15 : 10, bottom: isTablet ? 15 : 10, left: isTablet ? 15 : 10, right: isTablet ? 15 : 10 }}
                delayPressIn={0}
              >
                {unit === 'kg' && (
                  <LinearGradient
                    colors={['#FF6B35', '#FF6B35']}
                    style={styles.unitButtonGradient}
                  />
                )}
                <Text style={[styles.unitText, unit === 'kg' && styles.unitTextSelected]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.unitButton, unit === 'lbs' && styles.unitButtonSelected]} 
                onPress={() => setUnit('lbs')}
                activeOpacity={0.7}
                hitSlop={{ top: isTablet ? 15 : 10, bottom: isTablet ? 15 : 10, left: isTablet ? 15 : 10, right: isTablet ? 15 : 10 }}
                delayPressIn={0}
              >
                {unit === 'lbs' && (
                  <LinearGradient
                    colors={['#FF6B35', '#FF6B35']}
                    style={styles.unitButtonGradient}
                  />
                )}
                <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextSelected]}>lbs</Text>
              </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
      <View style={styles.rulerArea}>
        <NativeViewGestureHandler ref={flatListGestureRef}>
          <FlatList
            ref={flatListRef}
            data={weightData}
            keyExtractor={(item) => item.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            scrollEnabled={true}
            removeClippedSubviews={false}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={16}
            windowSize={21}
            bounces={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            alwaysBounceVertical={true}
            scrollEventThrottle={16}
            getItemLayout={(_, idx) => ({ length: ITEM_HEIGHT, offset: idx * ITEM_HEIGHT, index: idx })}
            onMomentumScrollEnd={e => { if (!isGesturing.current) { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); const clampedIdx = Math.max(0, Math.min(idx, weightData.length - 1)); handleValueChange(clampedIdx); } }}
            onScrollEndDrag={e => { if (!isGesturing.current) { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); const clampedIdx = Math.max(0, Math.min(idx, weightData.length - 1)); handleValueChange(clampedIdx); } }}
            renderItem={({ item, index }) => {
              const isSelected = index === selectedIndex;
              return (
                <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}>
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>{item}</Text>
                </View>
              );
            }}
            contentContainerStyle={{
              paddingTop: CENTER_OFFSET,
              paddingBottom: CENTER_OFFSET,
              minHeight: PICKER_HEIGHT + CENTER_OFFSET * 2
            }}
          />
        </NativeViewGestureHandler>
        <PanGestureHandler 
          ref={panGestureRef}
          onGestureEvent={onPanGestureEvent}
          simultaneousHandlers={flatListGestureRef}
          shouldCancelWhenOutside={false}
          activeOffsetY={[-5, 5]}
          failOffsetX={[-30, 30]}
        >
          <View style={[styles.selectionOverlay, { top: CENTER_OFFSET }]}>
            <View style={styles.selectionIndicator} />
          </View>
        </PanGestureHandler>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
          <OnboardingButton
            title="Continue"
            onPress={handleNext}
          />
        </View>
      </View>
    </OnboardingLayout>
    </GestureHandlerRootView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 0,
    paddingBottom: 0,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: isTablet ? 40 : 40,
    paddingTop: isTablet ? 4 : 8,
    paddingBottom: isTablet ? 4 : 8,
    flexShrink: 0,
    flexGrow: 0,
  },
  questionLabel: {
    marginBottom: 8,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
    width: '100%',
  },
  questionLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  unitSelector: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignSelf: 'center',
    width: isTablet ? 260 : 220,
    zIndex: 10,
    marginBottom: isTablet ? 4 : 8,
  },
  unitSelectorBlur: {
    overflow: 'hidden',
  },
  unitSelectorGradient: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 18,
    width: '100%',
  },
  unitButton: {
    flex: 1,
    paddingVertical: isTablet ? 12 : 11,
    paddingHorizontal: 0,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonSelected: {
    // keep it clean: no heavy shadow, just the orange fill
  },
  unitButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  unitText: {
    fontSize: isTablet ? 18 : 16,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '700',
    letterSpacing: 0,
    zIndex: 2,
    position: 'relative',
  },
  unitTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
    zIndex: 2,
    position: 'relative',
  },
  rulerArea: {
    height: PICKER_HEIGHT,
    width: '100%',
    flexShrink: 0,
    flexGrow: 0,
    minHeight: PICKER_HEIGHT,
    maxHeight: PICKER_HEIGHT,
    marginBottom: isTablet ? 4 : 8,
  },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: isTablet ? 30 : 20,
    minHeight: ITEM_HEIGHT,
  },
  itemContainerSelected: {},
  itemBlur: {
    position: 'absolute',
    top: 10,
    left: -40,
    right: -40,
    bottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  itemGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  itemText: {
    fontSize: isTablet ? 30 : 26,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  itemTextSelected: {
    fontSize: isTablet ? 30 : 26,
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 0.5,
  },
  selectionOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    overflow: 'visible',
    zIndex: 10,
  },
  selectionIndicator: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: isTablet ? 12 : 16,
    flexShrink: 0,
  },
});

export default WeightScreen; 