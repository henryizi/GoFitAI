import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { PanGestureHandler, GestureHandlerRootView, State, NativeViewGestureHandler } from 'react-native-gesture-handler';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
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

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = 60;
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

// Calculate picker height and center offset to show ~5 items (2 above, 1 center, 2 below)
const PICKER_HEIGHT = ITEM_HEIGHT * 5;
const CENTER_OFFSET = PICKER_HEIGHT / 2 - ITEM_HEIGHT / 2;

const HeightScreen = () => {
  const [heightCm, setHeightCm] = useState(173); // ~5'8"
  const [unit, setUnit] = useState('cm');
  const [selectedIndex, setSelectedIndex] = useState(33); // Default to 173cm (173 - 140 = index 33 in cm array)
  const flatListRef = useRef<FlatList<any>>(null);
  const { user } = useAuth();
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
      progress={0.36}
      currentStep={4}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/birthday"
      onClose={handleClose}
      disableScroll={true}
    >
      <View style={styles.content}>
        <View style={styles.unitSelector}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.unitSelectorGradient}
          >
              <TouchableOpacity style={[styles.unitButton, unit==='cm'&&styles.unitButtonSelected]} onPress={()=>setUnit('cm')}>
                {unit === 'cm' && (
                  <LinearGradient
                    colors={['#FF6B35', '#FF8E53']}
                    style={styles.unitButtonGradient}
                  />
                )}
                <Text style={[styles.unitText,unit==='cm'&&styles.unitTextSelected]}>cm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.unitButton, unit==='ft'&&styles.unitButtonSelected]} onPress={()=>setUnit('ft')}>
                {unit === 'ft' && (
                  <LinearGradient
                    colors={['#FF6B35', '#FF8E53']}
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
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={16}
            windowSize={21}
            getItemLayout={(_,idx)=>({length:ITEM_HEIGHT,offset:idx*ITEM_HEIGHT,index:idx})}
            onMomentumScrollEnd={e=>{if(!isGesturing.current){const idx=Math.round(e.nativeEvent.contentOffset.y/ITEM_HEIGHT);const clampedIdx=Math.max(0,Math.min(idx,getCurrentData().length-1));handleValueChange(clampedIdx);}}}
            onScrollEndDrag={e=>{if(!isGesturing.current){const idx=Math.round(e.nativeEvent.contentOffset.y/ITEM_HEIGHT);const clampedIdx=Math.max(0,Math.min(idx,getCurrentData().length-1));handleValueChange(clampedIdx);}}}
            renderItem={({item, index})=>{
              const isSelected = index === selectedIndex;
              const label = unit==='cm' ? item.toString() : `${item.feet}'${item.inches}"`;
              return (
                <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}>
                  {isSelected && (
                    <LinearGradient
                      colors={['rgba(255, 107, 53, 0.4)', 'rgba(255, 142, 83, 0.3)']}
                      style={styles.itemGradient}
                    >
                      <Text style={[styles.itemText, styles.itemTextSelected]}>{label}</Text>
                    </LinearGradient>
                  )}
                  {!isSelected && (
                    <Text style={styles.itemText}>{label}</Text>
                  )}
                </View>
              );
            }}
            contentContainerStyle={{paddingTop:CENTER_OFFSET,paddingBottom:CENTER_OFFSET}}
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
            <LinearGradient
              colors={['transparent', 'rgba(255, 107, 53, 0.3)', 'rgba(255, 107, 53, 0.3)', 'transparent']}
              style={styles.selectionGradient}
            />
          </View>
        </PanGestureHandler>
      </View>
      <View style={styles.footer}>
        <OnboardingButton
          title="Next"
          onPress={handleNext}
        />
      </View>
    </OnboardingLayout>
    </GestureHandlerRootView>
  );
};
const styles=StyleSheet.create({
  content:{alignItems:'center',paddingHorizontal:40,paddingTop:20,paddingBottom:20},
  title:{fontSize:24,fontWeight:'bold',color:colors.text,marginBottom:8},
  subtitle:{fontSize:16,color:colors.textSecondary,textAlign:'center',marginBottom:32},
  unitSelector:{
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
  unitButton:{
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  unitButtonSelected:{
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
  unitText:{
    fontSize: 17,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  unitTextSelected:{
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  rulerArea:{height:PICKER_HEIGHT,width:'100%'},
  itemContainer:{
    height:ITEM_HEIGHT,
    justifyContent:'center',
    alignItems:'center',
    marginHorizontal: 20,
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
    fontSize: 26,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  itemTextSelected:{
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '900',
    textShadowColor: 'rgba(255, 107, 53, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  selectionOverlay:{
    position:'absolute',
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
  footer:{paddingHorizontal: 24, paddingTop: 16, paddingBottom: 0},
});

export default HeightScreen; 