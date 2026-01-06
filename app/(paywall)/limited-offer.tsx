import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export default function LimitedOfferScreen() {
  const handleClaim = () => {
    // Go to lucky draw to reveal the actual discount
    router.replace('/(paywall)/lucky-draw');
  };

  const handleBack = () => {
    // Return to paywall
    router.replace('/(paywall)');
  };

  return (
    <LinearGradient colors={['#0B1630', '#000000']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>One Time Offer</Text>
        <Text style={styles.subtitle}>Too expensive? We get it.</Text>

        <View style={styles.boxContainer}>
          <View style={styles.giftCircle}>
            <Ionicons name="gift" size={96} color="#FF6B35" />
          </View>
          <Text style={styles.discountText}>Tap below to reveal your discount</Text>
        </View>

        <TouchableOpacity style={styles.ctaButton} onPress={handleClaim} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Claim your limited offer now!</Text>
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
    paddingTop: height * 0.05,
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
    marginBottom: 40,
  },
  boxContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  giftCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  discountText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
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





