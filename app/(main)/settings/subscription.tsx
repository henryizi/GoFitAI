/**

 * Subscription Management Screen
 * 
 * This screen allows users to view and manage their subscription status,
 * including upgrading, downgrading, and canceling subscriptions.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  List,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSubscription } from '../../../src/hooks/useSubscription';
import { RevenueCatService, SubscriptionInfo } from '../../../src/services/subscription/RevenueCatService';
import { PREMIUM_FEATURES } from '../../../src/config/revenuecat';
import { LinearGradient } from 'expo-linear-gradient';

const PREMIUM_FEATURE_LIST = [
  {
    icon: 'fitness' as const,
    title: 'Unlimited AI Workout Plans',
    description: 'Generate personalized workout plans with Gemini AI',
    backgroundColor: '#1a1a1a',
  },
  {
    icon: 'nutrition' as const,
    title: 'Unlimited AI Nutrition Plans',
    description: 'Custom daily meal plans tailored to your goals',
    backgroundColor: '#2d2d2d',
  },
  {
    icon: 'analytics' as const,
    title: 'Advanced Progress Tracking',
    description: 'Detailed weight trends, photos, and metrics analysis',
    backgroundColor: '#000000',
  },
  {
    icon: 'barbell' as const,
    title: 'Custom Workout Builder',
    description: 'Build your own workouts with our exercise library',
    backgroundColor: '#1a1a1a',
  },
];

export default function SubscriptionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    isPremium, 
    subscriptionInfo, 
    refreshSubscription, 
    restorePurchases,
    isLoading: subscriptionLoading 
  } = useSubscription();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailedInfo, setDetailedInfo] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    loadDetailedSubscriptionInfo();
  }, []);

  const loadDetailedSubscriptionInfo = async () => {
    try {
      const info = await RevenueCatService.getSubscriptionInfo();
      setDetailedInfo(info);
    } catch (error) {
      console.error('[Subscription] Failed to load detailed info:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubscription();
      await loadDetailedSubscriptionInfo();
    } catch (error) {
      console.error('[Subscription] Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpgrade = () => {
    router.push('/paywall');
  };

  const handleManageSubscription = () => {
    Alert.alert(
      'Manage Subscription',
      'To modify or cancel your subscription, please visit the App Store or Google Play Store.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Store', 
          onPress: () => {
            // In a real app, you would open the appropriate store
            Alert.alert('Info', 'This would open the App Store or Google Play Store to manage your subscription.');
          }
        },
      ]
    );
  };

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
    } catch (error) {
      console.error('[Subscription] Restore failed:', error);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = () => {
    if (!isPremium) return theme.colors.outline;
    if (detailedInfo?.isInGracePeriod) return theme.colors.error;
    return theme.colors.primary;
  };

  const getStatusText = () => {
    if (!isPremium) return 'Free';
    if (detailedInfo?.isInGracePeriod) return 'Payment Issue';
    if (!detailedInfo?.willRenew) return 'Expires Soon';
    return 'Active';
  };

  if (subscriptionLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          Loading subscription details...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Premium Header with Gradient */}
      <LinearGradient
        colors={isPremium 
          ? ['#2d1810', '#1a1a1a', '#2d2d2d', 'rgba(255,107,53,0.3)'] 
          : ['#000000', '#1a1a1a', '#2d2d2d', 'rgba(255,107,53,0.2)']
        }
        locations={[0, 0.3, 0.7, 1]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isPremium ? 'Premium Member' : 'Go Premium'}
          </Text>
          <View style={styles.headerSpace} />
        </View>
        
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View style={[styles.statusBadge, isPremium && styles.premiumBadge]}>
            <Ionicons 
              name={isPremium ? 'diamond' : 'diamond-outline'} 
              size={20} 
              color={isPremium ? '#ff6b35' : 'white'} 
            />
            <Text style={[styles.statusBadgeText, isPremium && styles.premiumBadgeText]}>
              {isPremium ? 'PREMIUM ACTIVE' : 'FREE PLAN'}
            </Text>
          </View>
        </View>
        
        {/* Premium Description */}
        <Text style={styles.headerDescription}>
          {isPremium 
            ? 'Enjoy unlimited access to all premium features'
            : 'Unlock the full potential of GoFit AI with premium features'
          }
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#ff6b35']}
          />
        }
      >
        {/* Subscription Details Card (Only for Premium Users) */}
        {isPremium && detailedInfo && (
          <View style={styles.subscriptionCard}>
            <LinearGradient
              colors={['#1a1a1a', '#2d2d2d']}
              style={styles.subscriptionCardGradient}
            >
              <Text style={styles.subscriptionCardTitle}>Your Subscription</Text>
              <View style={styles.subscriptionDetails}>
                {detailedInfo.productId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Plan Type</Text>
                    <Text style={styles.detailValue}>
                      {detailedInfo.productId.includes('monthly') ? 'Monthly' : 
                       detailedInfo.productId.includes('yearly') ? 'Yearly' : 
                       detailedInfo.productId.includes('lifetime') ? 'Lifetime' : 
                       'Premium'}
                    </Text>
                  </View>
                )}
                
                {detailedInfo.expirationDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {detailedInfo.willRenew ? 'Renews On' : 'Expires On'}
                    </Text>
                    <Text style={styles.detailValue}>
                      {formatDate(detailedInfo.expirationDate ? new Date(detailedInfo.expirationDate) : null)}
                    </Text>
                  </View>
                )}

                {detailedInfo.originalPurchaseDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Member Since</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(detailedInfo.originalPurchaseDate ? new Date(detailedInfo.originalPurchaseDate) : null)}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Premium Features Grid */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>
            {isPremium ? '✨ Your Premium Features' : '🚀 Premium Features'}
          </Text>
          
          <View style={styles.featuresGrid}>
            {PREMIUM_FEATURE_LIST.map((feature, index) => (
              <View key={index} style={[
                styles.featureCard,
                !isPremium && styles.featureCardDisabled
              ]}>
                <View
                  style={[
                    styles.featureCardGradient, 
                    { backgroundColor: isPremium ? feature.backgroundColor : '#404040' }
                  ]}
                >
                  <View style={styles.featureCardContent}>
                    <View style={styles.featureIconContainer}>
                      <Ionicons 
                        name={feature.icon} 
                        size={24} 
                        color={isPremium ? "white" : "#666666"} 
                      />
                      {isPremium ? (
                        <View style={styles.checkmarkBadge}>
                          <Ionicons name="checkmark" size={12} color="#4CAF50" />
                        </View>
                      ) : (
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={10} color="#999999" />
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.featureCardTitle,
                      !isPremium && styles.featureCardTitleDisabled
                    ]}>
                      {feature.title}
                    </Text>
                    <Text style={[
                      styles.featureCardDescription,
                      !isPremium && styles.featureCardDescriptionDisabled
                    ]}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isPremium ? (
            <Pressable onPress={handleUpgrade}>
              <LinearGradient
                colors={['#ff6b35', '#ff8c42']}
                style={styles.upgradeButton}
              >
                <Ionicons name="diamond" size={20} color="white" />
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable onPress={handleManageSubscription}>
              <View style={styles.manageButton}>
                <Ionicons name="settings-outline" size={20} color="#ff6b35" />
                <Text style={styles.manageButtonText}>Manage Subscription</Text>
              </View>
            </Pressable>
          )}

          <Pressable onPress={handleRestorePurchases} style={styles.restoreButton}>
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          </Pressable>
        </View>

        {/* Support Section */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          
          <View style={styles.supportGrid}>
            <Pressable 
              style={styles.supportItem}
              onPress={() => Alert.alert('Support', 'Support contact information would be shown here.')}
            >
              <View style={[styles.supportIcon, { backgroundColor: '#2d2d2d' }]}>
                <Ionicons name="headset" size={24} color="#ff6b35" />
              </View>
              <Text style={styles.supportItemTitle}>Contact Support</Text>
              <Text style={styles.supportItemDescription}>Get help with your subscription</Text>
            </Pressable>
            
            <Pressable 
              style={styles.supportItem}
              onPress={() => Alert.alert('Billing', 'Billing history would be shown here.')}
            >
              <View style={[styles.supportIcon, { backgroundColor: '#2d2d2d' }]}>
                <Ionicons name="receipt" size={24} color="#ff6b35" />
              </View>
              <Text style={styles.supportItemTitle}>Billing History</Text>
              <Text style={styles.supportItemDescription}>View your payment history</Text>
            </Pressable>
            
            <Pressable 
              style={styles.supportItem}
              onPress={() => Alert.alert('Legal', 'Legal documents would be shown here.')}
            >
              <View style={[styles.supportIcon, { backgroundColor: '#2d2d2d' }]}>
                <Ionicons name="document-text" size={24} color="#ff6b35" />
              </View>
              <Text style={styles.supportItemTitle}>Terms & Privacy</Text>
              <Text style={styles.supportItemDescription}>Read our terms and privacy policy</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#000000',
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
  },
  
  // Header Styles
  headerGradient: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginLeft: 20,
    letterSpacing: -0.5,
  },
  headerSpace: {
    flex: 1,
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,107,53,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  premiumBadgeText: {
    color: '#ff6b35',
  },
  headerDescription: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    paddingHorizontal: 8,
  },
  
  // Content Styles
  content: {
    flex: 1,
    padding: 20,
    marginTop: -15,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space above tab bar
  },
  
  // Subscription Card
  subscriptionCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  subscriptionCardGradient: {
    padding: 20,
  },
  subscriptionCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  subscriptionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#cccccc',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  // Features Section
  featuresContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featureCardGradient: {
    padding: 20,
  },
  featureCardContent: {
    alignItems: 'center',
  },
  featureIconContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  checkmarkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureCardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Disabled Feature Styles
  featureCardDisabled: {
    opacity: 0.6,
  },
  featureCardTitleDisabled: {
    color: '#666666',
  },
  featureCardDescriptionDisabled: {
    color: '#555555',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#333333',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Action Buttons
  actionsContainer: {
    marginBottom: 32,
    gap: 16,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#ff6b35',
    gap: 8,
  },
  manageButtonText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  restoreButtonText: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Support Section
  supportContainer: {
    marginBottom: 40,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  supportGrid: {
    gap: 16,
  },
  supportItem: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  supportItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  supportItemDescription: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 18,
  },
});