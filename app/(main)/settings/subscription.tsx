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
    icon: 'infinite' as const,
    title: 'Unlimited AI Recipes',
    description: 'Generate as many custom recipes as you want',
  },
  {
    icon: 'chatbubbles' as const,
    title: 'Unlimited AI Chat',
    description: 'Get personalized nutrition advice anytime',
  },
  {
    icon: 'fitness' as const,
    title: 'Custom Workout Plans',
    description: 'AI-generated workouts tailored to your goals',
  },
  {
    icon: 'analytics' as const,
    title: 'Advanced Analytics',
    description: 'Deep insights into your fitness progress',
  },
  {
    icon: 'body' as const,
    title: 'Body Composition Analysis',
    description: 'Track muscle gain and fat loss precisely',
  },
  {
    icon: 'restaurant' as const,
    title: 'Meal Plan Customization',
    description: 'Fully customizable meal plans and preferences',
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Subscription
        </Text>
        <View style={styles.headerSpace} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Current Status Card */}
        <Card style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <View>
                <Text style={[styles.statusTitle, { color: theme.colors.onSurface }]}>
                  Current Plan
                </Text>
                <View style={styles.statusRow}>
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: getStatusColor() + '20' }]}
                    textStyle={{ color: getStatusColor() }}
                  >
                    {isPremium ? 'Premium' : 'Free'}
                  </Chip>
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: theme.colors.surfaceVariant }]}
                    textStyle={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {getStatusText()}
                  </Chip>
                </View>
              </View>
              <Ionicons 
                name={isPremium ? 'diamond' : 'gift'} 
                size={32} 
                color={getStatusColor()} 
              />
            </View>

            {isPremium && detailedInfo && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.subscriptionDetails}>
                  {detailedInfo.productId && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                        Plan Type
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                        {detailedInfo.productId.includes('monthly') ? 'Monthly' : 
                         detailedInfo.productId.includes('yearly') ? 'Yearly' : 
                         detailedInfo.productId.includes('lifetime') ? 'Lifetime' : 
                         'Premium'}
                      </Text>
                    </View>
                  )}
                  
                  {detailedInfo.expirationDate && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                        {detailedInfo.willRenew ? 'Renews On' : 'Expires On'}
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                        {formatDate(detailedInfo.expirationDate ? new Date(detailedInfo.expirationDate) : null)}
                      </Text>
                    </View>
                  )}

                  {detailedInfo.originalPurchaseDate && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>
                        Member Since
                      </Text>
                      <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                        {formatDate(detailedInfo.originalPurchaseDate ? new Date(detailedInfo.originalPurchaseDate) : null)}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Premium Features */}
        <Card style={[styles.featuresCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {isPremium ? 'Your Premium Features' : 'Premium Features'}
            </Text>
            
            {PREMIUM_FEATURE_LIST.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[
                  styles.featureIcon, 
                  { 
                    backgroundColor: isPremium 
                      ? theme.colors.primaryContainer 
                      : theme.colors.surfaceVariant 
                  }
                ]}>
                  <Ionicons 
                    name={feature.icon} 
                    size={20} 
                    color={isPremium 
                      ? theme.colors.onPrimaryContainer 
                      : theme.colors.onSurfaceVariant
                    } 
                  />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
                    {feature.title}
                  </Text>
                  <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {feature.description}
                  </Text>
                </View>
                {isPremium && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {!isPremium ? (
            <Button
              mode="contained"
              onPress={handleUpgrade}
              style={styles.primaryButton}
              contentStyle={styles.buttonContent}
              icon="diamond"
            >
              Upgrade to Premium
            </Button>
          ) : (
            <Button
              mode="outlined"
              onPress={handleManageSubscription}
              style={styles.secondaryButton}
              contentStyle={styles.buttonContent}
              icon="settings"
            >
              Manage Subscription
            </Button>
          )}

          <Button
            mode="text"
            onPress={handleRestorePurchases}
            style={styles.textButton}
          >
            Restore Purchases
          </Button>
        </View>

        {/* Support Information */}
        <Card style={[styles.supportCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Need Help?
            </Text>
            
            <List.Item
              title="Contact Support"
              description="Get help with your subscription"
              left={(props) => <List.Icon {...props} icon="headset" />}
              onPress={() => Alert.alert('Support', 'Support contact information would be shown here.')}
            />
            
            <List.Item
              title="Billing History"
              description="View your payment history"
              left={(props) => <List.Icon {...props} icon="receipt" />}
              onPress={() => Alert.alert('Billing', 'Billing history would be shown here.')}
            />
            
            <List.Item
              title="Terms & Privacy"
              description="Read our terms and privacy policy"
              left={(props) => <List.Icon {...props} icon="document-text" />}
              onPress={() => Alert.alert('Legal', 'Legal documents would be shown here.')}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerSpace: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    height: 32,
  },
  divider: {
    marginVertical: 16,
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
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuresCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  actionsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  primaryButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    marginBottom: 8,
  },
  textButton: {
    alignSelf: 'center',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  supportCard: {
    marginBottom: 32,
  },
});