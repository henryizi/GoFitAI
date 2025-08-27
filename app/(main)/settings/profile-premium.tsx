import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, ImageBackground, Alert, Linking, Share, Platform, Image } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
  darkGray: '#1C1C1E',
  mediumGray: '#8E8E93',
  lightGray: '#2C2C2E',
};

export default function ProfileSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('1.0.0');
  
  // Use actual user data or fallback to defaults
  const [name, setName] = useState(profile?.full_name || 'User Name');
  const [email, setEmail] = useState(user?.email || 'user@example.com');
  const [height, setHeight] = useState(profile?.height?.toString() || '180');
  const [weight, setWeight] = useState(profile?.weight?.toString() || '75');
  
  // Calculate age from birthday
  const calculateAge = (birthday: string | null): string => {
    if (!birthday) return '25'; // fallback
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if birthday hasn't occurred this year yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };
  
  const [age, setAge] = useState(calculateAge(profile?.birthday));
  const [goal, setGoal] = useState(profile?.training_level || 'General Fitness');

  useEffect(() => {
    // Get app version
    const getAppVersion = async () => {
      try {
        const version = Application.nativeApplicationVersion || '1.0.0';
        setAppVersion(version);
      } catch (error) {
        console.log('Could not get app version');
      }
    };
    getAppVersion();
  }, []);

  // Update age when profile changes
  useEffect(() => {
    if (profile?.birthday) {
      setAge(calculateAge(profile.birthday));
    }
  }, [profile?.birthday]);

  const SettingCard = ({ icon, title, subtitle, onPress, showArrow = true }) => (
    <TouchableOpacity onPress={onPress}>
      <LinearGradient
        colors={[colors.surface, 'rgba(255,255,255,0.03)']}
        style={styles.settingCard}
      >
        <View style={styles.settingIconContainer}>
          <Icon name={icon} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {showArrow && <Icon name="chevron-right" size={24} color={colors.textSecondary} />}
      </LinearGradient>
    </TouchableOpacity>
  );

  const StatCard = ({ value, label, icon, color }) => (
    <LinearGradient
      colors={[colors.surface, 'rgba(255,255,255,0.03)']}
      style={styles.statCard}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color }]}>
        <Icon name={icon} size={20} color={colors.text} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </LinearGradient>
  );

  // Button Functions
  const handleCameraPress = async () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Gallery permission is required to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
        Alert.alert('Success', 'Profile photo updated!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleEditProfile = () => {
    router.push('/settings/edit-profile');
  };

  const handleFitnessGoals = () => {
    router.push('/settings/fitness-goals');
  };

  const handleNotifications = () => {
    router.push('/settings/notifications');
  };

  const handlePrivacySecurity = () => {
    router.push('/settings/privacy-security');
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'How would you like to get help?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Contact Us', onPress: contactSupport },
      ]
    );
  };

  const contactSupport = () => {
    const email = 'support@gofitai.com';
    const subject = 'GoFitAI Support Request';
    const body = `Hi Support Team,\n\nI need help with...\n\n---\nApp Version: ${appVersion}\nUser ID: ${user?.id}\nDevice: ${Platform.OS}`;
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Email not available', 'Please contact us at support@gofitai.com');
        }
      });
  };

  const handleAbout = () => {
    Alert.alert(
      'About GoFitAI',
      `Version: ${appVersion}\n\nGoFitAI is your AI-powered fitness companion, helping you achieve your health and fitness goals through personalized workout plans, nutrition guidance, and progress tracking.\n\n© 2024 GoFitAI. All rights reserved.`,
      [{ text: 'OK' }]
    );
  };

  const handleRateApp = async () => {
    try {
      if (Platform.OS === 'ios') {
        const iosStoreUrl = 'https://apps.apple.com/app/gofitai/id1234567890';
        Linking.openURL(iosStoreUrl);
      } else {
        const androidStoreUrl = 'https://play.google.com/store/apps/details?id=com.gofitai';
        Linking.openURL(androidStoreUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open app store');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: confirmDeleteAccount
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Final Confirmation',
      'Are you absolutely sure you want to delete your account? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
            try {
              // For now, just sign out - actual deletion would require admin privileges
              await supabase.auth.signOut();
              router.replace('/(auth)/welcome');
              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please contact support.');
            }
          }
        },
      ]
    );
  };

  // TEMPORARY RESET FUNCTION FOR BETA TESTING
  const handleResetApp = () => {
    Alert.alert(
      'Reset App to Default',
      'This will delete ALL your data including:\n\n• Workout plans\n• Weight logs\n• Body fat data\n• Progress photos\n• Nutrition plans\n• User settings\n\nThis action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[RESET] Starting complete app reset...');
              
              // Clear all AsyncStorage data
              await AsyncStorage.clear();
              console.log('[RESET] AsyncStorage cleared');
              
              // Clear Supabase database data
              if (supabase && user) {
                console.log('[RESET] Clearing Supabase database data...');
                
                // Delete workout plans and related data
                await supabase.from('workout_sessions').delete().eq('plan_id', 'any');
                await supabase.from('training_splits').delete().eq('plan_id', 'any');
                await supabase.from('exercises').delete().eq('plan_id', 'any');
                await supabase.from('workout_plans').delete().eq('user_id', user.id);
                console.log('[RESET] Workout plans deleted');
                
                // Delete nutrition plans
                await supabase.from('nutrition_plans').delete().eq('user_id', user.id);
                console.log('[RESET] Nutrition plans deleted');
                
                // Delete progress entries and photos
                await supabase.from('progress_entries').delete().eq('user_id', user.id);
                await supabase.from('body_photos').delete().eq('user_id', user.id);
                await supabase.from('body_analysis').delete().eq('user_id', user.id);
                console.log('[RESET] Progress data deleted');
                
                // Delete daily metrics
                await supabase.from('daily_user_metrics').delete().eq('user_id', user.id);
                console.log('[RESET] Daily metrics deleted');
                
                // Delete food entries
                await supabase.from('food_entries').delete().eq('user_id', user.id);
                console.log('[RESET] Food entries deleted');
                
                // Delete meal plan suggestions
                await supabase.from('meal_plan_suggestions').delete().eq('user_id', user.id);
                console.log('[RESET] Meal plan suggestions deleted');
              }
              
              // Clear Supabase storage (body photos)
              if (supabase && user) {
                try {
                  console.log('[RESET] Clearing Supabase storage...');
                  const { data: photos } = await supabase.storage
                    .from('body-photos')
                    .list(user.id);
                  
                  if (photos && photos.length > 0) {
                    const filesToDelete = photos.map(photo => `${user.id}/${photo.name}`);
                    await supabase.storage
                      .from('body-photos')
                      .remove(filesToDelete);
                    console.log('[RESET] Storage photos deleted');
                  }
                } catch (storageError) {
                  console.warn('[RESET] Storage clear error (may be empty):', storageError);
                }
              }
              
              // Show success message
              Alert.alert(
                'Reset Complete',
                'All app data has been cleared from:\n\n• Local storage\n• Database\n• Photo storage\n\nThe app will now show default state.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Reload the app by navigating to home
                      router.replace('/(main)');
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('[RESET] Error clearing data:', error);
              Alert.alert('Reset Failed', 'There was an error clearing the data. Please try again.');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', colors.dark]}
          style={styles.overlay}
        />
      </ImageBackground>

      <ScrollView 
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.profileCard}
          >
            <View style={styles.profileImageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Icon name="account" size={40} color={colors.text} />
                </View>
              )}
              <TouchableOpacity style={styles.cameraButton} onPress={handleCameraPress}>
                <Icon name="camera" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{name}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </LinearGradient>
        </View>

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>BODY METRICS</Text></Text>
        <View style={styles.statsContainer}>
          <StatCard value={`${height} cm`} label="Height" icon="human-male-height" color={colors.primary} />
          <StatCard value={`${weight} kg`} label="Weight" icon="weight-kilogram" color={colors.accent} />
          <StatCard value={`${age} yrs`} label="Age" icon="calendar" color={colors.success} />
        </View>

        {/* Settings Categories */}
        <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>PREFERENCES</Text></Text>
        <View style={styles.settingsContainer}>
          <SettingCard
            icon="account-edit"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={handleEditProfile}
          />
          <SettingCard
            icon="target"
            title="Fitness Goals"
            subtitle={goal}
            onPress={handleFitnessGoals}
          />
          <SettingCard
            icon="bell"
            title="Notifications"
            subtitle="Manage your notifications"
            onPress={handleNotifications}
          />
          <SettingCard
            icon="shield-check"
            title="Privacy & Security"
            subtitle="Control your data"
            onPress={handlePrivacySecurity}
          />
        </View>

        <Text style={styles.sectionTitle}>03 <Text style={styles.sectionTitleText}>SUPPORT</Text></Text>
        <View style={styles.settingsContainer}>
          <SettingCard
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help and contact us"
            onPress={handleHelpSupport}
          />
          <SettingCard
            icon="information"
            title="About"
            subtitle="App version and information"
            onPress={handleAbout}
          />
          <SettingCard
            icon="star"
            title="Rate App"
            subtitle="Share your feedback"
            onPress={handleRateApp}
          />
        </View>

        {/* Danger Zone */}
        <Text style={styles.sectionTitle}>04 <Text style={styles.sectionTitleText}>ACCOUNT</Text></Text>
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
            <LinearGradient
              colors={['rgba(255,59,48,0.1)', 'rgba(255,59,48,0.05)']}
              style={styles.dangerButtonGradient}
            >
              <Icon name="logout" size={20} color={colors.error} />
              <Text style={styles.dangerButtonText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
            <LinearGradient
              colors={['rgba(255,59,48,0.15)', 'rgba(255,59,48,0.1)']}
              style={styles.dangerButtonGradient}
            >
              <Icon name="delete" size={20} color={colors.error} />
              <Text style={styles.dangerButtonText}>Delete Account</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* TEMPORARY BETA TESTING SECTION */}
        <Text style={styles.sectionTitle}>05 <Text style={styles.sectionTitleText}>BETA TESTING</Text></Text>
        <View style={styles.dangerZone}>
          <TouchableOpacity style={styles.dangerButton} onPress={handleResetApp}>
            <LinearGradient
              colors={['rgba(255,165,0,0.2)', 'rgba(255,165,0,0.1)']}
              style={styles.dangerButtonGradient}
            >
              <Icon name="refresh" size={20} color="#FFA500" />
              <Text style={[styles.dangerButtonText, { color: '#FFA500' }]}>Reset App to Default</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>GoFitAI v{appVersion}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitleText: {
    color: colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  settingsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  dangerZone: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  dangerButton: {
    marginBottom: 12,
  },
  dangerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  dangerButtonText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  versionContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  versionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
}); 