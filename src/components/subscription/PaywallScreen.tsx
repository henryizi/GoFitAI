import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors } from '../../styles/colors';

interface PaywallScreenProps {
  onClose: () => void;
  source?: string;
  offeringId?: string;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onClose, source, offeringId }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Features</Text>
      <Text style={styles.subtitle}>Unlock the full potential of GoFit AI</Text>
      
      <View style={styles.features}>
        <Text style={styles.feature}>• Unlimited AI workout plans</Text>
        <Text style={styles.feature}>• Advanced nutrition tracking</Text>
        <Text style={styles.feature}>• Custom meal planning</Text>
        <Text style={styles.feature}>• Progress analytics</Text>
        <Text style={styles.feature}>• Priority support</Text>
      </View>
      
      <View style={styles.actions}>
        <Button mode="contained" onPress={onClose} style={styles.upgradeButton}>
          Upgrade to Premium
        </Button>
        <Button mode="text" onPress={onClose} style={styles.closeButton}>
          Maybe Later
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  features: {
    marginBottom: 48,
  },
  feature: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    paddingLeft: 8,
  },
  actions: {
    gap: 16,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
  },
  closeButton: {
    // Default styling
  },
});

export default PaywallScreen;