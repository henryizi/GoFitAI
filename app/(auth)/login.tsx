import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Dimensions, ImageBackground, TouchableOpacity, Alert, Animated, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { signInWithApple, signInWithGoogle, getAvailableSocialProviders, useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/styles/colors';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Slides Data - High-Quality Workout Imagery
const SLIDES = [
  {
    id: '1',
    image: { uri: 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?q=80&w=1000&auto=format&fit=crop' }, // Running/Outdoor
    title: 'Welcome',
    message: 'Sign in to start your discipline and fitness journey',
  },
  {
    id: '2',
    image: { uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop' }, // Heavy Weightlifting
    title: 'Train Harder',
    message: 'Push your limits with professional workout programs',
  },
  {
    id: '3',
    image: { uri: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=1000&auto=format&fit=crop' }, // Gym Atmosphere
    title: 'Smart AI',
    message: 'Your personal AI trainer in your pocket 24/7',
  },
  {
    id: '4',
    image: { uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1000&auto=format&fit=crop' }, // Functional Training
    title: 'Stay Hybrid',
    message: 'The perfect balance of strength and endurance',
  },
];

// Floating Icon Component
const FloatingIcon = ({ name, size = 24, style, delay = 0 }: { name: string, size?: number, style?: any, delay?: number }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Randomized movement values for more organic "dynamic" feel
    const moveRangeY = 15 + Math.random() * 15;
    const moveRangeX = 10 + Math.random() * 10;
    const duration = 3000 + Math.random() * 2000;

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(translateY, {
            toValue: -moveRangeY,
            duration: duration,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateX, {
            toValue: moveRangeX,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: -moveRangeX,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(rotate, {
            toValue: 1,
            duration: duration * 2,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: -1,
            duration: duration * 2,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: duration * 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.1,
            duration: duration * 1.5,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.9,
            duration: duration * 1.5,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: duration * 1.5,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.floatingIconContainer, 
        style, 
        { 
          transform: [
            { translateY }, 
            { translateX }, 
            { rotate: spin },
            { scale }
          ] 
        }
      ]}
    >
      <BlurView intensity={30} tint="light" style={styles.blurIcon}>
        <MaterialCommunityIcons name={name as any} size={size} color="#FFFFFF" />
      </BlurView>
    </Animated.View>
  );
};

const LoginScreen = () => {
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState({ apple: false, google: false });
  const [activeIndex, setActiveIndex] = useState(0);
  const { session } = useAuth();
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkAvailableProviders();
    startAutoScroll();
    return () => stopAutoScroll();
  }, []);

  const startAutoScroll = () => {
    stopAutoScroll();
    timerRef.current = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000); // Change slide every 4 seconds
  };

  const stopAutoScroll = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const checkAvailableProviders = async () => {
    try {
      const providers = await getAvailableSocialProviders();
      setAvailableProviders(providers);
    } catch (error) {
      console.warn('Failed to check available providers:', error);
    }
  };

  const handleAppleSignIn = async () => {
    if (isAppleLoading || isGoogleLoading) return;
    setIsAppleLoading(true);
    try {
      const result = await signInWithApple();
      if (result.success) {
        router.replace('/');
      } else if (result.error !== 'Canceled') {
        Alert.alert('Error', result.error || 'Apple Sign-In failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Apple Sign-In failed');
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isAppleLoading || isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        router.replace('/');
      } else if (result.error !== 'Canceled') {
        Alert.alert('Error', result.error || 'Google Sign-In failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google Sign-In failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setActiveIndex(newIndex);
    }
  }).current;

  const onScrollBeginDrag = () => {
    stopAutoScroll();
  };

  const onScrollEndDrag = () => {
    startAutoScroll();
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={styles.slideContainer}>
      <ImageBackground 
        source={item.image} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
          style={styles.gradientOverlay}
        />
        <View style={styles.slideContent}>
          <Text style={styles.welcomeText}>{item.title}</Text>
        </View>
      </ImageBackground>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Background Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        keyExtractor={(item) => item.id}
        style={StyleSheet.absoluteFill}
      />

      {/* Persistent UI Elements over the carousel */}
      <View style={styles.overlayContainer} pointerEvents="box-none">
        
        {/* Floating Icons - Positioned primarily in the top 60% of the screen to avoid buttons */}
        <FloatingIcon name="tennis" size={24} style={{ top: height * 0.10, left: width * 0.08 }} delay={0} />
        <FloatingIcon name="run" size={20} style={{ top: height * 0.18, left: width * 0.22 }} delay={500} />
        <FloatingIcon name="dumbbell" size={28} style={{ top: height * 0.14, right: width * 0.25 }} delay={1000} />
        <FloatingIcon name="bike" size={22} style={{ top: height * 0.12, right: width * 0.10 }} delay={1500} />
        <FloatingIcon name="swim" size={18} style={{ top: height * 0.25, right: width * 0.15 }} delay={2000} />
        <FloatingIcon name="ski" size={22} style={{ top: height * 0.28, left: width * 0.12 }} delay={2500} />
        <FloatingIcon name="yoga" size={24} style={{ top: height * 0.35, right: width * 0.08 }} delay={3000} />
        <FloatingIcon name="basketball" size={20} style={{ top: height * 0.38, left: width * 0.28 }} delay={3500} />
        <FloatingIcon name="walk" size={22} style={{ top: height * 0.48, left: width * 0.10 }} delay={4500} />

        <View style={styles.bottomOverlay}>
          {/* Slide Description - Moved here to prevent overlap */}
          <Animated.Text style={styles.mainMessage}>
            {SLIDES[activeIndex].message}
          </Animated.Text>

          {/* Pagination Indicator */}
          <View style={styles.paginationContainer}>
            {SLIDES.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.paginationBar, 
                  activeIndex === index && styles.paginationBarActive
                ]} 
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Google Button */}
            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading || isAppleLoading}
            >
              <View style={styles.buttonContent}>
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color="#4285F4" />
                ) : (
                  <Ionicons name="logo-google" size={24} color="#4285F4" />
                )}
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            {/* Apple Button */}
            <TouchableOpacity 
              style={styles.appleButton} 
              onPress={handleAppleSignIn}
              disabled={isGoogleLoading || isAppleLoading}
            >
              <View style={styles.buttonContent}>
                {isAppleLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                )}
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Legal Footer */}
          <Text style={styles.legalText}>
            By completing your registration, you confirm that you have read and accept GoFitAI's{' '}
            <Text style={styles.legalLink}>membership terms</Text> For more information on how your personal data is used, please see GoFitAI's{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  slideContainer: {
    width: width,
    height: height,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: height * 0.08,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  bottomOverlay: {
    width: '100%',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    alignItems: 'center',
  },
  floatingIconContainer: {
    position: 'absolute',
    borderRadius: 50,
    overflow: 'hidden',
    zIndex: 10,
  },
  blurIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  welcomeText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  mainMessage: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  paginationContainer: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 8,
  },
  paginationBar: {
    height: 4,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  paginationBarActive: {
    backgroundColor: '#FFFFFF',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 30,
  },
  googleButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  appleButton: {
    width: '100%',
    height: 60,
    backgroundColor: '#000000',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legalText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    textDecorationLine: 'underline',
    color: '#FFFFFF',
  },
});

export default LoginScreen;
