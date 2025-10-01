import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Switch, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../../src/styles/colors';

export default function PrivacySecurityScreen() {
  const [dataSharing, setDataSharing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [biometrics, setBiometrics] = useState(false);

  const SettingRow = ({ title, subtitle, value, onValueChange, icon }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.iconContainer}>
          <IconButton icon={icon} size={20} iconColor={colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
        thumbColor={value ? colors.white : 'rgba(255,255,255,0.8)'}
        ios_backgroundColor="rgba(255,255,255,0.2)"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton 
          icon="arrow-left" 
          size={24} 
          onPress={() => router.back()} 
          style={styles.backButton} 
        />
        <Text variant="headlineSmall" style={styles.title}>Privacy & Security</Text>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PRIVACY</Text>
        
        <SettingRow
          title="Data Sharing"
          subtitle="Share usage data to improve app experience"
          value={dataSharing}
          onValueChange={setDataSharing}
          icon="share"
        />
        
        <SettingRow
          title="Analytics"
          subtitle="Help us improve the app with usage analytics"
          value={analytics}
          onValueChange={setAnalytics}
          icon="chart-line"
        />
      </View>

      {/* Security Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>
        
        <SettingRow
          title="Biometric Lock"
          subtitle="Use fingerprint or face ID to secure app"
          value={biometrics}
          onValueChange={setBiometrics}
          icon="fingerprint"
        />
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
        
        <TouchableOpacity 
          style={styles.actionRow}
          onPress={() => Alert.alert('Export Data', 'This feature will be available soon.')}
        >
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <IconButton icon="download" size={20} iconColor={colors.primary} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>Export My Data</Text>
              <Text style={styles.settingSubtitle}>Download a copy of your data</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={16} iconColor={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionRow}
          onPress={() => Alert.alert(
            'Delete Account', 
            'This will permanently delete your account and all data. This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.') }
            ]
          )}
        >
          <View style={styles.settingInfo}>
            <View style={styles.iconContainer}>
              <IconButton icon="delete" size={20} iconColor={colors.accent} />
            </View>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: colors.accent }]}>Delete Account</Text>
              <Text style={styles.settingSubtitle}>Permanently delete your account</Text>
            </View>
          </View>
          <IconButton icon="chevron-right" size={16} iconColor={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          Your privacy is important to us. We only collect data necessary to provide and improve our services. 
          For more details, please read our Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
    flex: 1,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
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
  infoSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 32,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});





