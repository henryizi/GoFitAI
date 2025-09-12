import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { PanGestureHandler, GestureHandlerRootView, State, NativeViewGestureHandler } from 'react-native-gesture-handler';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = 60;
const WEIGHT_MIN_KG = 40;
const WEIGHT_MAX_KG = 120;
const WEIGHT_DATA_KG = Array.from({ length: WEIGHT_MAX_KG - WEIGHT_MIN_KG + 1 }, (_, i) => WEIGHT_MIN_KG + i);
const WEIGHT_DATA_LBS = WEIGHT_DATA_KG.map(kg => Math.round(kg * 2.20462));

// Calculate picker height and center offset to show ~5 items (2 above, 1 center, 2 below)
const PICKER_HEIGHT = ITEM_HEIGHT * 5;
const CENTER_OFFSET = PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2;

const WeightScreen = () => {
  const [weightKg, setWeightKg] = useState(70); // Set to 154lbs (70kg) as default
  const { user } = useAuth();
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
    
    // save weight, original value, and unit preference to profile
    await (supabase.from('profiles') as any).update({ 
      weight_kg: kgValue,
      weight_original_value: originalValue,
      weight_unit_preference: unit 
    }).eq('id', user.id);
    try { identify(user.id, { weight_kg: weightKg }); } catch {}
    router.push('/(onboarding)/weight-trend');
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
      progress={0.45}
      currentStep={5}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/height"
      onClose={handleClose}
      disableScroll={true}
    >
      <View style={styles.content}>
        
        <View style={styles.unitSelector}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.unitSelectorGradient}
          >
              <TouchableOpacity style={[styles.unitButton, unit === 'kg' && styles.unitButtonSelected]} onPress={() => setUnit('kg')}>
                {unit === 'kg' && (
                  <LinearGradient
                    colors={['#FF6B35', '#FF8E53']}
                    style={styles.unitButtonGradient}
                  />
                )}
                <Text style={[styles.unitText, unit === 'kg' && styles.unitTextSelected]}>kg</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.unitButton, unit === 'lbs' && styles.unitButtonSelected]} onPress={() => setUnit('lbs')}>
                {unit === 'lbs' && (
                  <LinearGradient
                    colors={['#FF6B35', '#FF8E53']}
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
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={16}
            windowSize={21}
            getItemLayout={(_, idx) => ({ length: ITEM_HEIGHT, offset: idx * ITEM_HEIGHT, index: idx })}
            onMomentumScrollEnd={e => { if (!isGesturing.current) { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); const clampedIdx = Math.max(0, Math.min(idx, weightData.length - 1)); handleValueChange(clampedIdx); } }}
            onScrollEndDrag={e => { if (!isGesturing.current) { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); const clampedIdx = Math.max(0, Math.min(idx, weightData.length - 1)); handleValueChange(clampedIdx); } }}
            renderItem={({ item, index }) => {
              const isSelected = index === selectedIndex;
              return (
                <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}>
                  {isSelected && (
                    <LinearGradient
                      colors={['rgba(255, 107, 53, 0.4)', 'rgba(255, 142, 83, 0.3)']}
                      style={styles.itemGradient}
                    >
                      <Text style={[styles.itemText, styles.itemTextSelected]}>{item}</Text>
                    </LinearGradient>
                  )}
                  {!isSelected && (
                    <Text style={styles.itemText}>{item}</Text>
                  )}
                </View>
              );
            }}
            contentContainerStyle={{ paddingTop: CENTER_OFFSET, paddingBottom: CENTER_OFFSET }}
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
            <LinearGradient
              colors={['transparent', 'rgba(255, 107, 53, 0.3)', 'rgba(255, 107, 53, 0.3)', 'transparent']}
              style={styles.selectionGradient}
            />
          </View>
        </PanGestureHandler>
      </View>
      <View style={styles.footer}>
        <OnboardingButton
          title="Continue"
          onPress={handleNext}
        />
      </View>
    </OnboardingLayout>
    </GestureHandlerRootView>
  );
};
const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 40 },
  unitSelector: {
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  unitSelectorBlur: {
    overflow: 'hidden',
  },
  unitSelectorGradient: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 28,
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  unitButtonSelected: {
    elevation: 5,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  unitButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
  },
  unitText: {
    fontSize: 17,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  unitTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rulerArea: { height: PICKER_HEIGHT, width: '100%' },
  itemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
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
    fontSize: 26,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  itemTextSelected: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(255, 107, 53, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  selectionOverlay: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: ITEM_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    zIndex: 10,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  selectionGradient: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  footer: { padding: 24 },
});

export default WeightScreen; 