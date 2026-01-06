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
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';
// import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { height: screenHeight, width } = Dimensions.get('window');
const isTablet = Platform.OS === 'ios' && (width >= 768 || screenHeight >= 768);
const ITEM_HEIGHT = isTablet ? 70 : 60;
// More reasonable height ranges with better increments
const HEIGHT_MIN_CM = 140;
const HEIGHT_MAX_CM = 210;
const HEIGHT_DATA_CM = Array.from({ length: (HEIGHT_MAX_CM - HEIGHT_MIN_CM) + 1 }, (_, i) => HEIGHT_MIN_CM + i);

// Feet and inches data: 4'8" to 6'11" (practical range)
const HEIGHT_DATA_FT_IN = [];
for (let feet = 4; feet <= 6; feet++) {
  const maxInches = feet === 6 ? 11 : 11; // 6'11" is the max
  const minInches = feet === 4 ? 8 : 0; // 4'8" is the min
  for (let inches = minInches; inches <= maxInches; inches++) {
    HEIGHT_DATA_FT_IN.push({ feet, inches, cm: Math.round((feet * 12 + inches) * 2.54) });
  }
}

// Calculate picker height and center offset - make it very compact to fit button
// Show 3 items on iPad and phone to ensure button is always visible
const PICKER_HEIGHT = ITEM_HEIGHT * 3;
const CENTER_OFFSET = PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2;

const HeightScreen = () => {
  const [heightCm, setHeightCm] = useState(173); // ~5'8"
  const [unit, setUnit] = useState('cm');
  const [selectedIndex, setSelectedIndex] = useState(33); // Default to 173cm (173 - 140 = index 33 in cm array)
  const flatListRef = useRef<FlatList<any>>(null);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const gestureStartY = useRef(0);
  const initialScrollOffset = useRef(0);
  const isGesturing = useRef(false);
  const currentOffset = useRef(0);
  const lastUpdateTime = useRef(0);
  const panGestureRef = useRef<any>(null);
  const flatListGestureRef = useRef<any>(null);

  // Get current data array based on unit
  const getCurrentData = () => unit === 'cm' ? HEIGHT_DATA_CM : HEIGHT_DATA_FT_IN;
  
  // Convert between units
  const cmToFeet = (cm: number) => Math.round(cm * 0.0328084 * 10) / 10;
  const feetToCm = (feet: number) => Math.round(feet * 30.48);
  const feetInchesToCm = (feet: number, inches: number) => Math.round((feet * 12 + inches) * 2.54);
  
  // Get displayed value in current unit
  const getDisplayedValue = () => {
    if (unit === 'cm') return heightCm;
    // Find the closest feet/inches combination
    return HEIGHT_DATA_FT_IN.find(item => Math.abs(item.cm - heightCm) <= 1) || HEIGHT_DATA_FT_IN[20]; // Default to ~5'8"
  };

  useEffect(() => {
    // scroll to current value on unit change or initial
    const currentData = getCurrentData();
    const displayedValue = getDisplayedValue();
    
    let index = 0;
    if (unit === 'cm') {
      index = currentData.findIndex(x => x === heightCm);
    } else {
      // For feet/inches, find by cm value
      index = currentData.findIndex(item => Math.abs(item.cm - heightCm) <= 1);
    }
    
    if (index >= 0) {
      setSelectedIndex(index);
      // Position scroll to center the selected item
      const centeredOffset = index * ITEM_HEIGHT;
      currentOffset.current = centeredOffset;
      flatListRef.current?.scrollToOffset({ 
        offset: currentOffset.current, 
        animated: false 
      });
    }
  }, [unit]);

  const handleValueChange = (index: number) => {
    const currentData = getCurrentData();
    const selectedValue = currentData[index];
    
    setSelectedIndex(index);
    
    if (unit === 'cm') {
      setHeightCm(selectedValue);
    } else {
      // Use the cm value from the feet/inches object
      setHeightCm(selectedValue.cm);
    }
  };

  // Optimized update function to minimize re-renders
  const updateStateFromOffset = useCallback((offset: number) => {
    const newIndex = Math.round(offset / ITEM_HEIGHT);
    const currentData = getCurrentData();
    
    if (newIndex >= 0 && newIndex < currentData.length && newIndex !== selectedIndex) {
      const selectedValue = currentData[newIndex];
      setSelectedIndex(newIndex);
      
      if (unit === 'cm') {
        setHeightCm(selectedValue);
      } else {
        setHeightCm(feetToCm(selectedValue));
      }
    }
  }, [selectedIndex, unit]);

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
      const maxOffset = (getCurrentData().length - 1) * ITEM_HEIGHT;
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
      const clampedIndex = Math.max(0, Math.min(newIndex, getCurrentData().length - 1));
      if (clampedIndex !== selectedIndex) {
        setSelectedIndex(clampedIndex);
      }
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      isGesturing.current = false;
      gestureStartY.current = 0;
      initialScrollOffset.current = 0;
      
      // Snap to final position with animation
      const finalIndex = Math.round(currentOffset.current / ITEM_HEIGHT);
      const clampedFinalIndex = Math.max(0, Math.min(finalIndex, getCurrentData().length - 1));
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
    let cmValue: number;
    
    if (unit === 'ft') {
      // 对于英尺，存储小数格式（如 6.1 表示 6'1"）
      const displayedValue = getDisplayedValue();
      originalValue = parseFloat(`${displayedValue.feet}.${displayedValue.inches}`);
      cmValue = heightCm; // 已经是cm
    } else {
      // 对于cm，原始值就是cm值
      originalValue = heightCm;
      cmValue = heightCm;
    }
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ 
        id: user.id,
        height_cm: cmValue,
        height_original_value: originalValue,
        height_unit_preference: unit,
        onboarding_completed: false
      }).select(),
      `Saving height: ${cmValue}cm (${originalValue}${unit === 'ft' ? 'ft' : 'cm'})`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { height_cm: heightCm }); } catch {}
    try { analyticsTrack('onboarding_step_next', { step: 'height' }); } catch {}
    
    console.log('🚀 Navigating to weight screen...');
    router.replace('/(onboarding)/weight');
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'height' }); } catch {}
    router.replace('/(onboarding)/birthday');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'height' }); } catch {}
  };


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingLayout
      title="Your Height"
      subtitle="We use your height to personalize your fitness and nutrition plan"
      progress={0.333}
      currentStep={4}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/birthday"
      onClose={handleClose}
      disableScroll={true}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.questionLabel}>
            <Text style={styles.questionLabelText}>Question 4</Text>
          </View>
          <View style={styles.unitSelector}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.08)']}
              style={styles.unitSelectorGradient}
            >
                <TouchableOpacity style={[styles.unitButton, unit==='cm'&&styles.unitButtonSelected]} onPress={()=>setUnit('cm')}>
                  {unit === 'cm' && (
                    <LinearGradient
                      colors={['#FF6B35', '#FF6B35']}
                      style={styles.unitButtonGradient}
                    />
                  )}
                  <Text style={[styles.unitText,unit==='cm'&&styles.unitTextSelected]}>cm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.unitButton, unit==='ft'&&styles.unitButtonSelected]} onPress={()=>setUnit('ft')}>
                  {unit === 'ft' && (
                    <LinearGradient
                      colors={['#FF6B35', '#FF6B35']}
                      style={styles.unitButtonGradient}
                    />
                  )}
                  <Text style={[styles.unitText,unit==='ft'&&styles.unitTextSelected]}>ft</Text>
                </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
        <View style={styles.rulerArea}>
        <NativeViewGestureHandler ref={flatListGestureRef}>
          <FlatList
            ref={flatListRef}
            data={getCurrentData()}
            keyExtractor={(item, index) => {
              if (unit === 'cm') {
                return item.toString();
              } else {
                return `${item.feet}-${item.inches}`;
              }
            }}
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
            getItemLayout={(_,idx)=>({length:ITEM_HEIGHT,offset:idx*ITEM_HEIGHT,index:idx})}
            onMomentumScrollEnd={e=>{if(!isGesturing.current){const idx=Math.round(e.nativeEvent.contentOffset.y/ITEM_HEIGHT);const clampedIdx=Math.max(0,Math.min(idx,getCurrentData().length-1));handleValueChange(clampedIdx);}}}
            onScrollEndDrag={e=>{if(!isGesturing.current){const idx=Math.round(e.nativeEvent.contentOffset.y/ITEM_HEIGHT);const clampedIdx=Math.max(0,Math.min(idx,getCurrentData().length-1));handleValueChange(clampedIdx);}}}
            renderItem={({item, index})=>{
              const isSelected = index === selectedIndex;
              const label = unit==='cm' ? item.toString() : `${item.feet}'${item.inches}"`;
              return (
                <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}>
                  <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>{label}</Text>
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
          <View style={[styles.selectionOverlay, {top: CENTER_OFFSET}]}>
            <View style={styles.selectionIndicator} />
          </View>
        </PanGestureHandler>
        </View>
        <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
          <OnboardingButton
            title="Next"
            onPress={handleNext}
          />
        </View>
      </View>
    </OnboardingLayout>
    </GestureHandlerRootView>
  );
};
const styles=StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 0,
    paddingBottom: 0,
  },
  content:{
    alignItems:'center',
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
  title:{fontSize:24,fontWeight:'bold',color:colors.text,marginBottom:8},
  subtitle:{fontSize:16,color:colors.textSecondary,textAlign:'center',marginBottom:32},
  unitSelector:{
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
  unitButton:{
    flex: 1,
    paddingVertical: isTablet ? 12 : 11,
    paddingHorizontal: 0,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitButtonSelected:{
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
  unitText:{
    fontSize: isTablet ? 18 : 16,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '700',
    letterSpacing: 0,
    zIndex: 2,
    position: 'relative',
  },
  unitTextSelected:{
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0,
    zIndex: 2,
    position: 'relative',
  },
  rulerArea:{
    height: PICKER_HEIGHT,
    width: '100%',
    flexShrink: 0,
    flexGrow: 0,
    minHeight: PICKER_HEIGHT,
    maxHeight: PICKER_HEIGHT,
    marginBottom: isTablet ? 4 : 8,
  },
  itemContainer:{
    height:ITEM_HEIGHT,
    justifyContent:'center',
    alignItems:'center',
    marginHorizontal: isTablet ? 30 : 20,
    minHeight: ITEM_HEIGHT,
  },
  itemContainerSelected:{},
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
  itemText:{
    fontSize: isTablet ? 30 : 26,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  itemTextSelected:{
    fontSize: isTablet ? 30 : 26,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  selectionOverlay:{
    position:'absolute',
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
  footer:{
    paddingHorizontal: 24, 
    paddingTop: isTablet ? 12 : 16,
    flexShrink: 0,
  },
});

export default HeightScreen; 