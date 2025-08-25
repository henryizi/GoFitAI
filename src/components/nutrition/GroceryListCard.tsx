import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

type GroceryItem = { name: string; quantity?: string; note?: string };

export default function GroceryListCard({ items, onCopy, onShare }: { items: GroceryItem[]; onCopy: () => void; onShare: () => void }) {
  return (
    <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']} style={styles.card}>
      <Text style={styles.title}>Grocery List</Text>
      {items?.length ? items.map((g, i) => (
        <Text key={i} style={styles.item}>• {g.name}{g.quantity ? ` — ${g.quantity}` : ''}{g.note ? ` (${g.note})` : ''}</Text>
      )) : <Text style={styles.empty}>No items</Text>}
      <View style={styles.row}>
        <TouchableOpacity onPress={onCopy}><Text style={styles.link}>Copy</Text></TouchableOpacity>
        <TouchableOpacity onPress={onShare}><Text style={styles.link}>Share</Text></TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16 },
  title: { color: 'white', fontWeight: '800', fontSize: 18, marginBottom: 12 },
  item: { color: 'white', marginTop: 6 },
  empty: { color: 'rgba(235,235,245,0.6)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  link: { color: '#FF8A65', fontWeight: '700' },
}); 