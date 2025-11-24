import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../../src/styles/colors';

export default function PrivacySecurityScreen() {
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
        <Text style={styles.title}>Privacy & Security</Text>
      </View>

      {/* Privacy & Security Info */}
      <View style={styles.infoSection}>
        <Text style={[styles.infoText, { fontSize: 16, fontWeight: '600', marginBottom: 16 }]}>
          Your Privacy Matters
        </Text>
        <Text style={styles.infoText}>
          Your privacy is important to us. We only collect data necessary to provide and improve our services.
        </Text>
        <Text style={[styles.infoText, { marginTop: 16 }]}>
          • Your workout and nutrition data is encrypted{'\n'}
          • We never share your personal information{'\n'}
          • You maintain full control of your data{'\n'}
          • Account deletion available upon request
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
    fontSize: 20,
    fontWeight: '700',
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





