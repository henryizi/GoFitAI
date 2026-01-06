import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

export const MockLogPhoto = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.mainContent, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>Good morning</Text>
            <Text style={styles.coachMessage}>Capture your progress photos to track your transformation visually.</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
              <Icon name="arrow-left" size={22} color={colors.primary} />
            </View>
            <Text style={styles.quickActionLabel}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="chart-line" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="camera-image" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="scale" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Weight</Text>
          </TouchableOpacity>
        </View>

        {/* Photo Capture Section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Front Photo</Text>
          <TouchableOpacity style={styles.photoButton}>
            <View style={styles.photoPlaceholder}>
              <Icon name="camera" size={48} color={colors.primary} />
              <Text style={styles.photoButtonText}>Take Front Photo</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Back Photo</Text>
          <TouchableOpacity style={styles.photoButton}>
            <View style={styles.photoPlaceholder}>
              <Icon name="camera" size={48} color={colors.primary} />
              <Text style={styles.photoButtonText}>Take Back Photo</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Progress Photos</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  mainContent: {
    paddingHorizontal: 20,
  },
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
    color: colors.white,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
    lineHeight: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
    letterSpacing: 0.3,
  },
  photoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },
  photoButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});



