import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Dimensions, Platform } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../styles/colors';
import { RevenueCatService } from '../../services/subscription/RevenueCatService';
import { useAuth } from '../../hooks/useAuth';

const { width, height } = Dimensions.get('window');

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
    console.log('[PaywallScreen] handleUpgrade called');
    
    try {
      setIsLoading(true);
      
      if (!selectedPackage) {
        console.log('[PaywallScreen] No package selected');
        Alert.alert('Error', 'Please select a subscription plan');
        return;
      }

      console.log('[PaywallScreen] Attempting to purchase package:', selectedPackage.identifier);

      // Attempt purchase
      const result = await RevenueCatService.purchasePackage(selectedPackage);
      console.log('[PaywallScreen] Purchase result:', result);
      
      if (result.success) {
        console.log('[PaywallScreen] Purchase successful, showing success alert');
        Alert.alert(
          'Success!', 
          'Welcome to GoFitAI Premium! You now have access to all premium features.',
          [{ 
            text: 'Continue', 
            onPress: () => {
              console.log('[PaywallScreen] Success alert dismissed, calling onClose');
              onClose();
            }
          }]
        );
      } else {
        console.log('[PaywallScreen] Purchase failed:', result.error);
        if (result.error !== 'Purchase was cancelled by user') {
          Alert.alert('Purchase Failed', result.error || 'Unknown error occurred');
        }
        // Don't close paywall on failure
      }
    } catch (error) {
      console.error('[PaywallScreen] Purchase error:', error);
      console.error('[PaywallScreen] Error details:', {
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
      // Don't close paywall on error
    } finally {
      console.log('[PaywallScreen] Setting loading to false');
      setIsLoading(false);
    }
  };

  const { user } = useAuth();

  const handleSkip = async () => {
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
      // Store skipped paywall state for this user
      if (user?.id) {
        try {
          const skipKey = `paywall_skipped_${user.id}`;
          const skipData = {
            skipped: true,
            skippedAt: new Date().toISOString(),
            userId: user.id
          };
          
          if (Platform.OS === 'web' && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
            (globalThis as any).localStorage.setItem(skipKey, JSON.stringify(skipData));
          } else {
            await AsyncStorage.setItem(skipKey, JSON.stringify(skipData));
          }
          
          console.log('✅ Paywall skipped state saved for user:', user.id);
        } catch (error) {
          console.warn('⚠️ Failed to save skipped paywall state:', error);
        }
      }
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
    <LinearGradient
      colors={['#121212', '#1C1C1E', '#2C2C2E']}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <View style={styles.header}>
          <Button 
            mode="text" 
            onPress={handleSkip} 
            style={styles.closeButton}
            labelStyle={styles.closeButtonText}
          >
            ✕
          </Button>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FF6B35', '#E55A2B']}
              style={styles.iconGradient}
            >
              <Ionicons name="fitness" size={40} color="white" />
            </LinearGradient>
          </View>
          
          <Text style={styles.title}>GoFitAI Premium</Text>
          <Text style={styles.subtitle}>
            Unlock unlimited AI-powered fitness and nutrition guidance
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          
          <View style={styles.featuresGrid}>
            {[
              { icon: 'barbell-outline', title: 'Unlimited AI Workout Plans', desc: 'Professional-grade training programs tailored to your goals' },
              { icon: 'nutrition-outline', title: 'Advanced Nutrition Planning', desc: 'Mathematical nutrition plans with precise macro calculations' },
              { icon: 'camera-outline', title: 'Unlimited Food Photo Analysis', desc: 'AI-powered food recognition using advanced Gemini AI' },
              { icon: 'analytics-outline', title: 'Advanced Progress Analytics', desc: 'Weight trends, body measurements, and progress forecasting' },
              { icon: 'time-outline', title: 'Complete Workout History', desc: 'Track every session with detailed exercise logs' },
              { icon: 'build-outline', title: 'Custom Workout Builder', desc: 'Create personalized workouts with exercise library' }
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color="#FF6B35" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDesc}>{feature.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Pricing Section */}
        <View style={styles.pricingSection}>
          <Text style={styles.pricingHeader}>Choose Your Plan</Text>
          
          {/* Lifetime Package - Featured */}
          {lifetimePackage && (
            <Card 
              style={[
                styles.pricingCard,
                styles.featuredCard,
                selectedPackage?.identifier === lifetimePackage.identifier && styles.selectedCard
              ]}
              onPress={() => setSelectedPackage(lifetimePackage)}
            >
              <LinearGradient
                colors={['#FF6B35', '#E55A2B']}
                style={styles.cardGradient}
              >
                <View style={styles.bestValueContainer}>
                  <Text style={styles.bestValueBadge}>BEST VALUE</Text>
                </View>
                
                <Text style={styles.lifetimePricingTitle}>Lifetime Premium</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.lifetimePrice}>
                    {lifetimePackage.product.priceString || '$99.99'}
                  </Text>
                </View>
                <Text style={styles.lifetimeSubtext}>
                  One-time payment • Lifetime access
                </Text>
                
                <View style={styles.lifetimeFeatures}>
                  <Text style={styles.lifetimeFeature}>✓ All premium features</Text>
                  <Text style={styles.lifetimeFeature}>✓ Future updates included</Text>
                  <Text style={styles.lifetimeFeature}>✓ No monthly fees</Text>
                </View>
              </LinearGradient>
            </Card>
          )}

          {/* Monthly Package */}
          {monthlyPackage && (
            <Card 
              style={[
                styles.pricingCard,
                selectedPackage?.identifier === monthlyPackage.identifier && styles.selectedCard
              ]}
              onPress={() => setSelectedPackage(monthlyPackage)}
            >
              <Card.Content style={styles.monthlyCardContent}>
                <Text style={styles.monthlyPricingTitle}>Monthly Plan</Text>
                
                {hasFreeTrial ? (
                  <View style={styles.trialContainer}>
                    <Text style={styles.freeTrialText}>7-Day Free Trial</Text>
                    <View style={styles.monthlyPriceContainer}>
                      <Text style={styles.monthlyPrice}>
                        {monthlyPackage.product.priceString || '$9.99'}
                      </Text>
                      <Text style={styles.monthlyPeriod}>/month</Text>
                    </View>
                    <Text style={styles.trialSubtext}>Cancel anytime</Text>
                  </View>
                ) : (
                  <View style={styles.monthlyPriceContainer}>
                    <Text style={styles.monthlyPrice}>
                      {monthlyPackage.product.priceString || '$9.99'}
                    </Text>
                    <Text style={styles.monthlyPeriod}>/month</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={selectedPackage?.identifier?.includes('lifetime') ? ['#FF6B35', '#E55A2B'] : ['#FF6B35', '#E55A2B']}
            style={styles.ctaButton}
          >
            <Button 
              mode="text"
              onPress={handleUpgrade} 
              loading={isLoading}
              disabled={isLoading || !selectedPackage}
              labelStyle={styles.ctaButtonText}
              style={styles.ctaButtonInner}
            >
              {isLoading ? 'Processing...' : 
               selectedPackage?.identifier?.includes('lifetime') ? 'Get Lifetime Premium' :
               hasFreeTrial ? 'Start Free Trial' : 'Upgrade to Premium'}
            </Button>
          </LinearGradient>
          
          {/* Trust Indicators */}
          <View style={styles.trustIndicators}>
            <Text style={styles.trustText}>Secure payment • Cancel anytime</Text>
            <Text style={styles.trustSubtext}>
              {isDevelopment ? 'Skip for Testing' : 'Manage subscription in device settings'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  closeButton: {
    minWidth: 40,
    minHeight: 40,
  },
  closeButtonText: {
    fontSize: 24,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: 'bold',
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  socialProof: {
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  
  // Features Section
  featuresSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  featuresGrid: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  
  // Pricing Section
  pricingSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  pricingHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  pricingCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  featuredCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.4,
  },
  selectedCard: {
    borderColor: '#FFD700',
    borderWidth: 3,
    elevation: 12,
  },
  
  // Lifetime Card
  cardGradient: {
    padding: 24,
  },
  bestValueContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  bestValueBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  lifetimePricingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  lifetimePrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 12,
  },
  lifetimeSavings: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lifetimeSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  lifetimeFeatures: {
    alignItems: 'center',
    gap: 8,
  },
  lifetimeFeature: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  
  // Monthly Card
  monthlyCardContent: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  monthlyPricingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 16,
  },
  trialContainer: {
    alignItems: 'center',
  },
  freeTrialText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 12,
  },
  monthlyPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  monthlyPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  monthlyPeriod: {
    fontSize: 18,
    color: '#666',
    marginLeft: 4,
  },
  trialSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // CTA Section
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  ctaButton: {
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonInner: {
    paddingVertical: 8,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    paddingVertical: 4,
  },
  trustIndicators: {
    alignItems: 'center',
  },
  trustText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  trustSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PaywallScreen;