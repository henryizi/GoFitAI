import React from 'react';
import { Tabs, router, Redirect } from 'expo-router';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon, Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubscription } from '../../src/hooks/useSubscription';

const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F65',
  accent: '#FF8F65',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  background: 'rgba(18, 18, 20, 0.95)',
  backgroundLight: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(255, 255, 255, 0.08)',
  shadow: 'rgba(0, 0, 0, 0.3)',
  darkGray: '#1C1C1E',
  black: '#000000',
  white: '#FFFFFF',
};

export const SAFE_AREA_PADDING_BOTTOM = 34;



export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading } = useSubscription();

  // 如果订阅状态正在加载，显示加载界面
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>正在验证订阅状态...</Text>
      </View>
    );
  }

  // 如果用户没有付费，重定向到付费墙
  if (!isPremium) {
    return <Redirect href="/paywall" />;
  }
  
  return (
    <Tabs
      key="main-tabs-v4"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 60 + insets.bottom,
          paddingLeft: 20,
          paddingRight: 0,
          paddingBottom: insets.bottom,
          justifyContent: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          flex: 0,
        },
        tabBarItemStyle: {
          flex: 0,
          width: 'auto',
          alignSelf: 'flex-start',
          marginRight: 30,
        },
        tabBarBackground: () => (
          <View style={styles.tabBarContainer}>
            <BlurView intensity={100} tint="dark" style={styles.blurView}>
              <LinearGradient
                colors={[colors.background, colors.backgroundLight]}
                style={styles.tabBarGradient}
              />
              <View style={styles.tabBarBorder} />
            </BlurView>
          </View>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarButton: () => null }} />
      
      <Tabs.Screen
        name="workout"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemActive]}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Icon 
                  name="dumbbell" 
                  color={focused ? colors.white : colors.textSecondary} 
                  size={focused ? 24 : 22}
                  style={{ textAlign: 'center', alignSelf: 'center' }}
                />
              </View>
            </View>
          ),
        }}
        listeners={{}}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemActive]}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Icon 
                  name="food-apple-outline" 
                  color={focused ? colors.white : colors.textSecondary} 
                  size={focused ? 24 : 22}
                  style={{ textAlign: 'center', alignSelf: 'center' }}
                />
              </View>
            </View>
          ),
        }}
        listeners={{}}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.centerTabContainer}>
              <View style={styles.centerTabShadow} />
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.centerTab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="home" color={colors.white} size={28} style={{ textAlign: 'center', alignSelf: 'center' }} />
                <View style={styles.centerTabRing} />
              </LinearGradient>
              {focused && <View style={styles.centerTabGlow} />}
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // Prevent default tab navigation
            e.preventDefault();
            // Custom navigation to dashboard
            router.push('/(main)/dashboard');
          },
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemActive]}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Icon 
                  name="chart-line" 
                  color={focused ? colors.white : colors.textSecondary} 
                  size={focused ? 24 : 22}
                  style={{ textAlign: 'center', alignSelf: 'center' }}
                />
              </View>
            </View>
          ),
        }}
        listeners={{}}
      />

      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabItem, focused && styles.tabItemActive]}>
              <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
                <Icon 
                  name="cog-outline" 
                  color={focused ? colors.white : colors.textSecondary} 
                  size={focused ? 24 : 22}
                  style={{ textAlign: 'center', alignSelf: 'center' }}
                />
              </View>
            </View>
          ),
        }}
        listeners={{}}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Tab bar container and background
  tabBarContainer: {
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
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
    borderColor: colors.border,
  },

  // Regular tab items
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: 5,
    marginHorizontal: 4,
  },
  tabItemActive: {
    transform: [{ scale: 1.05 }],
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'transparent',
    position: 'relative',
    transform: [{ rotate: '0deg' }], // Explicitly set no rotation to prevent tilting
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  activeIndicator: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0.6,
  },
  focusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },

  // Center tab (dashboard)
  centerTabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
    height: 54,
    position: 'relative',
    marginTop: 5,
    marginHorizontal: 4,
    transform: [{ rotate: '0deg' }], // Explicitly set no rotation to prevent tilting
  },
  centerTabShadow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.shadow,
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
    transform: [{ rotate: '0deg' }], // Explicitly set no rotation to prevent tilting
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
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

