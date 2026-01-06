import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const discounts = [10, 15, 20, 25, 30];
const DISCOUNT_OFFER_MAP: Record<number, string> = {
  10: 'LIMITED10',
  15: 'LIMITED15',
  20: 'LIMITED20',
  25: 'LIMITED25',
  30: 'LIMITED30',
};

export default function LuckyDrawScreen() {
  const [revealed, setRevealed] = useState(false);
  const [finalDiscount, setFinalDiscount] = useState<number | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const STORAGE_KEY = 'gofitai-lucky-draw-discount';

  useEffect(() => {
    const loadPersisted = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed)) {
            setFinalDiscount(parsed);
            setRevealed(true);
            spinAnim.setValue(1); // keep wheel steady
          }
        }
      } catch (e) {
        console.log('LuckyDraw: failed to load saved discount', e);
      }
    };
    loadPersisted();
  }, []);

  const rollDiscount = () => {
    if (revealed) return; // only one spin

    // simple spin animation
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    const discount = discounts[Math.floor(Math.random() * discounts.length)];
    setFinalDiscount(discount);
    setRevealed(true);
    // persist
    AsyncStorage.setItem(STORAGE_KEY, String(discount)).catch(err => {
      console.log('LuckyDraw: failed to save discount', err);
    });
  };

  const handleApply = () => {
    if (!finalDiscount) return;
    const offerCode = DISCOUNT_OFFER_MAP[finalDiscount];
    router.replace(`/(paywall)?highlight=monthly&promoCode=${offerCode}&discount=${finalDiscount}`);
  };

  const handleBack = () => {
    // Replace back to limited offer to avoid empty navigation stack
    router.replace('/(paywall)/limited-offer');
  };

  const displayDiscount = revealed && finalDiscount ? `${finalDiscount}% OFF` : 'Tap to reveal';
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient colors={['#0B1630', '#000000']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Lucky Draw</Text>
        <Text style={styles.subtitle}>Spin to reveal your special discount</Text>

        <TouchableOpacity 
          style={styles.wheel} 
          activeOpacity={revealed ? 1 : 0.9}
          onPress={rollDiscount}
          disabled={revealed}
        >
          <Animated.View style={{ alignItems: 'center', transform: [{ rotate: spin }] }}>
            <MaterialCommunityIcons name="slot-machine" size={72} color="#FF6B35" />
          </Animated.View>
          <Text style={styles.wheelText}>{displayDiscount}</Text>
          <Text style={styles.wheelHint}>{revealed ? 'One-time spin used' : 'Tap to spin'}</Text>
        </TouchableOpacity>

        {revealed && finalDiscount && (
          <View style={styles.revealCard}>
            <Text style={styles.revealLabel}>You got</Text>
            <Text style={styles.revealValue}>{finalDiscount}% OFF</Text>
            <Text style={styles.revealNote}>Apply this to your first month</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.ctaButton, !revealed && styles.ctaButtonDisabled]} 
          onPress={handleApply} 
          activeOpacity={revealed ? 0.9 : 1}
          disabled={!revealed}
        >
          <Text style={styles.ctaText}>
            {revealed ? 'Apply discount' : 'Spin to reveal discount'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>No commitment - cancel anytime.</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  wheel: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  wheelText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
  },
  wheelHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  revealCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
    alignItems: 'center',
  },
  revealLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 6,
  },
  revealValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  revealNote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  footerNote: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});





