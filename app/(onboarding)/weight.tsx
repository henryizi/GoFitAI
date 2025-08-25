import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, FlatList } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../src/styles/colors';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { Appbar } from 'react-native-paper';
import { identify } from '../../src/services/analytics/analytics';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_HEIGHT = 60;
const WEIGHT_MIN_KG = 40;
const WEIGHT_MAX_KG = 120;
const WEIGHT_DATA_KG = Array.from({ length: WEIGHT_MAX_KG - WEIGHT_MIN_KG + 1 }, (_, i) => WEIGHT_MIN_KG + i);
const WEIGHT_DATA_LBS = WEIGHT_DATA_KG.map(kg => Math.round(kg * 2.20462));
const CENTER_OFFSET = (screenHeight * 0.5 - ITEM_HEIGHT) / 2;

const WeightScreen = () => {
  const [weightKg, setWeightKg] = useState(66.2);
  const { user } = useAuth();
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const flatListRef = useRef<FlatList<number>>(null);

  const weightData = unit === 'kg' ? WEIGHT_DATA_KG : WEIGHT_DATA_LBS;
  const displayed = unit === 'kg' ? weightKg : weightKg * 2.20462;

  useEffect(() => {
    const value = unit === 'kg' ? Math.round(weightKg) : Math.round(weightKg * 2.20462);
    const index = weightData.findIndex(x => x === value);
    if (index >= 0) {
      flatListRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
    }
  }, [unit]);

  const handleValueChange = (index: number) => {
    const val = weightData[index];
    if (unit === 'kg') {
      setWeightKg(val);
    } else {
      setWeightKg(val / 2.20462);
    }
  };

  const handleNext = async () => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    // save weight to profile
    await supabase.from('profiles').update({ weight: weightKg }).eq('id', user.id);
    try { identify(user.id, { weight_kg: weightKg }); } catch {}
    router.push('/(onboarding)/weight-trend');
  };

  const ProgressDots = () => (
    <View style={styles.dotsContainer}>
      {[0,1,2,3].map(i => (
        <View key={i} style={[styles.dot, i === 2 && styles.dotActive]} />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.replace('/(onboarding)/height')} />
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: '60%' }]} />
        </View>
        <Appbar.Action icon="close" onPress={() => router.replace('/(main)/dashboard')} />
      </Appbar.Header>

      <View style={styles.content}>
        <Text style={styles.title}>Your Current Weight</Text>
        <Text style={styles.subtitle}>We use your weight to tailor your fitness and nutrition plan</Text>
        <View style={styles.unitSelector}>
          <TouchableOpacity style={[styles.unitButton, unit === 'kg' && styles.unitButtonSelected]} onPress={() => setUnit('kg')}>
            <Text style={[styles.unitText, unit === 'kg' && styles.unitTextSelected]}>kg</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.unitButton, unit === 'lbs' && styles.unitButtonSelected]} onPress={() => setUnit('lbs')}>
            <Text style={[styles.unitText, unit === 'lbs' && styles.unitTextSelected]}>lbs</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.rulerArea}>
        <FlatList
          ref={flatListRef}
          data={weightData}
          keyExtractor={(item) => item.toString()}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          getItemLayout={(_, idx) => ({ length: ITEM_HEIGHT, offset: idx * ITEM_HEIGHT, index: idx })}
          onMomentumScrollEnd={e => { const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT); handleValueChange(idx); }}
          renderItem={({ item, index }) => {
            const isSelected = Math.round(displayed) === item;
            return (
              <View style={[styles.itemContainer, isSelected && styles.itemContainerSelected]}>
                <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>{item}</Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingTop: CENTER_OFFSET, paddingBottom: CENTER_OFFSET }}
        />
        <View style={[styles.selectionOverlay, { top: CENTER_OFFSET }]} />
      </View>
      <View style={styles.footer}>
        <Button mode="contained" onPress={handleNext} style={styles.nextButton} labelStyle={{ color: 'white' }}>
          Next
        </Button>
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  dotsContainer: { flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border, margin: 4 },
  dotActive: { backgroundColor: colors.text },
  content: { alignItems: 'center', paddingHorizontal: 40, marginTop: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  unitSelector: { flexDirection: 'row', backgroundColor: colors.primaryLight, borderRadius: 24, padding: 4 },
  unitButton: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
  unitButtonSelected: { backgroundColor: 'white', elevation: 3 },
  unitText: { fontSize: 16, color: colors.textSecondary, fontWeight: 'bold' },
  unitTextSelected: { color: colors.text },
  rulerArea: { flex: 1, width: '100%' },
  itemContainer: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemContainerSelected: {},
  itemText: { fontSize: 24, color: colors.textSecondary },
  itemTextSelected: { fontSize: 28, color: colors.text, fontWeight: 'bold' },
  selectionOverlay: { position: 'absolute', left: 0, right: 0, height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.primary },
  footer: { padding: 24 },
  nextButton: { backgroundColor: colors.accent, borderRadius: 24, paddingVertical: 16, minHeight: 56 },
  appbar:{backgroundColor:colors.background,elevation:0,borderBottomWidth:0},
  progressBar:{flex:1,alignItems:'center'},
  progress:{height:4,backgroundColor:colors.primary,borderRadius:2},
});

export default WeightScreen; 