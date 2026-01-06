import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { identify } from '../../src/services/analytics/analytics';
import { track as analyticsTrack } from '../../src/services/analytics/analytics';
import { OnboardingLayout } from '../../src/components/onboarding/OnboardingLayout';
import { OnboardingButton } from '../../src/components/onboarding/OnboardingButton';
import { saveOnboardingData } from '../../src/utils/onboardingSave';
import { BodyFatGrid } from '../../src/components/onboarding/BodyFatGrid';

const { width } = Dimensions.get('window');

// Body fat chart images (2x3 grid sprite sheets)
const MALE_BODYFAT_CHART = require('../../assets/images/bodyfat/male-bodyfat-chart.png');
const FEMALE_BODYFAT_CHART = require('../../assets/images/bodyfat/female-bodyfat-chart.png');

// Define body fat ranges (the illustrated figure will update to match)
const BODY_FAT_DATA = {
  male: [
    { value: 5, label: '5%' },
    { value: 10, label: '10%' },
    { value: 15, label: '15%' },
    { value: 20, label: '20%' },
    { value: 25, label: '25%' },
    { value: 30, label: '30%' },
  ],
  female: [
    { value: 10, label: '10%' },
    { value: 15, label: '15%' },
    { value: 20, label: '20%' },
    { value: 25, label: '25%' },
    { value: 30, label: '30%' },
    { value: 35, label: '35%' },
  ]
};

const BodyFatScreen = () => {
  const { user, profile, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  
  const [genderFromDb, setGenderFromDb] = useState<'male' | 'female' | null>(null);
  
  // Fetch gender directly from database if profile doesn't have it
  useEffect(() => {
    const fetchGender = async () => {
      if (user && !profile?.gender) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('gender')
            .eq('id', user.id)
            .single();
          
          if (!error && data) {
            const profileData = data as { gender: string | null } | null;
            if (profileData?.gender) {
              const fetchedGender = profileData.gender.toLowerCase() === 'female' ? 'female' : 'male';
              setGenderFromDb(fetchedGender);
              console.log('✅ Fetched gender from DB:', fetchedGender);
            }
          }
        } catch (err) {
          console.error('❌ Error fetching gender:', err);
        }
      }
    };
    
    fetchGender();
  }, [user, profile?.gender]);
  
  // Refresh profile on mount to ensure we have latest gender data
  useEffect(() => {
    if (user && !profile?.gender) {
      console.log('🔄 Refreshing profile to get gender...');
      refreshProfile();
    }
  }, [user, profile?.gender, refreshProfile]);
  
  // Get gender from profile, with fallback to database fetch, then 'male'
  // Normalize to lowercase and handle 'other' as 'male' for body fat charts
  const profileGender = profile?.gender?.toLowerCase();
  const resolvedGender = profileGender === 'female' 
    ? 'female' 
    : profileGender === 'male' 
    ? 'male' 
    : genderFromDb || 'male';
  const gender: 'male' | 'female' = resolvedGender === 'female' ? 'female' : 'male';
  const data = BODY_FAT_DATA[gender] || BODY_FAT_DATA.male;
  
  // Force refresh profile when screen is focused to ensure we have latest gender
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        console.log('🔄 Screen focused - refreshing profile to get gender...');
        refreshProfile();
      }
    }, [user, refreshProfile])
  );
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 Body Fat Screen - Gender check:', {
      profileGender,
      genderFromDb,
      resolvedGender: gender,
      profileId: profile?.id,
      hasProfile: !!profile,
      profileGenderRaw: profile?.gender,
      willShowChart: gender === 'female' ? 'FEMALE' : 'MALE',
      chartSource: gender === 'female' ? 'FEMALE_BODYFAT_CHART' : 'MALE_BODYFAT_CHART',
      dataLength: data.length,
    });
  }, [profile?.gender, genderFromDb, gender, profile?.id, data.length]);
  
  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    try { analyticsTrack('body_fat_selected', { index, value: data[index].value }); } catch {}
  };

  const handleNext = async () => {
    if (!user || selectedIndex === null) return;
    
    // Get the numeric body fat value from the selected option
    const bodyFatValue = data[selectedIndex].value;
    const selectedLabel = data[selectedIndex].label;
    
    console.log('💾 Saving body fat to Supabase:', {
      selectedIndex,
      bodyFatValue,
      selectedLabel,
      userId: user.id,
    });
    
    // Save data in background to Supabase
    // @ts-expect-error - Supabase type inference issue with profiles table
    const savePromise = supabase.from('profiles').upsert({ id: user.id, body_fat: bodyFatValue, onboarding_completed: false }).select();
    saveOnboardingData(
      savePromise as unknown as Promise<{ data: any; error: any }>,
      `Saving body fat: ${bodyFatValue}%`,
      undefined,
      user.id
    );
    
    // Analytics tracking
    try { identify(user.id, { body_fat: bodyFatValue }); } catch {}
    try { analyticsTrack('onboarding_step_next', { step: 'body-fat', body_fat_value: bodyFatValue }); } catch {}
    
    console.log('✅ Body fat saved successfully:', bodyFatValue, '%');
    console.log('🚀 Navigating to primary-goal screen...');
    router.replace('/(onboarding)/primary-goal');
  };

  const handleBack = () => {
    try { analyticsTrack('onboarding_step_prev', { step: 'body-fat' }); } catch {}
    router.replace('/(onboarding)/activity-level');
  };

  return (
    <OnboardingLayout
      title="Estimate Your Body Fat"
      subtitle="Tap on the body fat percentage that most closely matches your current physique."
      progress={0.833}
      currentStep={10}
      totalSteps={12}
      showBackButton={true}
      showCloseButton={false}
      onBack={handleBack}
      previousScreen="/(onboarding)/activity-level"
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.questionLabel}>
            <Text style={styles.questionLabelText}>Question 6</Text>
          </View>

          <View style={styles.gridContainer}>
            <BodyFatGrid
              source={gender === 'female' ? FEMALE_BODYFAT_CHART : MALE_BODYFAT_CHART}
              selectedIndex={selectedIndex}
              onSelect={handleSelect}
              options={data}
              columns={3}
              rows={2}
              spriteIndexMap={gender === 'female' ? [0, 1, 2, 3, 4, 5] : undefined}
              gender={gender}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(34, insets.bottom + 16) }]}>
        <OnboardingButton
          title="Next"
          onPress={handleNext}
          disabled={selectedIndex === null}
        />
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  questionLabel: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  questionLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.3,
  },
  gridContainer: {
    width: '100%',
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent',
  },
});

export default BodyFatScreen;
