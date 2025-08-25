import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, ImageBackground, Alert, Switch } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  secondary: '#FF8F65',
  background: '#121212',
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
};

export default function PrivacySecurityScreen() {
  const insets = useSafeAreaInsets();
  
  // Privacy states
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [shareWorkouts, setShareWorkouts] = useState(false);
  const [shareProgress, setShareProgress] = useState(false);
  const [allowAnalytics, setAllowAnalytics] = useState(true);
  const [biometricLock, setBiometricLock] = useState(false);
  const [autoLock, setAutoLock] = useState(true);

  const handleSave = async () => {
    try {
      const settings = {
        profileVisibility,
        shareWorkouts,
        shareProgress,
        allowAnalytics,
        biometricLock,
        autoLock,
      };
      
      await AsyncStorage.setItem('privacySettings', JSON.stringify(settings));
      
      Alert.alert('Success', 'Privacy settings saved!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save privacy settings');
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This feature will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleTwoFactor = () => {
    Alert.alert(
      'Two-Factor Authentication',
      'This feature will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      'Export Data',
      'Your data export will be emailed to you within 24 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Data export requested') }
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your fitness data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This will delete ALL your data permanently.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Forever', style: 'destructive', onPress: () => console.log('Data deletion confirmed') }
              ]
            );
          }
        }
      ]
    );
  };

  const PrivacySetting = ({ title, subtitle, value, onValueChange, icon }) => (
    <View style={styles.settingCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.settingCardGradient}
      >
        <View style={styles.settingIconContainer}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
          thumbColor={value ? colors.white : 'rgba(255,255,255,0.8)'}
          ios_backgroundColor="rgba(255,255,255,0.2)"
        />
      </LinearGradient>
    </View>
  );

  const ActionCard = ({ title, subtitle, onPress, icon, isDestructive = false }) => (
    <TouchableOpacity onPress={onPress} style={styles.actionCard}>
      <LinearGradient
        colors={isDestructive ? 
          ['rgba(255,69,58,0.15)', 'rgba(255,69,58,0.05)'] :
          ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.actionCardGradient}
      >
        <View style={[styles.actionIconContainer, isDestructive && styles.destructiveIconContainer]}>
          <Icon name={icon} size={20} color={isDestructive ? colors.error : colors.primary} />
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, isDestructive && styles.destructiveText]}>{title}</Text>
          <Text style={styles.actionSubtitle}>{subtitle}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      </LinearGradient>
    </TouchableOpacity>
  );

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>PRIVACY & SECURITY</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>PRIVACY SETTINGS</Text></Text>
          
          <PrivacySetting
            title="Public Profile"
            subtitle="Make your profile visible to other users"
            value={profileVisibility}
            onValueChange={setProfileVisibility}
            icon="account-circle"
          />
          
          <PrivacySetting
            title="Share Workouts"
            subtitle="Allow others to see your workout plans"
            value={shareWorkouts}
            onValueChange={setShareWorkouts}
            icon="dumbbell"
          />
          
          <PrivacySetting
            title="Share Progress"
            subtitle="Share your fitness progress with others"
            value={shareProgress}
            onValueChange={setShareProgress}
            icon="chart-line"
          />
          
          <PrivacySetting
            title="Analytics & Crash Reports"
            subtitle="Help improve the app by sharing anonymous data"
            value={allowAnalytics}
            onValueChange={setAllowAnalytics}
            icon="chart-pie"
          />
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>SECURITY</Text></Text>
          
          <PrivacySetting
            title="Biometric Lock"
            subtitle="Use Face ID or Touch ID to unlock the app"
            value={biometricLock}
            onValueChange={setBiometricLock}
            icon="fingerprint"
          />
          
          <PrivacySetting
            title="Auto Lock"
            subtitle="Lock the app when inactive"
            value={autoLock}
            onValueChange={setAutoLock}
            icon="lock"
          />
          
          <ActionCard
            title="Change Password"
            subtitle="Update your account password"
            onPress={handleChangePassword}
            icon="key"
          />
          
          <ActionCard
            title="Two-Factor Authentication"
            subtitle="Add an extra layer of security"
            onPress={handleTwoFactor}
            icon="shield-check"
          />
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>03 <Text style={styles.sectionTitleText}>DATA MANAGEMENT</Text></Text>
          
          <ActionCard
            title="Export My Data"
            subtitle="Download a copy of your data"
            onPress={handleDataExport}
            icon="download"
          />
          
          <ActionCard
            title="Delete All Data"
            subtitle="Permanently delete all your fitness data"
            onPress={handleDeleteAllData}
            icon="delete-forever"
            isDestructive={true}
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <LinearGradient
            colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
            style={styles.infoCard}
          >
            <Icon name="shield-check" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Your Privacy Matters</Text>
              <Text style={styles.infoText}>
                We use industry-standard encryption to protect your data. 
                Your personal information is never shared without your consent.
              </Text>
            </View>
          </LinearGradient>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 16,
  },
  sectionTitleText: {
    color: colors.text,
  },
  settingCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  settingSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  actionCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,53,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  destructiveIconContainer: {
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  destructiveText: {
    color: colors.error,
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
}); 