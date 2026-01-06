import React, { useState, useEffect } from 'react';
import { Tabs, router, Redirect, usePathname } from 'expo-router';
import { StyleSheet, View, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon, Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../../src/hooks/useSubscription';
import { useAuth } from '../../src/hooks/useAuth';
import { TutorialWrapper } from '../../src/components/tutorial/TutorialWrapper';

const { width: screenWidth } = Dimensions.get('window');

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  accent: '#FF8F65',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textMuted: 'rgba(235, 235, 245, 0.4)',
  background: '#000000',
  tabBarBg: 'rgba(0, 0, 0, 0.95)',
  border: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  darkGray: '#1C1C1E',
  black: '#000000',
  white: '#FFFFFF',
};

export const SAFE_AREA_PADDING_BOTTOM = 34;



export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = useSubscription();
  const { user } = useAuth();
  const pathname = usePathname();
  // Development bypass: allow access in development mode
  const isDevelopment = __DEV__;
  const bypassPaywall = isDevelopment; // Only bypass in development mode

  // Don't block UI for subscription loading - show app immediately
  // Subscription status will update in background
  // if (isLoading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
  //       <ActivityIndicator size="large" color={colors.primary} />
  //       <Text style={{ color: colors.text, marginTop: 16 }}>正在验证订阅状态...</Text>
  //     </View>
  //   );
  // }

  // If user is not premium, redirect to paywall (no free tier - paid users only)
  if (!isPremium && !bypassPaywall) {
    console.log('🎯 Main Layout: Redirecting to paywall - user not premium (paid users only)');
    console.log('🎯 Current pathname:', pathname);
    return <Redirect href="/(paywall)" />;
  }

  // Development bypass message
  if (bypassPaywall && !isPremium) {
    console.log('🚀 MAIN LAYOUT: Development mode bypass - user can access full app without premium');
  }
  
  const TAB_BAR_HEIGHT = 70;
  
  return (
    <Tabs
      key="main-tabs-v5"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 7.5,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          paddingLeft: 80,
          paddingRight: 80,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingTop: 4,
        },
        tabBarBackground: () => (
          <View style={styles.tabBarContainer}>
            <BlurView intensity={80} tint="dark" style={styles.blurView}>
              <View style={styles.tabBarGradient} />
            </BlurView>
            <View style={styles.tabBarTopBorder} />
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="workout-celebration" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="meals-celebration" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="weight-celebration" options={{ tabBarButton: () => null }} />
      
      <Tabs.Screen
        name="workout"
        options={{
          tabBarLabel: 'Workout',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Icon 
                name="dumbbell" 
                color={focused ? colors.primary : colors.textMuted} 
                size={28}
              />
            </View>
          ),
        }}
      />
      
      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarLabel: 'Nutrition',
          tabBarItemStyle: {
            flex: 1,
            paddingTop: 4,
            marginLeft: 40,
            marginRight: 70,
          },
          tabBarIcon: ({ focused }) => (
            <TutorialWrapper tutorialId="nutrition-tab-button">
              <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
                <Icon 
                  name="food-apple-outline" 
                  color={focused ? colors.primary : colors.textMuted} 
                  size={28}
                />
              </View>
            </TutorialWrapper>
          ),
        }}
      />
      
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabWrapper}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.centerTabButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="home" color={colors.white} size={26} />
              </LinearGradient>
              {focused && (
                <View style={styles.centerTabGlow} />
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: (e: any) => {
            e.preventDefault();
            router.push('/(main)/dashboard');
          },
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          tabBarLabel: 'Progress',
          tabBarItemStyle: {
            flex: 1,
            paddingTop: 4,
            marginLeft: 70,
            marginRight: 0,
          },
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Icon 
                name="chart-line" 
                color={focused ? colors.primary : colors.textMuted} 
                size={28}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarLabel: 'Settings',
          tabBarItemStyle: {
            flex: 1,
            paddingTop: 4,
            marginLeft: 40,
            marginRight: 0,
          },
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Icon 
                name="cog-outline" 
                color={focused ? colors.primary : colors.textMuted} 
                size={28}
              />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e: any) => {
            // Prevent default behavior
            e.preventDefault();
            // Force navigation to the settings index page
            router.push('/(main)/settings');
          },
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Tab bar container and background
  tabBarContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.tabBarBg,
  },
  tabBarGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  tabBarTopBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },

  // Tab icon container
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 32,
    position: 'relative',
  },
  tabIconContainerActive: {
    // Active state styling handled by color
  },

  // Center tab (dashboard) - floating button style
  centerTabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    position: 'relative',
  },
  centerTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  centerTabGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
});

