import React from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { colors } from '../../../src/styles/colors';
import { useAuth, signOut } from '../../../src/hooks/useAuth';

export default function AppSettingsScreen() {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      const { error } = await signOut(user?.id);
      if (error) {
        Alert.alert('Error', 'Failed to log out. Please try again.');
        console.error('Logout error:', error);
        return;
      }
      router.replace('/(auth)/login' as any);
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred during logout.');
      console.error('Unexpected logout error:', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.title}>App Settings</Text>
      </View>

      <View style={styles.placeholderSection}>
        <Text style={styles.placeholderText}>App preferences coming soon...</Text>
        <Text style={[styles.placeholderText, { marginTop: 8, fontSize: 12 }]}>
          For notifications, use the Notifications screen.
        </Text>
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
    fontSize: 20,
    fontWeight: '700',
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