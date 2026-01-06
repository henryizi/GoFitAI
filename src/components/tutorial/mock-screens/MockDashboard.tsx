import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ImageBackground, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';
import { BlurView } from 'expo-blur';

const { width: screenWidth } = Dimensions.get('window');

export const MockDashboard = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(18,18,18,0.85)', 'rgba(18,18,18,0.95)', '#121212']}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>GoFit<Text style={{ color: colors.primary }}>AI</Text></Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}>
        {/* AI Coach Header - TARGET for Tutorial */}
        <TutorialWrapper tutorialId="ai-coach-header">
          <View style={styles.coachHeader}>
            <View style={styles.coachAvatarContainer}>
              <Image
                source={require('../../../../assets/mascot.png')}
                style={styles.coachAvatar}
              />
              <View style={styles.coachOnlineIndicator} />
            </View>
            <View style={styles.coachTextContainer}>
              <Text style={styles.coachGreeting}>Good morning, Champion</Text>
              <Text style={styles.coachMessage}>Ready to start your fitness journey today?</Text>
            </View>
          </View>
        </TutorialWrapper>

        {/* Total Stats Card - TARGET for Tutorial */}
        <TutorialWrapper tutorialId="total-stats-card">
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Total</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>24</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>156</Text>
                <Text style={styles.statLabel}>Meals</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Weight Logs</Text>
              </View>
            </View>
          </View>
        </TutorialWrapper>

        {/* Workout Reminders - TARGET for Tutorial */}
        <View style={styles.sectionContainer}>
           <TutorialWrapper tutorialId="workout-reminder-card">
           <View style={styles.reminderCard}>
            <LinearGradient
                colors={['rgba(255,107,53,0.15)', 'rgba(0,0,0,0.2)']}
                style={styles.reminderGradient}
            >
                <View style={styles.reminderContent}>
                    <View style={styles.reminderHeader}>
                        <View style={styles.reminderIconContainer}>
                            <Icon name="clock-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.reminderTextContainer}>
                            <Text style={styles.reminderTitle}>Workout Reminder</Text>
                            <Text style={styles.reminderSubtitle}>Scheduled for 5:00 PM</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
           </View>
           </TutorialWrapper>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <View style={styles.actionCard}>
              <LinearGradient colors={['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)']} style={styles.actionGradient}>
                <Icon name="dumbbell" size={48} color={colors.white} />
                <Text style={styles.actionTitle}>Start Workout</Text>
              </LinearGradient>
            </View>
            {/* Nutrition Button - Was TARGET for Tutorial, now removed wrapper */}
            <View style={styles.actionCard}>
              <LinearGradient colors={['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)']} style={styles.actionGradient}>
                <Icon name="food-apple-outline" size={48} color={colors.white} />
                <Text style={styles.actionTitle}>Nutrition Plan</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Mock Tab Bar - Replicating Real App Design */}
      <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
        <BlurView intensity={100} tint="dark" style={styles.blurView}>
            <LinearGradient
                colors={['rgba(18, 18, 20, 0.95)', 'rgba(28, 28, 30, 0.8)']}
                style={styles.tabBarGradient}
            />
            <View style={styles.tabBarBorder} />
            
            <View style={styles.tabsRow}>
                {/* Workout Tab - TARGET for Tutorial */}
                <View style={styles.tabItem}>
                    <TutorialWrapper tutorialId="workout-tab-button">
                        <View style={styles.iconWrapper}>
                            <Icon name="dumbbell" size={22} color={colors.textSecondary} />
                        </View>
                    </TutorialWrapper>
                </View>

                {/* Nutrition Tab - TARGET for Tutorial */}
                <View style={styles.tabItem}>
                    <TutorialWrapper tutorialId="nutrition-tab-button">
                        <View style={styles.iconWrapper}>
                            <Icon name="food-apple-outline" size={22} color={colors.textSecondary} />
                        </View>
                    </TutorialWrapper>
                </View>

                {/* Dashboard Tab (Center, Active) */}
                <View style={styles.centerTabContainer}>
                    <View style={styles.centerTabShadow} />
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.centerTab}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Icon name="home" color={colors.white} size={28} />
                        <View style={styles.centerTabRing} />
                    </LinearGradient>
                    <View style={styles.centerTabGlow} />
                </View>

                {/* Progress Tab */}
                <View style={styles.tabItem}>
                    <View style={styles.iconWrapper}>
                        <Icon name="chart-line" size={22} color={colors.textSecondary} />
                    </View>
                </View>

                {/* Settings Tab */}
                <View style={styles.tabItem}>
                    <View style={styles.iconWrapper}>
                        <Icon name="cog-outline" size={22} color={colors.textSecondary} />
                    </View>
                </View>
            </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  backgroundImage: { ...StyleSheet.absoluteFillObject },
  overlay: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  appName: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 2, marginHorizontal: 12 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
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
  
  // Stats Card
  statsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(235, 235, 245, 0.6)',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignSelf: 'center',
  },
  sectionContainer: { marginBottom: 30 },
  welcomeCard: { borderRadius: 24, padding: 24 },
  greeting: { fontSize: 16, color: colors.textSecondary },
  userName: { fontSize: 24, color: colors.white, fontWeight: 'bold' },
  motivationalText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  sectionTitle: { fontSize: 20, color: colors.white, fontWeight: 'bold', marginBottom: 16 },
  actionsGrid: { flexDirection: 'row', gap: 14 },
  actionCard: { width: (screenWidth - 76) / 2, height: 130, borderRadius: 24, overflow: 'hidden' },
  actionGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  actionTitle: { fontSize: 16, color: colors.white, fontWeight: '700', marginTop: 16 },
  reminderCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,107,53,0.3)' },
  reminderGradient: { padding: 20 },
  reminderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reminderIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,107,53,0.1)', justifyContent: 'center', alignItems: 'center' },
  reminderTextContainer: { gap: 4 },
  reminderTitle: { fontSize: 16, fontWeight: '700', color: colors.white },
  reminderSubtitle: { fontSize: 13, color: colors.textSecondary },

  // Real App Tab Bar Styles
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 94, // Approx height including bottom inset
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tabBarBorder: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingLeft: 20,
    paddingTop: 10,
    height: 60,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: 5,
    marginRight: 30, // Matching the real app spacing
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'transparent',
  },
  
  // Center Tab
  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    position: 'relative',
    marginTop: 5,
    marginRight: 30,
  },
  centerTabShadow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    opacity: 0.3,
    top: 7,
    left: 7,
  },
  centerTab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  centerTabRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  centerTabGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
});

