import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';
import { useTutorial } from '../../../contexts/TutorialContext';
import WeightProgressChart from '../../progress/WeightProgressChart';

const { width } = Dimensions.get('window');
const TABS = ['Dashboard', 'History', 'Photos'];

const MOCK_CHART_DATA = [
  { metric_date: '2023-11-01', weight_kg: 85.5 },
  { metric_date: '2023-11-03', weight_kg: 85.2 },
  { metric_date: '2023-11-05', weight_kg: 84.9 },
  { metric_date: '2023-11-08', weight_kg: 84.5 },
  { metric_date: '2023-11-10', weight_kg: 84.8 },
  { metric_date: '2023-11-12', weight_kg: 84.2 },
  { metric_date: '2023-11-15', weight_kg: 83.8 },
];

export const MockProgress = () => {
  const insets = useSafeAreaInsets();
  const { state } = useTutorial();
  const [activeTab, setActiveTab] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-switch tabs based on tutorial step
  useEffect(() => {
    if (state.currentStep?.id === 'progress_log_weight') {
      setActiveTab(0); // Dashboard
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else if (state.currentStep?.id === 'progress_weight_trend') {
      setActiveTab(0); // Dashboard
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 450, animated: true });
      }, 100);
    } else if (state.currentStep?.id === 'progress_log_photo' || state.currentStep?.id === 'progress_photo_comparison') {
      setActiveTab(2); // Photos
    }
  }, [state.currentStep?.id]);

  const renderDashboard = () => (
    <ScrollView 
      ref={scrollViewRef}
      contentContainerStyle={styles.scrollContent} 
      showsVerticalScrollIndicator={false}
    >
      {/* Weight Trend Chart - TARGET */}
      <TutorialWrapper tutorialId="weight-trend-chart">
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weight Trend</Text>
          <WeightProgressChart data={MOCK_CHART_DATA} unit="kg" />
        </View>
      </TutorialWrapper>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderPhotos = () => {
    const showComparison = state.currentStep?.id === 'progress_photo_comparison';

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showComparison ? (
          <TutorialWrapper tutorialId="before-after-comparison">
            <View style={styles.comparisonCard}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonTitle}>Progress Comparison</Text>
                <Text style={styles.comparisonSubtitle}>Track your transformation journey</Text>
              </View>
              <View style={styles.comparisonImages}>
                <View style={styles.comparisonImageContainer}>
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1000&auto=format&fit=crop' }} 
                    style={styles.comparisonImage} 
                  />
                  <View style={styles.comparisonLabel}>
                    <Text style={styles.comparisonLabelText}>BEFORE</Text>
                  </View>
                </View>
                <View style={styles.comparisonDivider}>
                  <View style={styles.comparisonHandle}>
                    <Icon name="unfold-more-vertical" size={20} color={colors.primary} />
                  </View>
                </View>
                <View style={styles.comparisonImageContainer}>
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=1000&auto=format&fit=crop' }} 
                    style={styles.comparisonImage} 
                  />
                  <View style={styles.comparisonLabel}>
                    <Text style={styles.comparisonLabelText}>AFTER</Text>
                  </View>
                </View>
              </View>
            </View>
          </TutorialWrapper>
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconContainer}>
                <Icon name="camera" size={48} color={colors.primary} />
              </View>
              <Text style={styles.emptyText}>No Photos Yet</Text>
              <Text style={styles.emptySubText}>Capture your transformation journey visually</Text>
              <TutorialWrapper tutorialId="log-body-photos-manual">
                <TouchableOpacity style={styles.createButtonContainer}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.createButton}>
                    <Icon name="camera-plus" size={16} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.createButtonText}>Add First Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </TutorialWrapper>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

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
            <Text style={styles.coachMessage}>Track your progress and see how far you've come!</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <TutorialWrapper tutorialId="log-weight-button">
            <View style={styles.quickActionCard}>
              <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(255, 107, 53, 0.12)' }]}>
                <Icon name="plus-circle" size={22} color={colors.primary} />
              </View>
              <Text style={styles.quickActionLabel}>Log Weight</Text>
            </View>
          </TutorialWrapper>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Icon name="camera" size={22} color="#6366F1" />
            </View>
            <Text style={styles.quickActionLabel}>Log Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
              <Icon name="history" size={22} color="#22C55E" />
            </View>
            <Text style={styles.quickActionLabel}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard}>
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="compare" size={22} color="#EF4444" />
            </View>
            <Text style={styles.quickActionLabel}>Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === index && styles.tabButtonActive]}
              onPress={() => setActiveTab(index)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === index && styles.tabButtonTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === 0 ? renderDashboard() : 
           activeTab === 2 ? renderPhotos() : 
           <View style={styles.emptyContainer}><Text style={{color:'white'}}>History Mock</Text></View>}
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

  // Tab Selector
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(235, 235, 245, 0.6)',
  },
  tabButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Chart Card
  chartCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
  },

  // Photos Empty
  emptyContainer: {
    padding: 24,
    paddingTop: 40,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: 'rgba(235, 235, 245, 0.6)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  createButtonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Photos Comparison
  comparisonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  comparisonHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  comparisonSubtitle: {
    fontSize: 13,
    color: 'rgba(235, 235, 245, 0.6)',
    fontWeight: '500',
  },
  comparisonImages: {
    flexDirection: 'row',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonImageContainer: {
    flex: 1,
    position: 'relative',
  },
  comparisonImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  comparisonLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comparisonLabelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  comparisonDivider: {
    width: 4,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  comparisonHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
});
