import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors } from '../../styles/colors';
import { RevenueCatService } from '../../services/subscription/RevenueCatService';

interface PaywallScreenProps {
  onClose: () => void;
  source?: string;
  offeringId?: string;
}

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onClose, source, offeringId }) => {
  console.log('🎯 PaywallScreen rendered with props:', { source, offeringId });
  
  const [isLoading, setIsLoading] = useState(false);
  const isDevelopment = __DEV__;

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      
      // Get available offerings
      const offerings = await RevenueCatService.getOfferings();
      
      if (!offerings || !offerings.current) {
        Alert.alert('Error', 'No subscription packages available');
        return;
      }

      // Get the first available package (usually monthly)
      const availablePackages = offerings.current.availablePackages;
      if (availablePackages.length === 0) {
        Alert.alert('Error', 'No subscription packages found');
        return;
      }

      const packageToPurchase = availablePackages[0];
      console.log('🎯 Attempting to purchase package:', packageToPurchase.identifier);

      // Attempt purchase
      const result = await RevenueCatService.purchasePackage(packageToPurchase);
      
      if (result.success) {
        Alert.alert(
          'Success!', 
          'Welcome to GoFit AI Premium! You now have access to all premium features.',
          [{ text: 'Continue', onPress: onClose }]
        );
      } else {
        if (result.error !== 'Purchase was cancelled by user') {
          Alert.alert('Purchase Failed', result.error || 'Unknown error occurred');
        }
      }
    } catch (error) {
      console.error('🎯 Purchase error:', error);
      Alert.alert('Error', 'Failed to process purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    if (isDevelopment) {
      Alert.alert(
        'Development Mode',
        'Skip paywall for testing?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Skip for Testing', onPress: onClose }
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Premium Features</Text>
      <Text style={styles.subtitle}>Unlock the full potential of GoFit AI</Text>
      
      <View style={styles.features}>
        <Text style={styles.feature}>• Unlimited AI workout plans</Text>
        <Text style={styles.feature}>• Unlimited AI nutrition plans</Text>
        <Text style={styles.feature}>• Unlimited AI recipe generator</Text>
        <Text style={styles.feature}>• Unlimited AI nutrition chat</Text>
        <Text style={styles.feature}>• Advanced progress tracking</Text>
        <Text style={styles.feature}>• Custom workout builder</Text>
      </View>
      
      <View style={styles.actions}>
        <Button 
          mode="contained" 
          onPress={handleUpgrade} 
          style={styles.upgradeButton}
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Upgrade to Premium'}
        </Button>
        <Button mode="text" onPress={handleSkip} style={styles.closeButton}>
          {isDevelopment ? 'Skip for Testing' : 'Maybe Later'}
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