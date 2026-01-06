import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';

export const MockLogFood = () => {
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
            <Text style={styles.coachMessage}>Log your meals to track your nutrition goals!</Text>
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
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="book-open-variant" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="history" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="server-network" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Server</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <View style={[styles.modeButton, styles.modeButtonActive]}>
            <Icon name="brain" size={18} color={colors.white} />
            <Text style={[styles.modeButtonText, styles.modeButtonTextActive]}>AI Scan</Text>
          </View>
          <View style={styles.modeButton}>
            <Icon name="pencil" size={18} color={colors.textSecondary} />
            <Text style={styles.modeButtonText}>Manual</Text>
          </View>
        </View>

        {/* AI Mode Section */}
        <View style={styles.section}>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>Log with AI</Text>
              <Text style={styles.aiSubtitle}>Take a photo of your meal and let AI identify it</Text>
            </View>
            
            {/* Take Photo Button - TARGET */}
            <TutorialWrapper tutorialId="ai-camera-button">
              <TouchableOpacity style={styles.aiButton}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  style={styles.aiButtonGradient}
                >
                  <Icon name="camera" size={24} color={colors.white} />
                </LinearGradient>
                <View style={styles.aiButtonContent}>
                  <Text style={styles.aiButtonText}>Take Photo</Text>
                  <Text style={styles.aiButtonSubtext}>AI will identify your food</Text>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </TutorialWrapper>
            
            <TouchableOpacity style={styles.aiButton}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.aiButtonGradient}
              >
                <Icon name="image-outline" size={24} color={colors.white} />
              </LinearGradient>
              <View style={styles.aiButtonContent}>
                <Text style={styles.aiButtonText}>Choose from Gallery</Text>
                <Text style={styles.aiButtonSubtext}>Select an existing photo</Text>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
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

  // AI Coach Header
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

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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

  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
  },
  modeButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Section
  section: {
    marginBottom: 16,
  },
  aiCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  aiHeader: {
    marginBottom: 20,
  },
  aiTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  aiSubtitle: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
    lineHeight: 20,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  aiButtonGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiButtonContent: {
    flex: 1,
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 2,
  },
  aiButtonSubtext: {
    fontSize: 12,
    color: 'rgba(235, 235, 245, 0.6)',
  },
});
