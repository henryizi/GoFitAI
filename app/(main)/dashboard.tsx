import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';

const { width: screenWidth } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  gradient: string[];
}

const quickActions: QuickAction[] = [
  {
    id: 'workout',
    title: 'Start Workout',
    subtitle: 'Begin your training session',
    icon: 'dumbbell',
    route: '/(main)/workout',
    gradient: ['#FF6B35', '#E55A2B'],
  },
  {
    id: 'nutrition',
    title: 'Nutrition Plan',
    subtitle: 'Track your daily nutrition',
    icon: 'nutrition',
    route: '/(main)/nutrition',
    gradient: ['#4CAF50', '#388E3C'],
  },
  {
    id: 'progress',
    title: 'Track Progress',
    subtitle: 'Log your body metrics',
    icon: 'chart-line',
    route: '/(main)/progress',
    gradient: ['#2196F3', '#1976D2'],
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Customize your experience',
    icon: 'cog-outline',
    route: '/(main)/settings',
    gradient: ['#9C27B0', '#7B1FA2'],
  },
];

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Add any refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getMotivationalMessage = () => {
    const messages = [
      "Ready to crush your goals today?",
      "Every step counts towards your success!",
      "Your fitness journey starts now!",
      "Make today count!",
      "Push your limits and grow stronger!",
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background */}
      <ImageBackground
        source={{ 
          uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2000&auto=format&fit=crop' 
        }}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.7)', 
            'rgba(18,18,18,0.85)', 
            'rgba(18,18,18,0.95)', 
            '#121212'
          ]}
          style={styles.overlay}
        />
      </ImageBackground>

      {/* App header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLine} />
        <Text style={styles.appName}>GO<Text style={{ color: colors.primary }}>FIT</Text></Text>
        <View style={styles.headerLine} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Welcome Header */}
        <View style={styles.sectionContainer}>
          <LinearGradient
            colors={['rgba(255,107,53,0.2)', 'rgba(0,0,0,0.3)']}
            style={styles.welcomeCard}
          >
            <View style={styles.welcomeContent}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>
                {profile?.full_name || profile?.username || 'Champion'}! 👋
              </Text>
              <Text style={styles.motivationalText}>
                {getMotivationalMessage()}
              </Text>
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <Text style={styles.dateText}>
                {currentTime.toLocaleDateString([], { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={action.gradient as any}
                  style={styles.actionGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <BlurView intensity={20} tint="light" style={styles.actionBlur}>
                    <View style={styles.actionContent}>
                      <Icon 
                        name={action.icon as any} 
                        size={32} 
                        color={colors.white} 
                        style={styles.actionIcon}
                      />
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                    </View>
                  </BlurView>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Today's Focus */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Today's Focus</Text>
          <LinearGradient
            colors={['rgba(255,107,53,0.25)', 'rgba(0,0,0,0.2)']}
            style={styles.focusCard}
          >
            <View style={styles.focusContent}>
              <Icon name="target" size={28} color={colors.primary} />
              <View style={styles.focusText}>
                <Text style={styles.focusTitle}>Stay Consistent</Text>
                <Text style={styles.focusDescription}>
                  Small daily actions lead to big results. Choose one thing to focus on today.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          <View style={styles.statsContainer}>
            <LinearGradient
              colors={['rgba(255,107,53,0.2)', 'rgba(0,0,0,0.15)']}
              style={styles.statCard}
            >
              <Icon name="calendar-check" size={24} color={colors.primary} />
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </LinearGradient>

            <LinearGradient
              colors={['rgba(255,143,101,0.15)', 'rgba(0,0,0,0.1)']}
              style={styles.statCard}
            >
              <Icon name="fire" size={24} color={colors.primaryLight} />
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </LinearGradient>

            <LinearGradient
              colors={['rgba(229,90,43,0.15)', 'rgba(0,0,0,0.1)']}
              style={styles.statCard}
            >
              <Icon name="trophy" size={24} color={colors.primaryDark} />
              <Text style={styles.statNumber}>--</Text>
              <Text style={styles.statLabel}>Goals Hit</Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  appName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    marginHorizontal: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  welcomeCard: {
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 8,
  },
  motivationalText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  timeContainer: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    color: colors.white,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (screenWidth - 72) / 2, // Account for padding and gap
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
  },
  actionBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    alignItems: 'center',
    padding: 16,
  },
  actionIcon: {
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 16,
  },
  focusCard: {
    borderRadius: 16,
    padding: 20,
  },
  focusContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  focusText: {
    flex: 1,
  },
  focusTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 6,
  },
  focusDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    color: colors.white,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});