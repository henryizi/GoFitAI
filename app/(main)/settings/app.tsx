import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Switch, IconButton, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../../src/styles/colors';
import { signOut } from '../../../src/hooks/useAuth';

export default function AppSettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} style={styles.backButton} />
        <Text variant="headlineSmall" style={styles.title}>App Settings</Text>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          color={colors.primary}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Dark Mode</Text>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          color={colors.primary}
        />
      </View>

      <View style={styles.placeholderSection}>
        <Text style={styles.placeholderText}>More settings coming soon...</Text>
      </View>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutBtn}
        labelStyle={{ color: colors.textInverse }}
      >
        Log Out
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 32, // Add some padding at the bottom for the logout button
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 8,
  },
  title: {
    color: colors.text,
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  logoutBtn: {
    marginTop: 32,
    backgroundColor: colors.accent,
    borderRadius: 8,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
}); 