import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { useAuth, signOut } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';
import { formatHeightWithUnit, formatWeightWithUnit } from '../../../src/utils/unitConversions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RevenueCatService } from '../../../src/services/subscription/RevenueCatService';
import { useSubscription } from '../../../src/contexts/SubscriptionContext';

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
};

export default function SettingsScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const { isPremium } = useSubscription();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    message = "Manage your account settings and preferences here.";
    
    return { greeting, message };
  }, []);

  const handleCopyUserId = async () => {
    if (user?.id) {
      await Clipboard.setStringAsync(user.id);
      setCopied(true);
      Alert.alert('Copied!', 'User ID copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Refresh profile when screen comes into focus to ensure latest data
  useFocusEffect(
    React.useCallback(() => {
      refreshProfile().catch(err => {
        console.warn('Failed to refresh profile on settings screen:', err);
      });
      
      // Fetch latest weight
      const fetchLatestWeight = async () => {
        if (!user?.id) return;
        
        try {
          const { data, error } = await supabase
            .from('daily_user_metrics')
            .select('weight_kg')
            .eq('user_id', user.id)
            .not('weight_kg', 'is', null)
            .order('metric_date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (data?.weight_kg) {
            setLatestWeight(data.weight_kg);
          } else {
            setLatestWeight(profile?.weight_kg || null);
          }
        } catch (e) {
          console.warn('Error fetching weight:', e);
          setLatestWeight(profile?.weight_kg || null);
        }
      };
      
      fetchLatestWeight();
      
      // Log user ID when settings screen loads
      if (user?.id) {
        console.log('🆔 Your User ID:', user.id);
        console.log('📧 Your Email:', user.email);
      }
    }, [refreshProfile, user, profile?.weight_kg])
  );

  const handleCheckPremiumStatus = async () => {
    Alert.alert(
      'Check Premium Status',
      'This will check your premium status and log detailed information to the console. Check the console/logs for results.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check Status', 
          onPress: async () => {
            try {
              await RevenueCatService.debugPremiumStatus();
              Alert.alert(
                'Status Checked',
                `Current Premium Status: ${isPremium ? '✅ PREMIUM' : '❌ NOT PREMIUM'}\n\nDetailed information has been logged to the console. Please check your console/logs for full details.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to check premium status. Please check the console for details.');
              console.error('Premium status check error:', error);
            }
          }
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = user?.id;
              const { error } = await signOut(userId);
              if (error) {
                Alert.alert('Error', 'Failed to log out. Please try again.');
                console.error('Logout error:', error);
                return;
              }
              // Use replace to prevent going back
              // Force navigation to login by using the full path
              router.replace('/(auth)/login' as any);
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred during logout.');
              console.error('Unexpected logout error:', error);
            }
          }
        },
      ]
    );
  };

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  const renderSettingsSection = (title: string, items: Array<{
    title: string;
    subtitle?: string;
    icon: string;
    onPress: () => void;
    badge?: string;
    badgeColor?: string;
  }>) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.settingItem}
          onPress={item.onPress}
          activeOpacity={0.8}
        >
          <View style={styles.settingIconContainer}>
            <Icon name={item.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.settingText}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
          {item.badge && (
            <View style={[styles.badge, { backgroundColor: item.badgeColor || colors.primary }]}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: 60 + insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
            <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image 
                  source={{ uri: profile.avatar_url }} 
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || profile?.username || 'User'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
            </View>
          </View>
          
          {/* Height & Weight Stats */}
          {(profile?.height_cm || latestWeight) && (
            <View style={styles.statsRow}>
              {profile?.height_cm && (
                <View style={styles.statItem}>
                  <Icon name="ruler" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>
                    {formatHeightWithUnit(profile.height_cm, profile.height_unit_preference)}
                  </Text>
                </View>
              )}
              {profile?.height_cm && latestWeight && (
                <View style={styles.statDivider} />
              )}
              {latestWeight && (
                <View style={styles.statItem}>
                  <Icon name="scale-bathroom" size={16} color={colors.textSecondary} />
                  <Text style={styles.statText}>
                    {formatWeightWithUnit(latestWeight, profile?.weight_unit_preference)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* User ID Section */}
        {user?.id && (
          <View style={styles.userIdCard}>
            <View style={styles.userIdHeader}>
              <Text style={styles.userIdLabel}>User ID</Text>
              <TouchableOpacity 
                onPress={handleCopyUserId}
                style={styles.copyButton}
                activeOpacity={0.8}
              >
                <Icon 
                  name={copied ? "check" : "content-copy"} 
                  size={16} 
                  color={copied ? colors.success : colors.primary}
                />
                <Text style={[styles.copyButtonText, copied && { color: colors.success }]}>
                  {copied ? 'Copied!' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              onPress={handleCopyUserId}
              style={styles.userIdContainer}
              activeOpacity={0.8}
            >
              <Text style={styles.userIdText} selectable>
                {user.id}
              </Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Account Settings */}
      {renderSettingsSection('Account', [
        {
          title: 'Edit Profile',
          subtitle: 'Update your personal information',
          icon: 'account-edit',
          onPress: () => handleNavigation('/(main)/settings/edit-profile'),
        },
        {
          title: 'Subscription',
          subtitle: 'Manage your subscription',
          icon: 'crown',
          onPress: () => handleNavigation('/(main)/settings/subscription'),
        },
        {
          title: 'Check Premium Status',
          subtitle: isPremium ? '✅ Premium Active' : '❌ Not Premium',
          icon: 'information',
          onPress: handleCheckPremiumStatus,
        },
      ])}

      {/* Fitness Settings */}
      {renderSettingsSection('Fitness', [
        {
          title: 'Fitness Goals',
          subtitle: 'Set and track your fitness objectives',
          icon: 'target',
          onPress: () => handleNavigation('/(main)/settings/fitness-goals'),
        },
      ])}

      {/* App Settings */}
      {renderSettingsSection('App Settings', [
        {
          title: 'Workout Reminders',
          subtitle: 'Schedule workout notifications',
          icon: 'bell-ring',
          onPress: () => handleNavigation('/(main)/settings/workout-reminders'),
        },
        {
          title: 'Privacy & Security',
          subtitle: 'Manage your privacy settings',
          icon: 'shield-account',
          onPress: () => handleNavigation('/(main)/settings/privacy-security'),
        },
        {
          title: 'Health Information & Citations',
          subtitle: 'View medical disclaimers and research sources',
          icon: 'medical-bag',
          onPress: () => handleNavigation('/(main)/settings/health-citations'),
        },
      ])}

      {/* Support Section - Removed non-functional placeholder buttons */}

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout} 
          activeOpacity={0.8}
        >
          <Icon name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Profile Card
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 14,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // User ID Card
  userIdCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  userIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userIdLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  userIdContainer: {
    paddingVertical: 8,
  },
  userIdText: {
    color: colors.text,
    fontSize: 13,
    fontFamily: 'monospace',
    lineHeight: 18,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 14,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
    gap: 10,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '700',
  },
});