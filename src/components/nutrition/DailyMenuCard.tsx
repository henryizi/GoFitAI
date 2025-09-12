import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

type MealItem = { meal_type: string; meal_description: string; calories?: number; protein_grams?: number; carbs_grams?: number; fat_grams?: number };

export default function DailyMenuCard({ items, onRegenerate, onSwap, onSave }: { items: MealItem[]; onRegenerate: () => void; onSwap: (meal: MealItem) => void; onSave: () => void }) {
  return (
    <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']} style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.title}>Today’s AI Menu</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={styles.badge}><Text style={styles.badgeText}>AI generated</Text></View>
          <View style={[styles.badge, { marginLeft: 6 }]}><Text style={styles.badgeText}>Validated</Text></View>
        </View>
      </View>
      <Text style={styles.subtle}>Updated just now</Text>
      {items?.length ? items.map((m, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.mealType}>{m.meal_type}</Text>
          <Text style={styles.mealText} numberOfLines={3} ellipsizeMode="tail">{m.meal_description}</Text>
          <Text style={styles.macros}>{[m.calories && `${m.calories} kcal`, m.protein_grams && `${m.protein_grams}P`, m.carbs_grams && `${m.carbs_grams}C`, m.fat_grams && `${m.fat_grams}F`].filter(Boolean).join(' · ')}</Text>
          <TouchableOpacity onPress={() => onSwap(m)}><Text style={styles.link}>Swap ingredient</Text></TouchableOpacity>
        </View>
      )) : <Text style={styles.empty}>No suggestions yet</Text>}
      {items?.length ? (
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 8 }}>
          {(() => {
            const sums = items.reduce((acc, m) => ({
              c: acc.c + (m.calories || 0), p: acc.p + (m.protein_grams || 0),
              cb: acc.cb + (m.carbs_grams || 0), f: acc.f + (m.fat_grams || 0)
            }), { c: 0, p: 0, cb: 0, f: 0 });
            return <Text style={styles.macros}>Totals: {sums.c} kcal · {sums.p}P · {sums.cb}C · {sums.f}F</Text>;
          })()}
        </View>
      ) : null}
      <View style={styles.row}>
        <TouchableOpacity onPress={onRegenerate}><Text style={styles.link}>Regenerate</Text></TouchableOpacity>
        <TouchableOpacity onPress={onSave}><Text style={styles.link}>Save</Text></TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16 },
  title: { color: 'white', fontWeight: '800', fontSize: 18, marginBottom: 4 },
  subtle: { color: 'rgba(235,235,245,0.6)', fontSize: 12, marginBottom: 8 },
  item: { marginBottom: 12 },
  mealType: { color: 'rgba(235,235,245,0.8)', fontWeight: '700' },
  mealText: { color: 'white', marginTop: 4 },
  macros: { color: 'rgba(235,235,245,0.6)', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  link: { color: '#FF8A65', fontWeight: '700' },
  empty: { color: 'rgba(235,235,245,0.6)' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10 },
  badgeText: { color: 'rgba(235,235,245,0.9)', fontSize: 11, fontWeight: '700' },
}); 