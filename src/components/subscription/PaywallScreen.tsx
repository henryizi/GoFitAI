import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { BlurView } from 'expo-blur';
import { RevenueCatService } from '../../services/subscription/RevenueCatService';
import { useAuth } from '../../hooks/useAuth';

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

export const PaywallScreen: React.FC<PaywallScreenProps> = ({ onClose, source, offeringId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const isDevelopment = __DEV__;
  const { user } = useAuth();

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      const availableOfferings = await RevenueCatService.getOfferings();
      setOfferings(availableOfferings);
      
      if (availableOfferings && availableOfferings[0]?.availablePackages) {
        const monthlyPkg = availableOfferings[0].availablePackages.find((pkg: any) => 
          pkg.packageType === 'MONTHLY' || pkg.identifier.includes('monthly')
        );
        if (monthlyPkg) {
          setSelectedPackage(monthlyPkg);
        } else {
            setSelectedPackage(availableOfferings[0].availablePackages[0]);
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

      const result = await RevenueCatService.purchasePackage(selectedPackage);
      if (result.success) {
        Alert.alert('Success!', 'Welcome to GoFitAI Premium!', [
          { text: 'Continue', onPress: onClose }
        ]);
      } else if (result.error !== 'Purchase was cancelled by user') {
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

  const handleSkip = async () => {
    if (isDevelopment) {
      Alert.alert('Development Mode', 'Skip paywall for testing?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: onClose }
      ]);
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
                <View>
                    <Text style={styles.planTitle}>
                        {pkg.packageType === 'LIFETIME' ? 'Lifetime Access' : 'Monthly Plan'}
                    </Text>
                    {hasTrial && <Text style={styles.trialText}>7-Day Free Trial</Text>}
                </View>
                <View style={[styles.radioButton, isSelected && styles.radioButtonActive]}>
                    {isSelected && <View style={styles.radioButtonSelected} />}
                </View>
            </View>

            <View style={styles.priceWrapper}>
                <Text style={styles.priceLarge}>{pkg.product.priceString}</Text>
                <Text style={styles.priceSubtitle}>
                    {pkg.packageType === 'LIFETIME' ? 'One-time payment' : '/month'}
                </Text>
            </View>
            
            {pkg.packageType === 'LIFETIME' && (
                <Text style={styles.planDescription}>Pay once, own it forever. No recurring fees.</Text>
            )}
             {pkg.packageType === 'MONTHLY' && (
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
            <TouchableOpacity onPress={handleRestore}>
                <Text style={styles.restoreText}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
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
            {renderPlan(lifetimePackage, true)}
            {renderPlan(monthlyPackage, false)}
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
                     selectedPackage?.product?.introPrice ? 'Start Free Trial' : 
                     selectedPackage ? 'Continue' : 'Select a Plan'}
                </Text>
                {!isLoading && selectedPackage?.product?.introPrice && (
                    <Text style={styles.ctaSubtext}>7 days free, then {selectedPackage.product.priceString}/mo</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
            Recurring billing. Cancel anytime.
        </Text>
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
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  trialText: {
    color: THEME.colors.success,
    fontWeight: '600',
    fontSize: 13,
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
    fontSize: 28,
    fontWeight: '700',
    color: THEME.colors.text,
    marginRight: 6,
  },
  priceSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 15,
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
  },
  disclaimer: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
});

export default PaywallScreen;