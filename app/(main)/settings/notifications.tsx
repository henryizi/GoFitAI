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

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  
  // Notification states
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState(false);
  const [motivationalMessages, setMotivationalMessages] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [appUpdates, setAppUpdates] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const handleSave = async () => {
    try {
      const settings = {
        workoutReminders,
        mealReminders,
        progressUpdates,
        motivationalMessages,
        weeklyReports,
        appUpdates,
        emailNotifications,
        pushNotifications,
      };
      
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      Alert.alert('Success', 'Notification preferences saved!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const NotificationSetting = ({ title, subtitle, value, onValueChange, icon }) => (
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=2070&auto=format&fit=crop' }}
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
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>SAVE</Text>
          </TouchableOpacity>
        </View>

        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>01 <Text style={styles.sectionTitleText}>PUSH NOTIFICATIONS</Text></Text>
          
          <NotificationSetting
            title="Push Notifications"
            subtitle="Enable all push notifications"
            value={pushNotifications}
            onValueChange={setPushNotifications}
            icon="bell"
          />
          
          <NotificationSetting
            title="Workout Reminders"
            subtitle="Get notified when it's time to workout"
            value={workoutReminders}
            onValueChange={setWorkoutReminders}
            icon="dumbbell"
          />
          
          <NotificationSetting
            title="Meal Reminders"
            subtitle="Reminders for meal times and nutrition"
            value={mealReminders}
            onValueChange={setMealReminders}
            icon="food-apple"
          />
          
          <NotificationSetting
            title="Progress Updates"
            subtitle="Weekly progress summaries"
            value={progressUpdates}
            onValueChange={setProgressUpdates}
            icon="chart-line"
          />
          
          <NotificationSetting
            title="Motivational Messages"
            subtitle="Daily motivation and tips"
            value={motivationalMessages}
            onValueChange={setMotivationalMessages}
            icon="heart"
          />
        </View>

        {/* Reports & Updates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>02 <Text style={styles.sectionTitleText}>REPORTS & UPDATES</Text></Text>
          
          <NotificationSetting
            title="Weekly Reports"
            subtitle="Summary of your weekly progress"
            value={weeklyReports}
            onValueChange={setWeeklyReports}
            icon="calendar-week"
          />
          
          <NotificationSetting
            title="App Updates"
            subtitle="New features and improvements"
            value={appUpdates}
            onValueChange={setAppUpdates}
            icon="update"
          />
        </View>

        {/* Email Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>03 <Text style={styles.sectionTitleText}>EMAIL NOTIFICATIONS</Text></Text>
          
          <NotificationSetting
            title="Email Notifications"
            subtitle="Receive notifications via email"
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            icon="email"
          />
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <LinearGradient
            colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
            style={styles.infoCard}
          >
            <Icon name="information" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Notification Info</Text>
              <Text style={styles.infoText}>
                You can manage your device notification settings in your phone's Settings app. 
                Some notifications may require device permissions.
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