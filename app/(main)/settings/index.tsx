import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, IconButton, Badge } from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../../../src/styles/colors';
import { useAuth, signOut } from '../../../src/hooks/useAuth';

export default function SettingsScreen() {
  const { profile, user, refreshProfile } = useAuth();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

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
      
      // Log user ID when settings screen loads
      if (user?.id) {
        console.log('🆔 Your User ID:', user.id);
        console.log('📧 Your Email:', user.email);
      }
    }, [refreshProfile, user])
  );

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
              router.replace('/login');
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
        >
          <View style={styles.settingContent}>
            <IconButton icon={item.icon} size={20} iconColor={colors.primary} />
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              {item.subtitle && (
                <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
              )}
            </View>
            {item.badge && (
              <Badge 
                style={{ 
                  backgroundColor: item.badgeColor || colors.primary,
                  marginRight: 8 
                }}
              >
                {item.badge}
              </Badge>
            )}
            <IconButton icon="chevron-right" size={16} iconColor={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingBottom: 60 + insets.bottom + 20 } // Tab bar height + safe area + extra padding
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          onPress={() => router.back()} 
          style={styles.backButton} 
        />
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image 
              source={{ uri: profile.avatar_url }} 
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
            </Text>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name || profile?.username || 'User'}</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.profileEmail}>{user?.email || 'No email'}</Text>
          </View>
        </View>
      </View>

      {/* User ID Section */}
      {user?.id && (
        <View style={styles.userIdSection}>
          <View style={styles.userIdHeader}>
            <Text style={styles.userIdLabel}>User ID</Text>
            <TouchableOpacity 
              onPress={handleCopyUserId}
              style={styles.copyButton}
            >
              <IconButton 
                icon={copied ? "check" : "content-copy"} 
                size={18} 
                iconColor={copied ? colors.success : colors.primary}
              />
              <Text style={[styles.copyButtonText, copied && { color: colors.success }]}>
                {copied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            onPress={handleCopyUserId}
            style={styles.userIdContainer}
            activeOpacity={0.7}
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
          title: 'Notifications',
          subtitle: 'Manage notification preferences',
          icon: 'bell',
          onPress: () => handleNavigation('/(main)/settings/notifications'),
        },
        {
          title: 'App Preferences',
          subtitle: 'Customize app behavior',
          icon: 'cog',
          onPress: () => handleNavigation('/(main)/settings/app'),
        },
        {
          title: 'Privacy & Security',
          subtitle: 'Manage your privacy settings',
          icon: 'shield-account',
          onPress: () => handleNavigation('/(main)/settings/privacy-security'),
        },
      ])}

      {/* Support Section */}
      {renderSettingsSection('Support', [
        {
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          icon: 'help-circle',
          onPress: () => Alert.alert('Support', 'Contact support at support@gofitai.com'),
        },
        {
          title: 'Terms of Service',
          subtitle: 'Read our terms and conditions',
          icon: 'file-document',
          onPress: () => Alert.alert('Terms', 'Terms of Service would open here'),
        },
        {
          title: 'Privacy Policy',
          subtitle: 'Read our privacy policy',
          icon: 'shield-check',
          onPress: () => Alert.alert('Privacy', 'Privacy Policy would open here'),
        },
      ])}

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
        <View pointerEvents="none">
          <IconButton icon="logout" size={20} iconColor={colors.accent} />
        </View>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  profileEmail: {
    color: colors.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  settingItem: {
    paddingHorizontal: 24,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingText: {
    flex: 1,
    marginLeft: 8,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginTop: 24,
  },
  logoutText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  userIdSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userIdLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: -8,
  },
  userIdContainer: {
    paddingVertical: 8,
  },
  userIdText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
}); 