import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';

export const MockLogProgress = () => {
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
            <Text style={styles.coachMessage}>Track your weight to monitor your progress over time.</Text>
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

        {/* Weight Input Card */}
        <View style={styles.weightCard}>
          <Text style={styles.weightLabel}>Today's Weight</Text>
          <View style={styles.weightInputContainer}>
            <TouchableOpacity style={styles.adjustButton}>
              <Icon name="minus" size={24} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.weightDisplay}>
              <Text style={styles.weightValue}>75.5</Text>
              <Text style={styles.weightUnit}>kg</Text>
            </View>
            <TouchableOpacity style={styles.adjustButton}>
              <Icon name="plus" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.weightHint}>Tap +/- to adjust</Text>
        </View>

        {/* Body Fat Input */}
        <View style={styles.bodyFatCard}>
          <Text style={styles.bodyFatLabel}>Body Fat % (optional)</Text>
          <View style={styles.bodyFatInput}>
            <Text style={styles.bodyFatValue}>18.5</Text>
            <Text style={styles.bodyFatUnit}>%</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Weight Entry</Text>
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
  weightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 20,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  adjustButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginHorizontal: 32,
  },
  weightValue: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.white,
    marginRight: 8,
  },
  weightUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
  },
  weightHint: {
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.5)',
  },
  bodyFatCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  bodyFatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 12,
  },
  bodyFatInput: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bodyFatValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    marginRight: 8,
  },
  bodyFatUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
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



