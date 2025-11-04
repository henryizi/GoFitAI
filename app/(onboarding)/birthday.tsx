import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { LinearGradient } from 'expo-linear-gradient';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { formatDateToYYYYMMDD } from '../../src/utils/dateUtils';
import { saveOnboardingData } from '../../src/utils/onboardingSave';

const { width } = Dimensions.get('window');

const BirthdayScreen = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 25);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);

  const { user } = useAuth();

  const handleNext = async () => {
    if (!user) {
      router.replace('/(onboarding)/height');
      return;
    }
    
    // Create date string in YYYY-MM-DD format without timezone conversion
    // This prevents the common issue where dates get shifted by timezone when using toISOString()
    const yyyyMmDd = formatDateToYYYYMMDD(selectedYear, selectedMonth, selectedDay);
    
    // Save data in background (non-blocking)
    saveOnboardingData(
      supabase.from('profiles').upsert({ id: user.id, birthday: yyyyMmDd, onboarding_completed: false }).select(),
      `Saving birthday: ${yyyyMmDd}`,
      undefined,
      user.id
    );
    
    // Analytics in background
    try { identify(user.id, { birthday: yyyyMmDd }); } catch {}
    try { analyticsTrack('onboarding_step_next', { step: 'birthday' }); } catch {}
    
    console.log('🚀 Navigating to height screen...');
    router.replace('/(onboarding)/height');
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'birthday' }); } catch {}
    router.replace('/(onboarding)/gender');
  };

  const handleClose = () => {
    try { analyticsTrack('onboarding_step_close', { step: 'birthday' }); } catch {}
    router.replace('/(main)/dashboard');
  };

  const ModernPicker = ({ 
    data, 
    selectedValue, 
    onValueChange, 
    label 
  }: {
    data: (string | number)[];
    selectedValue: number;
    onValueChange: (value: number) => void;
    label: string;
  }) => {
    const flatListRef = useRef<FlatList>(null);
    const ITEM_HEIGHT = 50;
    const PICKER_HEIGHT = 180;
    const CENTER_OFFSET = (PICKER_HEIGHT - ITEM_HEIGHT) / 2;

    const getValueFromIndex = (index: number) => {
      if (typeof data[index] === 'string') {
        // For months, return index + 1 (1-12)
        return index + 1;
      } else {
        // For days and years, return the actual number
        return data[index] as number;
      }
    };

    const getIndexFromValue = (value: number) => {
      if (typeof data[0] === 'string') {
        // For months, value is 1-12, index is 0-11
        return value - 1;
      } else {
        // For days and years, find the index of the value
        return data.findIndex(item => item === value);
      }
    };

    const handleValueChange = (index: number) => {
      const value = getValueFromIndex(index);
      onValueChange(value);
    };

    // Scroll to selected value on mount
    React.useEffect(() => {
      const index = getIndexFromValue(selectedValue);
      if (index >= 0) {
        const targetY = index * ITEM_HEIGHT;
        flatListRef.current?.scrollToOffset({
          offset: targetY,
          animated: false
        });
      }
    }, []);

    return (
      <View style={styles.pickerColumn}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <View style={styles.pickerWrapper}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}
            pointerEvents="none"
          />
          <FlatList
            ref={flatListRef}
            data={data}
            keyExtractor={(item) => item.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            decelerationRate="fast"
            getItemLayout={(_, idx) => ({ length: ITEM_HEIGHT, offset: idx * ITEM_HEIGHT, index: idx })}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
              handleValueChange(idx);
            }}
            renderItem={({ item, index }) => {
              const value = getValueFromIndex(index);
              const isSelected = selectedValue === value;
              return (
                <TouchableOpacity
                  style={[styles.pickerItem, isSelected && styles.selectedItem]}
                  onPress={() => onValueChange(value)}
                >
                  <Text style={[styles.pickerText, isSelected && styles.selectedText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingTop: CENTER_OFFSET, paddingBottom: CENTER_OFFSET }}
          />
          <View style={[styles.selectionIndicator, { top: CENTER_OFFSET }]} pointerEvents="none" />
        </View>
      </View>
    );
  };

  return (
    <OnboardingLayout
      title="What's your birthday?"
      subtitle="Your birthday helps us customize your experience based on your age"
      progress={0.27}
      currentStep={3}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/gender"
      onClose={handleClose}
      disableScroll={true}
    >
      <View style={styles.content}>
        <View style={styles.mainContent}>
          <View style={styles.pickerRow}>
            <ModernPicker
              data={months}
              selectedValue={selectedMonth}
              onValueChange={setSelectedMonth}
              label="Month"
            />
            <ModernPicker
              data={days}
              selectedValue={selectedDay}
              onValueChange={setSelectedDay}
              label="Day"
            />
            <ModernPicker
              data={years}
              selectedValue={selectedYear}
              onValueChange={setSelectedYear}
              label="Year"
            />
          </View>

          <View style={styles.birthdayPreview}>
            <Text style={styles.previewText}>
              {months[selectedMonth - 1]} {selectedDay}, {selectedYear}
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <OnboardingButton
            title="Continue"
            onPress={handleNext}
          />
        </View>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 20,
  },
  mainContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  pickerLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 180,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },

  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  selectedItem: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  pickerText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '400',
  },
  selectedText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  selectionIndicator: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 0,
  },
  birthdayPreview: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginTop: 20,
  },
  previewText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    backgroundColor: colors.background,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
});

export default BirthdayScreen; 