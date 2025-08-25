import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

export default function PaywallPreview({ title, bullets, onUpgrade }: { title: string; bullets: string[]; onUpgrade: () => void }) {
  return (
    <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']} style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {bullets.map((b, idx) => (
        <Text key={idx} style={styles.bullet}>• {b}</Text>
      ))}
      <TouchableOpacity style={styles.cta} onPress={onUpgrade} activeOpacity={0.9}>
        <LinearGradient colors={['#FF6B35', '#E55A2B']} style={styles.ctaInner}>
          <Text style={styles.ctaText}>Unlock</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16 },
  title: { color: 'white', fontWeight: '800', fontSize: 18, marginBottom: 8 },
  bullet: { color: 'rgba(235,235,245,0.8)', marginTop: 4 },
  cta: { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  ctaInner: { paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: 'white', fontWeight: '700' },
}); 