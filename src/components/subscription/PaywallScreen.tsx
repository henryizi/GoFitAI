import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Dimensions, Platform, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { RevenueCatService } from '../../services/subscription/RevenueCatService';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase/client';

const { width } = Dimensions.get('window');

// Black & Orange Theme (Brand Identity)
const THEME = {
  gradients: {
    background: ['#000000', '#1C1C1E', '#000000'] as const,
    primary: ['#FF6B35', '#FF4141'] as const, // Energetic Orange-Red
    accent: ['#FF8F65', '#FF6B35'] as const,
    card: ['#1C1C1E', '#121212'] as const,
  },
  colors: {
    accent: '#FF6B35',
    text: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.7)',
    highlight: '#FF6B35',
    success: '#4CAF50',
    border: 'rgba(255,255,255,0.15)',
    cardBg: '#1C1C1E',
  }
};

interface PaywallScreenProps {
  onClose: () => void;
  onBack?: () => void;
  source?: string;
  offeringId?: string;
}

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Lost 15 lbs',
    text: 'The AI workout plans are incredible. It feels like having a real personal trainer 24/7.',
    stars: 5,
  },
  {
    name: 'James K.',
    role: 'Muscle Gain',
    text: 'The nutrition tracking is spot on. I finally hit my macro goals consistently.',
    stars: 5,
  },
  {
    name: 'Elena R.',
    role: 'Yoga & Toning',
    text: 'Love the customizability. GoFitAI adapted perfectly to my busy schedule.',
    stars: 5,
  },
];

const FEATURES = [
  { icon: 'barbell-outline', title: 'AI Workout Plans', desc: 'Unlimited personalized routines' },
  { icon: 'nutrition-outline', title: 'Smart Nutrition', desc: 'Macro tracking & meal plans' },
  { icon: 'scan-outline', title: 'Food Analysis', desc: 'Snap photos to track calories' },
  { icon: 'trending-up-outline', title: 'Advanced Stats', desc: 'Visualize your progress' },
];

import { useSubscription } from '../../hooks/useSubscription';

// TEMPORARY: Enable mock mode for App Store review screenshots
// Set to false to use real RevenueCat products
const ENABLE_MOCK_FOR_SCREENSHOTS = false; // Set to false to use real products from RevenueCat

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ 
  onClose, 
  onBack,
  source, 
  offeringId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const isDevelopment = __DEV__;
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();

  // Mock packages for screenshots
  const getMockPackages = () => {
    return [
      {
        identifier: 'mock_yearly',
        packageType: 'ANNUAL',
        product: {
          identifier: 'gofitai_premium_yearly1',
          priceString: '$79.99',
          price: 79.99,
          currencyCode: 'USD',
        },
      },
      {
        identifier: 'mock_monthly',
        packageType: 'MONTHLY',
        product: {
          identifier: 'gofitai_premium_monthly1',
          priceString: '$9.99',
          price: 9.99,
          currencyCode: 'USD',
          introPrice: {
            price: 0,
            priceString: 'Free for 7 days',
            period: 'P1W',
          },
        },
      },
      {
        identifier: 'mock_lifetime',
        packageType: 'LIFETIME',
        product: {
          identifier: 'gofitai_premium_lifetime1',
          priceString: '$149.99',
          price: 149.99,
          currencyCode: 'USD',
        },
      },
    ];
  };

  useEffect(() => {
    loadOfferings();
  }, []);


  const loadOfferings = async (forceRefresh: boolean = false) => {
    try {
      const availableOfferings = await RevenueCatService.getOfferings(forceRefresh);
      setOfferings(availableOfferings);
      
      console.log('[Paywall] Loaded offerings:', availableOfferings?.length || 0);
      
      if (availableOfferings && availableOfferings.length > 0) {
        // Collect all packages from all offerings (in case packages are in different offerings)
        const allPackages: any[] = [];
        availableOfferings.forEach((offering: any) => {
          if (offering.availablePackages && offering.availablePackages.length > 0) {
            allPackages.push(...offering.availablePackages);
            console.log(`[Paywall] Offering "${offering.identifier}" has ${offering.availablePackages.length} packages`);
          }
        });
        
        // Remove duplicates by identifier (in case same package appears in multiple offerings)
        const uniquePackages = Array.from(
          new Map(allPackages.map((pkg: any) => [pkg.identifier, pkg])).values()
        );
        
        console.log('[Paywall] Total unique packages found:', uniquePackages.length);
        console.log('[Paywall] All packages details:', uniquePackages.map((p: any) => ({
          identifier: p.identifier,
          type: p.packageType,
          productId: p.product?.identifier,
          price: p.product?.priceString,
          priceValue: p.product?.price,
          currencyCode: p.product?.currencyCode,
          title: p.product?.title
        })));
        
        // Check which package types are present
        const packageTypes = uniquePackages.map((p: any) => p.packageType);
        console.log('[Paywall] Package types found:', packageTypes);
        
        if (uniquePackages.length === 0) {
          console.warn('[Paywall] ⚠️ No packages found in any offering');
          return;
        }
        
        // Sort packages by priority: MONTHLY > ANNUAL > LIFETIME > others
        // This ensures consistent ordering regardless of how RevenueCat returns them
        const sortedPackages = [...uniquePackages].sort((a: any, b: any) => {
          const priority = (pkg: any) => {
            if (pkg.packageType === 'MONTHLY') return 1;
            if (pkg.packageType === 'ANNUAL') return 2;
            if (pkg.packageType === 'LIFETIME') return 3;
            return 4;
          };
          return priority(a) - priority(b);
        });
        
        // Use the first offering structure but with all unique packages
        const primaryOffering = availableOfferings[0];
        setOfferings([{
          ...primaryOffering,
          availablePackages: sortedPackages
        }]);
        
        // Default to first package (monthly plan)
        setSelectedPackage(sortedPackages[0]);
        
        // Warn if expected packages are missing
        if (!packageTypes.includes('ANNUAL')) {
          console.warn('[Paywall] ⚠️ ANNUAL package not found!');
          console.warn('[Paywall] ⚠️ Make sure $rc_annual package is added to your offering in RevenueCat Dashboard');
        }
      } else {
        console.warn('[Paywall] No offerings found');
        
        // TEMPORARY: Use mock packages for screenshots if enabled
        if (ENABLE_MOCK_FOR_SCREENSHOTS) {
          console.log('[Paywall] 📸 Using mock packages for screenshots');
          const mockPackages = getMockPackages();
          setOfferings([{
            identifier: 'default',
            availablePackages: mockPackages,
          }]);
          setSelectedPackage(mockPackages[0]); // Default to yearly
        }
      }
    } catch (error) {
      console.error('[Paywall] Failed to load offerings:', error);
      
      // TEMPORARY: Use mock packages for screenshots if enabled
      if (ENABLE_MOCK_FOR_SCREENSHOTS) {
        console.log('[Paywall] 📸 Using mock packages for screenshots (error fallback)');
        const mockPackages = getMockPackages();
        setOfferings([{
          identifier: 'default',
          availablePackages: mockPackages,
        }]);
        setSelectedPackage(mockPackages[0]); // Default to yearly
      }
    }
  };

  const handleUpgrade = async () => {
    try {
      setIsLoading(true);
      if (!selectedPackage) {
        Alert.alert('Error', 'Please select a subscription plan');
        return;
      }

      // TEMPORARY: Block purchases in mock mode (for screenshots only)
      if (ENABLE_MOCK_FOR_SCREENSHOTS && selectedPackage.identifier?.startsWith('mock_')) {
        Alert.alert('Screenshot Mode', 'This is a mock package for screenshots. Real purchases are disabled in this mode.');
        setIsLoading(false);
        return;
      }

      // CRITICAL: Ensure user ID is set in RevenueCat before purchase
      // This prevents purchases from being associated with anonymous ID
      if (user?.id) {
        console.log('[Paywall] Ensuring user ID is set in RevenueCat before purchase:', user.id);
        try {
          await RevenueCatService.setUserId(user.id);
          // Wait a moment for RevenueCat to sync
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (userIdError) {
          console.warn('[Paywall] Failed to set user ID before purchase:', userIdError);
          console.warn('[Paywall] Purchase may be associated with anonymous ID');
        }
      } else {
        console.warn('[Paywall] ⚠️ No user ID available - purchase may be anonymous!');
      }
      
      // Purchase package
      console.log('[Paywall] Starting purchase for package:', selectedPackage.identifier);
      console.log('[Paywall] Package details:', {
        identifier: selectedPackage.identifier,
        packageType: (selectedPackage as any).packageType,
        productId: selectedPackage.product?.identifier,
        productTitle: selectedPackage.product?.title,
        productPrice: selectedPackage.product?.priceString,
        hasProduct: !!selectedPackage.product,
        userId: user?.id
      });
      
      // Validate package before purchase
      if (!selectedPackage || !selectedPackage.product || !selectedPackage.product.identifier) {
        console.error('[Paywall] ❌ Invalid package object:', selectedPackage);
        Alert.alert('Error', 'Invalid package. Please try again.');
        return;
      }
      
      console.log('[Paywall] Package validated, calling RevenueCatService.purchasePackage()...');
      const result = await RevenueCatService.purchasePackage(
        selectedPackage
      );
      console.log('[Paywall] Purchase result received:', {
        success: result.success,
        hasError: !!result.error,
        hasCustomerInfo: !!result.customerInfo
      });
      
      if (result.success && result.customerInfo) {
        console.log('[Paywall] Purchase successful, verifying entitlements...');
        
        // Verify purchase actually completed by checking customerInfo
        const hasActiveEntitlement = result.customerInfo.entitlements?.active?.['premium'] !== undefined;
        const isLifetime = (selectedPackage as any).packageType === 'LIFETIME';
        const hasNonSubscriptionTransaction = isLifetime && 
          (result.customerInfo.nonSubscriptionTransactions?.length || 0) > 0;
        
        console.log('[Paywall] Purchase verification:', {
          hasActiveEntitlement,
          hasNonSubscriptionTransaction,
          isLifetime,
          activeEntitlements: Object.keys(result.customerInfo.entitlements?.active || {}),
          nonSubscriptionTransactions: result.customerInfo.nonSubscriptionTransactions?.length || 0
        });
        
        if (!hasActiveEntitlement && !hasNonSubscriptionTransaction) {
          console.error('[Paywall] ❌ Purchase returned success but no entitlements found!');
          Alert.alert(
            'Purchase Verification Failed',
            'The purchase completed but could not be verified. Please try restoring purchases or contact support.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Wait a moment for RevenueCat to sync
        console.log('[Paywall] Waiting for RevenueCat to sync...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh subscription status before navigating away
        console.log('[Paywall] Refreshing subscription status...');
        await refreshSubscription();
        
        // Wait a bit more to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Set tutorial_completed to false for new premium users
        // This ensures they see the mandatory tutorial
        if (user?.id) {
          try {
            await supabase
              .from('profiles')
              .update({ tutorial_completed: false })
              .eq('id', user.id);
            console.log('[Paywall] Set tutorial_completed to false for new premium user');
          } catch (error) {
            console.warn('[Paywall] Failed to update tutorial_completed:', error);
            // Don't block purchase success if this fails
          }
        }
        
        // Refresh subscription one more time to ensure state is fully updated
        await refreshSubscription();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('[Paywall] Purchase complete, navigating to app...');
        Alert.alert('Success!', 'Welcome to GoFitAI Premium!', [
          { text: 'Continue', onPress: () => {
            // Navigate to root - let app/index.tsx routing logic handle redirect to tutorial
            // This ensures tutorial_completed check happens and user sees tutorial
            console.log('[Paywall] Navigating to root...');
            router.replace('/');
          }}
        ]);
      } else if (result.error !== 'Purchase was cancelled by user') {
        console.error('[Paywall] Purchase failed:', result.error);
        Alert.alert('Purchase Failed', result.error || 'Unknown error occurred');
      }
    } catch (error: any) {
        const errorMessage = isDevelopment 
        ? `Purchase failed: ${error?.message || 'Unknown error'}`
        : 'Failed to process purchase. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleRestore = async () => {
    try {
      setIsLoading(true);
      const result = await RevenueCatService.restorePurchases();
      if (result.success && result.customerInfo?.activeSubscriptions && result.customerInfo.activeSubscriptions.length > 0) {
         Alert.alert('Success', 'Your purchases have been restored!', [
          { text: 'OK', onPress: onClose }
        ]);
      } else {
        Alert.alert('No Subscriptions', 'No active subscriptions were found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
        setIsLoading(false);
    }
  }

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onClose();
    }
  };

  // Get all packages from RevenueCat and sort them by priority
  const allPackages = offerings?.[0]?.availablePackages || [];
  
  // Sort packages by priority: MONTHLY > ANNUAL > LIFETIME > others
  const sortedPackages = [...allPackages].sort((a: any, b: any) => {
    const priority = (pkg: any) => {
      if (pkg.packageType === 'MONTHLY') return 1;
      if (pkg.packageType === 'ANNUAL') return 2;
      if (pkg.packageType === 'LIFETIME') return 3;
      return 4;
    };
    return priority(a) - priority(b);
  });
  
  // Find specific packages by type for display logic
  const yearlyPackage = sortedPackages.find((pkg: any) => pkg.packageType === 'ANNUAL');
  const monthlyPackage = sortedPackages.find((pkg: any) => pkg.packageType === 'MONTHLY');
  const lifetimePackage = sortedPackages.find((pkg: any) => pkg.packageType === 'LIFETIME');
  
  const renderPlan = (pkg: any, isBestValue: boolean = false) => {
    if (!pkg) return null;
    
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const hasTrial = pkg.product.introPrice;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setSelectedPackage(pkg)}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
        ]}
      >
        {isBestValue && (
          <LinearGradient
            colors={THEME.gradients.primary}
            start={{x:0, y:0}} end={{x:1, y:0}}
            style={styles.bestValueBadge}
          >
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </LinearGradient>
        )}
        
        <View style={styles.planContent}>
            <View style={styles.planHeader}>
                <View style={styles.planHeaderLeft}>
                    <Text style={styles.planTitle}>
                        {pkg.packageType === 'LIFETIME' ? 'Lifetime Access' : 
                         pkg.packageType === 'ANNUAL' ? 'Yearly Plan' : 
                         'Monthly Plan'}
                    </Text>
                </View>
                <View style={[styles.radioButton, isSelected && styles.radioButtonActive]}>
                    {isSelected && <View style={styles.radioButtonSelected} />}
                </View>
            </View>

            {/* BILLED AMOUNT - Most Prominent */}
            <View style={styles.priceWrapper}>
                <Text style={styles.priceLarge}>{pkg.product.priceString}</Text>
                <Text style={styles.priceSubtitle}>
                    {pkg.packageType === 'LIFETIME' ? 'One-time payment' : 
                     pkg.packageType === 'ANNUAL' ? '/year' : 
                     '/month'}
                </Text>
            </View>
            
            {/* FREE TRIAL - Subordinate Position (smaller, less prominent) */}
            {hasTrial && pkg.packageType === 'MONTHLY' && (
                <View style={styles.trialWrapper}>
                    <Text style={styles.trialText}>7-day free trial, then {pkg.product.priceString}/month</Text>
                </View>
            )}
            
            {pkg.packageType === 'LIFETIME' && (
                <Text style={styles.planDescription}>Pay once, own it forever. No recurring fees.</Text>
            )}
            {pkg.packageType === 'ANNUAL' && (
                <Text style={styles.planDescription}>Best value - save more with yearly billing.</Text>
            )}
            {pkg.packageType === 'MONTHLY' && !hasTrial && (
                <Text style={styles.planDescription}>Cancel anytime. Flexible billing.</Text>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={THEME.gradients.background}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header Actions */}
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
        </View>

        {/* Hero */}
        <MotiView 
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 600 }}
            style={styles.hero}
        >
            <View style={styles.iconRing}>
                 <LinearGradient
                    colors={THEME.gradients.primary}
                    style={styles.iconGradient}
                 >
                    <Ionicons name="trophy" size={36} color="white" />
                 </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Unlock GoFitAI Premium</Text>
            <Text style={styles.heroSubtitle}>Accelerate your progress with advanced AI coaching.</Text>
        </MotiView>

        {/* Trust Indicator */}
        <View style={styles.trustIndicator}>
            <Ionicons name="people" size={16} color={THEME.colors.textSecondary} />
            <Text style={styles.trustText}>Trusted by 1M+ users</Text>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
                <MotiView 
                    key={index}
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 200 + (index * 100) }}
                    style={styles.featureItem}
                >
                    <View style={styles.featureIconBg}>
                        <Ionicons name={feature.icon as any} size={22} color={THEME.colors.accent} />
                    </View>
                    <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureDesc}>{feature.desc}</Text>
                    </View>
                </MotiView>
            ))}
        </View>

        {/* Plans */}
        <MotiView 
            from={{ opacity: 0, translateY: 40 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 500 }}
            style={styles.plansContainer}
        >
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            {/* Display all packages from RevenueCat in sorted order */}
            {sortedPackages.length > 0 ? (
              sortedPackages.map((pkg: any, index: number) => {
                // Mark yearly/annual as best value
                const isBestValue = pkg.packageType === 'ANNUAL';
                return (
                  <View key={pkg.identifier || index}>
                    {renderPlan(pkg, isBestValue)}
                  </View>
                );
              })
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No subscription plans available</Text>
                <Text style={styles.errorSubtext}>
                  Make sure packages are set up in RevenueCat Dashboard and linked to your offering.
                </Text>
              </View>
            )}
        </MotiView>

        {/* Testimonials */}
        <View style={styles.testimonialsContainer}>
             <Text style={styles.sectionTitle}>Success Stories</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testimonialsScroll}>
                {TESTIMONIALS.map((item, idx) => (
                    <View key={idx} style={styles.testimonialCard}>
                        <View style={styles.testimonialHeader}>
                            <View style={styles.starsRow}>
                                {[...Array(item.stars)].map((_, i) => (
                                    <Ionicons key={i} name="star" size={14} color="#FBBF24" />
                                ))}
                            </View>
                            <Text style={styles.testimonialName}>{item.name}</Text>
                        </View>
                        <Text style={styles.testimonialRole}>{item.role}</Text>
                        <Text style={styles.testimonialText}>"{item.text}"</Text>
                    </View>
                ))}
             </ScrollView>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <BlurView intensity={80} tint="dark" style={styles.bottomBar}>
        <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleUpgrade}
            disabled={isLoading}
        >
            <LinearGradient
                colors={THEME.gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
            >
                <Text style={styles.ctaText}>
                    {isLoading ? 'Processing...' : 
                     selectedPackage ? 
                       `Subscribe for ${selectedPackage.product.priceString}${selectedPackage.packageType === 'LIFETIME' ? '' : selectedPackage.packageType === 'ANNUAL' ? '/year' : '/month'}`
                     : 
                     'Select a Plan'}
                </Text>
                {!isLoading && selectedPackage?.product?.introPrice && selectedPackage.packageType === 'MONTHLY' && (
                    <Text style={styles.ctaSubtext}>7-day free trial, then {selectedPackage.product.priceString}/month</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
            Recurring billing. Cancel anytime.
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://henryizi.github.io/gofitai-privacy/terms-of-service.html')}>
            <Text style={styles.legalLinkText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://henryizi.github.io/gofitai-privacy/')}>
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.gradients.background[0],
  },
  scrollContent: {
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  restoreText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  iconRing: {
    marginBottom: 16,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '80%',
  },
  trustIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 6,
  },
  trustText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '48%',
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  featureIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 53, 0.15)', // Orange tint
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTextContainer: {
    gap: 4,
  },
  featureTitle: {
    color: THEME.colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  featureDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginLeft: 24,
    marginBottom: 16,
  },
  plansContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 16,
  },
  planCard: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  planCardSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)', // Orange tint
    borderColor: THEME.colors.accent,
  },
  bestValueBadge: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  bestValueText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  planContent: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planHeaderLeft: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  trialWrapper: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
    alignSelf: 'flex-start',
  },
  trialText: {
    color: THEME.colors.success,
    fontWeight: '500',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: THEME.colors.accent,
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.accent,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceLarge: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.text,
    marginRight: 6,
    letterSpacing: -0.5,
  },
  priceSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },
  discountBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.accent,
    alignSelf: 'flex-start',
  },
  discountBadgeText: {
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceSubtitleOriginal: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  planDescription: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
  },
  testimonialsContainer: {
    marginBottom: 32,
  },
  testimonialsScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  testimonialCard: {
    width: width * 0.7,
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  testimonialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  testimonialName: {
    color: THEME.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  testimonialRole: {
    color: THEME.colors.accent,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500',
  },
  testimonialText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  spacer: {
    height: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: THEME.colors.highlight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  ctaSubtext: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '400',
  },
  disclaimer: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  legalLinkText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: THEME.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  errorText: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default PaywallScreen;