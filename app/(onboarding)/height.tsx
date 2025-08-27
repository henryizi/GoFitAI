import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, FlatList } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = 60;
const HEIGHT_MIN_CM = 120;
const HEIGHT_MAX_CM = 220;
const HEIGHT_DATA_CM = Array.from({ length: HEIGHT_MAX_CM - HEIGHT_MIN_CM + 1 }, (_, i) => HEIGHT_MIN_CM + i);

// Feet data: 4.0 to 7.3 feet (48 to 87 inches)
const HEIGHT_MIN_FT = 4.0;
const HEIGHT_MAX_FT = 7.3;
const HEIGHT_DATA_FT = Array.from({ length: 40 }, (_, i) => Math.round((HEIGHT_MIN_FT + i * 0.1) * 10) / 10);
const CENTER_OFFSET = (screenHeight * 0.5 - ITEM_HEIGHT) / 2;

const HeightScreen = () => {
  const [heightCm, setHeightCm] = useState(182);
  const [unit, setUnit] = useState('cm');
  const [selectedIndex, setSelectedIndex] = useState(62); // Default to 182cm (index 62 in cm array)
  const flatListRef = useRef<FlatList<number>>(null);
  const { user } = useAuth();

  // Get current data array based on unit
  const getCurrentData = () => unit === 'cm' ? HEIGHT_DATA_CM : HEIGHT_DATA_FT;
  
  // Convert between units
  const cmToFeet = (cm: number) => Math.round(cm * 0.0328084 * 10) / 10;
  const feetToCm = (feet: number) => Math.round(feet * 30.48);
  
  // Get displayed value in current unit
  const getDisplayedValue = () => unit === 'cm' ? heightCm : cmToFeet(heightCm);

  useEffect(() => {
    // scroll to current value on unit change or initial
    const currentData = getCurrentData();
    const displayedValue = getDisplayedValue();
    const index = currentData.findIndex(x => x === Math.round(displayedValue * 10) / 10);
    if (index >= 0) {
      setSelectedIndex(index);
      flatListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
    }
  }, [unit]);

  const handleValueChange = (index: number) => {
    const currentData = getCurrentData();
    const selectedValue = currentData[index];
    
    setSelectedIndex(index);
    
    if (unit === 'cm') {
      setHeightCm(selectedValue);
    } else {
      // Convert feet to cm
      setHeightCm(feetToCm(selectedValue));
    }
  };

  const handleNext = async () => {
    if (!user) {
      // user not logged in, go to login
      router.replace('/(auth)/login');
      return;
    }
    // save height to profile
    await supabase
      .from('profiles')
      .update({ height: heightCm })
      .eq('id', user.id);
    try { identify(user.id, { height_cm: heightCm }); } catch {}
    try { analyticsTrack('onboarding_step_next', { step: 'height' }); } catch {}
    router.push('/(onboarding)/weight');
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'height' }); } catch {}
    router.replace('/(onboarding)/birthday');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'height' }); } catch {}
  };

  const ProgressDots = () => (
    <View style={styles.dotsContainer}>
      {[0,1,2,3].map(i => (
        <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
      ))}
    </View>
  );

  return (
    <OnboardingLayout
      title="Your Height"
      subtitle="We use your height to personalize your fitness and nutrition plan"
      progress={60}
      showBackButton={true}
      showCloseButton={true}
      onBack={handleBack}
      previousScreen="/(onboarding)/birthday"
      onClose={handleClose}
    >
      <View style={styles.content}>
        <View style={styles.unitSelector}>
          <TouchableOpacity style={[styles.unitButton, unit==='cm'&&styles.unitButtonSelected]} onPress={()=>setUnit('cm')}>
            <Text style={[styles.unitText,unit==='cm'&&styles.unitTextSelected]}>cm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.unitButton, unit==='ft'&&styles.unitButtonSelected]} onPress={()=>setUnit('ft')}>
            <Text style={[styles.unitText,unit==='ft'&&styles.unitTextSelected]}>ft</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.rulerArea}>
        <FlatList
          ref={flatListRef}
          data={getCurrentData()}
          keyExtractor={item=>item.toString()}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          getItemLayout={(_,idx)=>({length:ITEM_HEIGHT,offset:idx*ITEM_HEIGHT,index:idx})}
          onMomentumScrollEnd={e=>{const idx=Math.round(e.nativeEvent.contentOffset.y/ITEM_HEIGHT);handleValueChange(idx);}}
          renderItem={({item, index})=>{
            const isSelected = index === selectedIndex;
            const label = unit==='cm'?item.toString():item.toFixed(1);
            return (
              <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}> 
                <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>{label}</Text>
              </View>
            );
          }}
          contentContainerStyle={{paddingTop:CENTER_OFFSET,paddingBottom:CENTER_OFFSET}}
        />
        <View style={[styles.selectionOverlay,{top:CENTER_OFFSET}]} />
      </View>
      <View style={styles.footer}>
        <Button mode="contained" onPress={handleNext} style={styles.nextButton} labelStyle={{color:'white'}}>Next</Button>
      </View>
    </OnboardingLayout>
  );
};
const styles=StyleSheet.create({
  content:{alignItems:'center',paddingHorizontal:40,marginTop:8},
  title:{fontSize:24,fontWeight:'bold',color:colors.text,marginBottom:8},
  subtitle:{fontSize:16,color:colors.textSecondary,textAlign:'center',marginBottom:32},
  unitSelector:{flexDirection:'row',backgroundColor:colors.primaryLight,borderRadius:24,padding:4},
  unitButton:{paddingVertical:10,paddingHorizontal:24,borderRadius:20},
  unitButtonSelected:{backgroundColor:'white',elevation:3},
  unitText:{fontSize:16,color:colors.textSecondary,fontWeight:'bold'},
  unitTextSelected:{color:colors.text},
  rulerArea:{flex:1,width:'100%'},
  itemContainer:{height:ITEM_HEIGHT,justifyContent:'center',alignItems:'center'},
  itemContainerSelected:{},
  itemText:{fontSize:24,color:colors.textSecondary},
  itemTextSelected:{fontSize:28,color:colors.text,fontWeight:'bold'},
  selectionOverlay:{position:'absolute',left:0,right:0,height:ITEM_HEIGHT,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.primary},
  footer:{padding:24},
  nextButton:{backgroundColor:colors.accent,borderRadius:24,paddingVertical:16,minHeight:56},
});

export default HeightScreen; 