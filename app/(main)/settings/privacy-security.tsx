import React, { useState, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert, Linking, Image, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth, signOut } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';
import Constants from 'expo-constants';

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#FF453A',
};

export default function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

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
    
    message = "Manage your privacy settings and account security here.";
    
    return { greeting, message };
  }, []);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.\n\nAll your data will be permanently deleted including:\n• Profile information\n• Workout history\n• Nutrition logs\n• Progress photos\n• All personal data\n\nNote: If you have an active subscription, you must cancel it separately in your App Store settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'This is your last chance. Type DELETE to confirm account deletion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand, Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (!user?.id) {
                Alert.alert('Error', 'User not found. Please try logging in again.');
                return;
              }

              // Get auth token for verification
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) {
                Alert.alert('Error', 'Unable to verify authentication. Please try logging in again.');
                return;
              }

              // Get server URL from environment
              const serverUrl = Constants.expoConfig?.extra?.serverUrl || process.env.EXPO_PUBLIC_SERVER_URL || 'https://gofitai-production.up.railway.app';
              
              // Call server endpoint for complete account deletion
              const response = await fetch(`${serverUrl}/api/delete-account`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: user.id,
                  authToken: session.access_token,
                }),
              });

              const result = await response.json();

              if (!result.success) {
                console.error('Account deletion error:', result.error);
                Alert.alert(
                  'Deletion Failed',
                  result.error || 'We encountered an error deleting your account. Please contact support at henry983690@gmail.com for assistance.'
                );
                return;
              }

              // Sign out the user (even if deletion succeeded)
              try {
                await signOut(user.id);
              } catch (signOutError) {
                console.warn('Sign out error (expected after account deletion):', signOutError);
              }

              Alert.alert(
                'Account Deleted',
                'Your account and all associated data have been permanently deleted. We\'re sorry to see you go.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      router.replace('/login');
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Unexpected error during account deletion:', error);
              Alert.alert(
                'Error',
                'An unexpected error occurred. Please contact support at henry983690@gmail.com'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

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
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
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

        {/* Privacy Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Icon name="shield-check" size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Your Privacy Matters</Text>
            <Text style={styles.infoText}>
              Your privacy is important to us. We only collect data necessary to provide and improve our services.
            </Text>
            <View style={styles.infoList}>
              <Text style={styles.infoListItem}>• Your workout and nutrition data is encrypted</Text>
              <Text style={styles.infoListItem}>• We never share your personal information</Text>
              <Text style={styles.infoListItem}>• You maintain full control of your data</Text>
              <Text style={styles.infoListItem}>• Account deletion available below</Text>
            </View>
          </View>
        </View>

        {/* Legal Documents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Documents</Text>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://henryizi.github.io/gofitai-privacy/')}
            activeOpacity={0.8}
          >
            <View style={styles.settingIconContainer}>
              <Icon name="shield-account" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Privacy Policy</Text>
              <Text style={styles.settingSubtitle}>How we handle your data</Text>
            </View>
            <Icon name="open-in-new" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://henryizi.github.io/gofitai-privacy/terms-of-service.html')}
            activeOpacity={0.8}
          >
            <View style={styles.settingIconContainer}>
              <Icon name="file-document-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Terms of Service</Text>
              <Text style={styles.settingSubtitle}>Terms and conditions</Text>
            </View>
            <Icon name="open-in-new" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <View style={styles.dangerZone}>
            <View style={styles.dangerZoneHeader}>
              <Icon name="alert" size={20} color={colors.error} />
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerZoneDesc}>
              Once you delete your account, there is no going back. Please be certain.
            </Text>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              <Icon name="delete-forever" size={18} color={colors.text} />
              <Text style={styles.deleteButtonText}>
                {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
              </Text>
            </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  infoList: {
    gap: 6,
  },
  infoListItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
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
    gap: 12,
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Danger Zone
  dangerZone: {
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
    padding: 16,
    marginTop: 8,
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.error,
  },
  dangerZoneDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});

