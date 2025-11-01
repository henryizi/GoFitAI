import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
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
  const [offerings, setOfferings] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const isDevelopment = __DEV__;

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const availableOfferings = await RevenueCatService.getOfferings();
      setOfferings(availableOfferings);
      
      // Auto-select monthly package by default
      if (availableOfferings && availableOfferings[0]?.availablePackages) {
        const monthlyPkg = availableOfferings[0].availablePackages.find((pkg: any) => 
          pkg.packageType === 'MONTHLY' || pkg.identifier.includes('monthly')
        );
        if (monthlyPkg) {
          setSelectedPackage(monthlyPkg);
        }
      }
    } catch (error) {
      console.error('Failed to load offerings:', error);
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      
      if (!selectedPackage) {
        Alert.alert('Error', 'Please select a subscription plan');
        return;
      }

      console.log('🎯 Attempting to purchase package:', selectedPackage.identifier);

      // Attempt purchase
      const result = await RevenueCatService.purchasePackage(selectedPackage);
      
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
      console.error('🎯 Error details:', {
        message: error?.message,
        code: error?.code,
        userCancelled: error?.userCancelled,
        stack: error?.stack
      });
      
      // Show more specific error message in development
      const errorMessage = __DEV__ 
        ? `Purchase failed: ${error?.message || 'Unknown error'}`
        : 'Failed to process purchase. Please try again.';
        
      Alert.alert('Error', errorMessage);
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

  const monthlyPackage = offerings?.[0]?.availablePackages?.find((pkg: any) => 
    pkg.packageType === 'MONTHLY' || pkg.identifier.includes('monthly')
  );

  const lifetimePackage = offerings?.[0]?.availablePackages?.find((pkg: any) => 
    pkg.packageType === 'LIFETIME' || pkg.identifier.includes('lifetime')
  );

  const hasFreeTrial = monthlyPackage?.product?.introPrice;

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

      {/* Pricing Options */}
      <View style={styles.pricingOptions}>
        {/* Monthly Package */}
        {monthlyPackage && (
          <Card 
            style={[
              styles.pricingCard, 
              selectedPackage?.identifier === monthlyPackage.identifier && styles.selectedCard
            ]}
            onPress={() => setSelectedPackage(monthlyPackage)}
          >
            <Card.Content>
              <Text style={styles.pricingTitle}>
                {monthlyPackage.product.title || 'GoFitAI Premium Monthly'}
              </Text>
              {hasFreeTrial ? (
                <View style={styles.pricingDetails}>
                  <Text style={styles.freeTrialText}>
                    🎉 7-Day Free Trial
                  </Text>
                  <Text style={styles.pricingText}>
                    Then {monthlyPackage.product.priceString || '$9.99'}/month
                  </Text>
                  <Text style={styles.pricingSubtext}>
                    Cancel anytime during trial
                  </Text>
                </View>
              ) : (
                <Text style={styles.pricingText}>
                  {monthlyPackage.product.priceString || '$9.99'}/month
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Lifetime Package */}
        {lifetimePackage && (
          <Card 
            style={[
              styles.pricingCard, 
              selectedPackage?.identifier === lifetimePackage.identifier && styles.selectedCard
            ]}
            onPress={() => setSelectedPackage(lifetimePackage)}
          >
            <Card.Content>
              <View style={styles.lifetimeHeader}>
                <Text style={styles.pricingTitle}>
                  {lifetimePackage.product.title || 'GoFitAI Premium Lifetime'}
                </Text>
                <Text style={styles.bestValueBadge}>BEST VALUE</Text>
              </View>
              <Text style={styles.pricingText}>
                {lifetimePackage.product.priceString || '$99.99'}
              </Text>
              <Text style={styles.pricingSubtext}>
                One-time payment • Yours forever
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>
      
      <View style={styles.actions}>
        <Button 
          mode="contained" 
          onPress={handleUpgrade} 
          style={styles.upgradeButton}
          loading={isLoading}
          disabled={isLoading || !selectedPackage}
        >
          {isLoading ? 'Processing...' : 
           selectedPackage?.identifier?.includes('lifetime') ? 'Purchase Lifetime Access' :
           hasFreeTrial ? 'Start Free Trial' : 'Upgrade to Premium'}
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
    marginBottom: 32,
  },
  feature: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
    paddingLeft: 8,
  },
  pricingOptions: {
    marginBottom: 32,
    gap: 16,
  },
  pricingCard: {
    backgroundColor: colors.surface,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: colors.primary,
    elevation: 8,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  pricingDetails: {
    alignItems: 'center',
  },
  freeTrialText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  pricingText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  pricingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    gap: 16,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
  },
  lifetimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bestValueBadge: {
    backgroundColor: colors.primary,
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  closeButton: {
    // Default styling
  },
});

export default PaywallScreen;