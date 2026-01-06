import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, SafeAreaView, Image, ScrollView, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/styles/colors';
import { MockWorkoutPlanCreate } from '../../src/components/tutorial/mock-screens/MockWorkoutPlanCreate';
import { MockQuickWorkout } from '../../src/components/tutorial/mock-screens/MockQuickWorkout';
import { MockLogFood } from '../../src/components/tutorial/mock-screens/MockLogFood';
import { MockFoodCamera } from '../../src/components/tutorial/mock-screens/MockFoodCamera';
import { MockFoodResult } from '../../src/components/tutorial/mock-screens/MockFoodResult';
import { MockNutrition } from '../../src/components/tutorial/mock-screens/MockNutrition';
import { MockProgressionInsights } from '../../src/components/tutorial/mock-screens/MockProgressionInsights';
import { MockDashboard } from '../../src/components/tutorial/mock-screens/MockDashboard';
import { MockLogProgress } from '../../src/components/tutorial/mock-screens/MockLogProgress';
import { MockLogPhoto } from '../../src/components/tutorial/mock-screens/MockLogPhoto';
import { MockFoodLibrary } from '../../src/components/tutorial/mock-screens/MockFoodLibrary';

// Safely import StoreReview
let StoreReview: any = null;
try {
  StoreReview = require('expo-store-review');
} catch (e) {
  console.log('StoreReview module not found');
}

const { width, height } = Dimensions.get('window');

// --- DATA STRUCTURES ---

const RISKS = [
  {
    preTitle: "Not exercising can lead to...",
    title: "Chronic Fatigue",
    description: "Your untapped energy potential fades with each inactive day.",
    icon: "battery-alert-variant-outline",
    iconColor: colors.primary,
    imageSource: require('../../assets/images/onboarding/chronic-fatigue.png'),
  },
  {
    title: "Mental Decline",
    description: "Depression and anxiety thrive in physical stagnation.",
    icon: "brain",
    iconColor: colors.primary,
    imageSource: require('../../assets/images/onboarding/mental-decline.png'),
  },
  {
    title: "Heart Health Risk",
    description: "Cardiovascular disease silently develops in sedentary lifestyles.",
    icon: "heart-pulse",
    iconColor: colors.primary,
    imageSource: require('../../assets/images/onboarding/heart-health-risk.png'),
  },
  {
    title: "Lost Potential",
    description: "Your ideal physique and confidence await behind inaction.",
    icon: "account-off-outline",
    iconColor: colors.primary,
    imageSource: require('../../assets/images/onboarding/lost-potential.png'),
  },
];

const SHOWCASE_PART1 = [
  {
    type: 'welcome',
    title: "Welcome to GoFitAI",
    description: "Your journey to a stronger, healthier life starts here. Let's transform together.",
    icon: "sparkles",
    iconColor: colors.primary,
    imageSource: require('../../assets/icon-converted.png'),
  },
  {
    type: 'map',
    title: "GoFitAI Works.\nPeriod.",
    description: "Join over 100k fitness enthusiasts embracing hybrid training by combining gym and cardio for a healthier, stronger self",
    icon: "earth",
    iconColor: colors.primary,
  },
  {
    type: 'roadmap',
    title: "Your Roadmap",
    description: "Follow our personalized fitness roadmap designed just for you",
    icon: "chart-line",
    iconColor: colors.primary,
  },
  {
    type: 'motivation',
    title: "Stay Motivated",
    description: "Daily inspiration and tracking to keep you focused on your goals",
    icon: "clipboard-check",
    iconColor: colors.primary,
  },
  {
    type: 'routine',
    title: "Build Your Routine",
    description: "Create lasting habits that fit perfectly into your lifestyle",
    icon: "calendar-clock",
    iconColor: colors.primary,
  },
  {
    type: 'health',
    title: "Embrace Health",
    description: "Transform your body and mind through balanced, effective training",
    icon: "heart-pulse",
    iconColor: colors.primary,
  },
  {
    type: 'results',
    title: "Real Results",
    description: "See how GoFitAI transforms lives through fitness",
    results: [
      {
        name: "Sarah M.",
        age: "19 years old",
        text: "GoFitAI's structured workout programs helped me push beyond my limits. The mix of strength and cardio training was exactly what I needed!",
        achievement: "Lost 12kg in 3 months",
        icon: "account-circle",
      },
      {
        name: "Michael K.",
        age: "22 years old",
        text: "At my age, I never thought I'd be in the best shape of my life. GoFitAI's training programs helped me build muscle while staying injury-free.",
        achievement: "Gained 8kg lean muscle",
        icon: "account-circle",
      },
      {
        name: "Emma L.",
        age: "25 years old",
        text: "The personalized nutrition tracking and workout plans have completely transformed my fitness journey. I've never felt stronger or more confident!",
        achievement: "Lost 8kg, gained muscle definition",
        icon: "account-circle",
      }
    ]
  },
];

const SHOWCASE_PART2A = [
  {
    type: 'feature',
    title: "AI Coach",
    description: "Get personalized guidance and daily insights from your AI coach. Receive motivation, tips, and recommendations tailored to your progress and goals.",
    icon: "account-circle",
    iconColor: colors.primary,
    mockScreen: 'dashboard',
    showMascot: true,
  },
  {
    type: 'feature',
    title: "AI-Powered Workout Plans",
    description: "Get unlimited personalized workout routines generated by advanced AI. Custom plans tailored to your fitness level, goals, and available equipment.",
    icon: "robot",
    iconColor: colors.primary,
    mockScreen: 'workout-plan-create',
  },
  {
    type: 'feature',
    title: "AI Food Photo Analysis",
    description: "Simply snap a photo of your meal and our AI instantly analyzes it, providing detailed nutritional information including calories, macros, and micronutrients.",
    icon: "camera",
    iconColor: colors.primary,
    mockScreen: 'food-camera',
  },
  {
    type: 'feature',
    title: "Intelligent Meal Plans",
    description: "Receive daily meal plans designed specifically for your dietary preferences, fitness goals, and nutritional needs. Balanced, delicious meal suggestions powered by AI.",
    icon: "food-apple",
    iconColor: colors.primary,
    mockScreen: 'nutrition',
  },
  {
    type: 'feature',
    title: "Progress Analytics",
    description: "Track your fitness journey with comprehensive analytics. Monitor strength gains, body composition changes, workout volume, and performance trends.",
    icon: "chart-line-variant",
    iconColor: colors.primary,
    mockScreen: 'progression-insights',
  },
  {
    type: 'feature',
    title: "Workout Logging",
    description: "Log your workouts effortlessly with intuitive set tracking. Track reps, weight, and rest time for every exercise to monitor your progress.",
    icon: "dumbbell",
    iconColor: colors.primary,
    mockScreen: 'quick-workout',
  },
  {
    type: 'feature',
    title: "Weight & Body Photo Logging",
    description: "Track your weight and capture progress photos to visually monitor your transformation over time. Compare before and after photos to see your results.",
    icon: "scale-bathroom",
    iconColor: colors.primary,
    mockScreen: 'log-progress',
  },
  {
    type: 'feature',
    title: "Food Library",
    description: "Browse a comprehensive database of foods with detailed nutritional information. Search and filter by category to quickly find and log your meals.",
    icon: "book-open-variant",
    iconColor: colors.primary,
    mockScreen: 'food-library',
  },
  {
    type: 'commitment',
    title: "Are You Ready?",
    description: "Your transformation starts here. Choose your commitment and let's make it happen.",
    options: [
      {
        title: "I'm Not Sure, But I'll Try",
        description: "Taking the first step is the hardest part",
        icon: "walk",
        color: colors.primary,
      },
      {
        title: "Yes, I Will Reach My Goals",
        description: "This year is my year to transform",
        icon: "trending-up",
        color: colors.primary,
      },
      {
        title: "I Will Destroy My Old Self",
        description: "Today marks the death of who I used to be",
        icon: "fire",
        color: colors.primary,
      },
    ],
    tagline: "Your old self is your only competition",
  },
];

const SHOWCASE_PART2B = [
  {
    type: 'premium-features',
    title: "Premium Benefits",
    description: "Unlock the full power of GoFitAI with these premium features",
    features: [
      {
        icon: "robot",
        title: "AI Workout Plans",
        description: "Get personalized workout plans that adapt to your fitness level and goals",
      },
      {
        icon: "chart-line-variant",
        title: "Progress Analytics",
        description: "Track your gains and improvements with detailed progression insights",
      },
      {
        icon: "camera",
        title: "Food Photo Analysis",
        description: "Snap a photo of your meal and get instant nutrition breakdown",
      },
      {
        icon: "dumbbell",
        title: "Exercise Library",
        description: "Access hundreds of exercises with proper form guidance",
      },
      {
        icon: "camera-image",
        title: "Body Progress Tracking",
        description: "Document your transformation with before and after photos",
      },
    ],
  },
  {
    type: 'value-proposition',
    title: "Proven Results",
    description: "GoFitAI users achieve their goals faster with AI-powered guidance",
    stats: {
      multiplier: "3.5x",
      metric: "more likely to reach goals",
    },
    highlights: [
      {
        icon: "brain",
        title: "AI-Powered Plans",
        description: "that adapt and accelerate your progress",
      },
      {
        icon: "food-apple",
        title: "Smart Nutrition Tracking",
        description: "with detailed macro insights and meal planning",
      },
      {
        icon: "chart-timeline-variant",
        title: "Advanced Analytics",
        description: "for muscle group training ratios and progression",
      },
    ],
    progressData: {
      workouts: { current: 12, goal: 20 },
      meals: { current: 8, goal: 10 },
      photos: { current: 5, goal: 8 },
    },
  },
];

// --- COMPONENTS ---

const LifestyleConvincerScreen = () => {
  const params = useLocalSearchParams();
  
  // Initialize state based on params if returning from paywall
  const isReturningFromPaywall = params.returnToLast === 'true' || params.returnToLast === true;
  const initialSection = isReturningFromPaywall ? 'showcase2b' : 'risks';
  const initialPageIndex = isReturningFromPaywall ? SHOWCASE_PART2B.length - 1 : 0;
  
  const [section, setSection] = useState<'risks' | 'showcase1' | 'showcase2a' | 'showcase2b'>(initialSection);
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [selectedCommitment, setSelectedCommitment] = useState<number | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const currentPages = section === 'risks' ? RISKS : section === 'showcase1' ? SHOWCASE_PART1 : section === 'showcase2a' ? SHOWCASE_PART2A : section === 'showcase2b' ? SHOWCASE_PART2B : [];
  const currentPage = currentPages[pageIndex] || null;

  // Debug: Log params to verify they're being received
  React.useEffect(() => {
    if (isReturningFromPaywall) {
      console.log('Returning from paywall - setting to showcase2b, page:', SHOWCASE_PART2B.length - 1);
    }
  }, [isReturningFromPaywall]);


  const animate = (toValue: number, duration: number, callback?: () => void) => {
    Animated.timing(fadeAnim, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start(callback);
  };

  const handleNext = () => {
    if (section === 'risks') {
      if (pageIndex < RISKS.length - 1) {
        animate(0, 200, () => {
          setPageIndex(pageIndex + 1);
          animate(1, 300);
        });
      } else {
        animate(0, 200, () => {
          setSection('showcase1');
          setPageIndex(0);
          animate(1, 300);
        });
      }
    } else if (section === 'showcase1') {
      if (pageIndex < SHOWCASE_PART1.length - 1) {
        animate(0, 200, () => {
          setPageIndex(pageIndex + 1);
          animate(1, 300);
        });
      } else {
        // Move to Part 2A after Real Results
        animate(0, 200, () => {
          setSection('showcase2a');
          setPageIndex(0);
          animate(1, 300);
        });
      }
    } else if (section === 'showcase2a') {
      if (pageIndex < SHOWCASE_PART2A.length - 1) {
        animate(0, 200, () => {
          setPageIndex(pageIndex + 1);
          setSelectedCommitment(null); // Reset selection when moving pages
          animate(1, 300);
        });
      } else {
        // If on commitment page, require selection
        if (currentPage?.type === 'commitment' && selectedCommitment === null) {
          return; // Don't proceed without selection
        }
        // Move to Part 2B after "Are You Ready?"
        animate(0, 200, () => {
          setSection('showcase2b');
          setPageIndex(0);
          animate(1, 300);
        });
      }
    } else {
      // showcase2b
      if (pageIndex < SHOWCASE_PART2B.length - 1) {
        animate(0, 200, () => {
          setPageIndex(pageIndex + 1);
          animate(1, 300);
        });
      } else {
        // Last page, go to paywall
        router.replace('/(paywall)');
      }
    }
  };

  const handleBack = () => {
    if (section === 'showcase2b') {
      if (pageIndex > 0) {
        animate(0, 200, () => {
          setPageIndex(pageIndex - 1);
          animate(1, 300);
        });
      } else {
        // Go back to last page of Part 2A (Are You Ready?)
        animate(0, 200, () => {
          setSection('showcase2a');
          setPageIndex(SHOWCASE_PART2A.length - 1);
          animate(1, 300);
        });
      }
    } else if (section === 'showcase2a') {
      if (pageIndex > 0) {
        animate(0, 200, () => {
          setPageIndex(pageIndex - 1);
          animate(1, 300);
        });
      } else {
        // Go back to last page of Part 1 (Real Results)
        animate(0, 200, () => {
          setSection('showcase1');
          setPageIndex(SHOWCASE_PART1.length - 1);
          animate(1, 300);
        });
      }
    } else if (section === 'showcase1') {
      if (pageIndex > 0) {
        animate(0, 200, () => {
          setPageIndex(pageIndex - 1);
          animate(1, 300);
        });
      } else {
        animate(0, 200, () => {
          setSection('risks');
          setPageIndex(RISKS.length - 1);
          animate(1, 300);
        });
      }
    } else {
      if (pageIndex > 0) {
        animate(0, 200, () => {
          setPageIndex(pageIndex - 1);
          animate(1, 300);
        });
      } else {
        router.replace('/(onboarding)/analysis-results');
      }
    }
  };

  const renderSection = () => {
    const p = currentPage;
    return (
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.textContainer}>
          {p.preTitle && <Text style={styles.preTitle}>{p.preTitle}</Text>}
          <Text style={styles.title}>{p.title}</Text>
          <Text style={styles.description}>{p.description}</Text>
        </View>

        {section === 'risks' ? (
          <View style={styles.illustrationContainer}>
            {p.imageSource ? (
              <Image 
                source={p.imageSource} 
                style={styles.riskImage}
                resizeMode="contain"
              />
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name={p.icon as any} size={100} color={p.iconColor} />
                </View>
                <View style={[styles.glow, { backgroundColor: p.iconColor, opacity: 0.1 }]} />
              </>
            )}
          </View>
        ) : (
          renderShowcaseContent(p)
        )}
      </ScrollView>
    );
  };

  const renderShowcaseContent = (p: any) => {
    switch (p.type) {
      case 'welcome':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <Image 
                source={p.imageSource} 
                style={styles.appIcon}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.glow, { backgroundColor: p.iconColor, opacity: 0.1 }]} />
          </View>
        );
      case 'results':
        return (
          <View style={styles.resultsContainer}>
            {p.results.map((res: any, i: number) => (
              <View key={i} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.avatarIcon}>
                    <MaterialCommunityIcons name={res.icon as any} size={48} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.resultName}>{res.name}</Text>
                    <Text style={styles.resultAge}>{res.age}</Text>
                  </View>
                </View>
                <Text style={styles.resultText}>"{res.text}"</Text>
                <View style={styles.achievementBadge}>
                  <Text style={styles.achievementText}>{res.achievement}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      case 'map':
        return (
          <View style={styles.mapContainer}>
            <MaterialCommunityIcons name="earth" size={240} color="rgba(255, 107, 53, 0.2)" />
            <View style={[styles.mapDot, { top: '30%', left: '20%' }]} />
            <View style={[styles.mapDot, { top: '45%', left: '65%' }]} />
            <View style={[styles.mapDot, { top: '25%', left: '80%' }]} />
            <View style={[styles.mapDot, { top: '60%', left: '40%' }]} />
          </View>
        );
      case 'roadmap':
        const milestones = [
          { week: 'WK 1', label: 'Launch', icon: 'flag-variant-outline' },
          { week: 'WK 4', label: 'Momentum', icon: 'lightning-bolt-outline' },
          { week: 'WK 8', label: 'Evolution', icon: 'trending-up' },
          { week: 'WK 12', label: 'Transformation', icon: 'trophy-outline' },
        ];
        return (
          <View style={styles.roadmapVisualContainer}>
            <View style={styles.roadmapTimeline}>
              <View style={styles.roadmapMainLine} />
              <View style={[styles.roadmapMainLine, { height: '30%', backgroundColor: colors.primary, zIndex: 1 }]} />
              {milestones.map((milestone, idx) => (
                <View key={idx} style={[styles.milestoneItem, { top: `${idx * 28}%` }]}>
                  <View style={[styles.milestoneDot, idx <= 1 && styles.milestoneDotActive]}>
                    <MaterialCommunityIcons 
                      name={milestone.icon as any} 
                      size={20} 
                      color={idx <= 1 ? '#000000' : colors.primary} 
                    />
                  </View>
                  <View style={styles.milestoneTextContainer}>
                    <Text style={styles.milestoneWeek}>{milestone.week}</Text>
                    <Text style={styles.milestoneLabel}>{milestone.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      case 'motivation':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.motivationClipboard}>
              <View style={styles.clipboardClip} />
              <MaterialCommunityIcons name="check-circle" size={60} color={colors.primary} />
              <View style={[styles.motivationDeco, { top: -20, left: -30 }]} />
              <View style={[styles.motivationDeco, { top: -10, right: -20 }]} />
              <View style={[styles.motivationDeco, { bottom: -15, right: -15 }]} />
            </View>
          </View>
        );
      case 'routine':
        return (
          <View style={styles.routineContainer}>
            <View style={styles.routineIconGroup}>
              <View style={[styles.routineIcon, { left: 0 }]}>
                <MaterialCommunityIcons name="timer" size={40} color={colors.primary} />
              </View>
              <View style={[styles.routineIcon, { top: 40, left: 60 }]}>
                <MaterialCommunityIcons name="dumbbell" size={50} color={colors.primary} />
              </View>
              <View style={[styles.routineIcon, { top: 0, right: 0 }]}>
                <MaterialCommunityIcons name="clipboard-list" size={40} color={colors.primary} />
              </View>
            </View>
          </View>
        );
      case 'health':
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.healthPersonContainer}>
              <MaterialCommunityIcons name="account" size={120} color={colors.primary} />
              <View style={styles.healthFoodIcons}>
                <MaterialCommunityIcons name="food-apple" size={24} color={colors.primary} style={[styles.foodIcon, { top: -40, left: -60 }]} />
                <MaterialCommunityIcons name="food" size={20} color="rgba(255, 107, 53, 0.6)" style={[styles.foodIcon, { top: -30, right: -50 }]} />
                <MaterialCommunityIcons name="food-variant" size={22} color={colors.primary} style={[styles.foodIcon, { bottom: -30, left: -40 }]} />
                <MaterialCommunityIcons name="cookie" size={18} color="rgba(255, 107, 53, 0.5)" style={[styles.foodIcon, { bottom: -20, right: -45 }]} />
              </View>
            </View>
          </View>
        );
      case 'feature':
        const renderMockScreen = () => {
          switch (p.mockScreen) {
            case 'workout-plan-create':
              return <MockWorkoutPlanCreate />;
            case 'quick-workout':
              return <MockQuickWorkout />;
            case 'food-camera':
              return <MockFoodResult />;
            case 'log-food':
              return <MockLogFood />;
            case 'nutrition':
              return <MockNutrition />;
            case 'food-library':
              return <MockFoodLibrary />;
            case 'progression-insights':
              return <MockProgressionInsights />;
            case 'log-progress':
              return <MockLogProgress />;
            case 'log-photo':
              return <MockLogPhoto />;
            case 'dashboard':
              return <MockDashboard />;
            default:
              return null;
          }
        };
        
        // Special handling for AI Coach - show mascot without phone frame
        if (p.showMascot) {
          return (
            <View style={styles.mascotContainer}>
              <View style={styles.mascotCircle}>
                <Image
                  source={require('../../assets/mascot.png')}
                  style={styles.mascotImage}
                />
                <View style={styles.mascotOnlineIndicator} />
              </View>
              <View style={[styles.glow, { backgroundColor: colors.primary, opacity: 0.1 }]} />
            </View>
          );
        }
        
        return (
          <View style={styles.screenshotContainer}>
            <View style={styles.phoneFrame}>
              {p.mockScreen ? (
                <View style={styles.phoneFrameInner}>
                  <View style={styles.mockScreenContainer}>
                    {renderMockScreen()}
                  </View>
                </View>
              ) : p.imageSource ? (
                <Image 
                  source={p.imageSource} 
                  style={styles.screenshotImage}
                  resizeMode="cover"
                  onError={() => console.log('Image failed to load')}
                />
              ) : (
                <LinearGradient colors={['#1a1a1a', '#000000']} style={styles.phoneInner}>
                  <MaterialCommunityIcons name={p.icon as any} size={80} color="rgba(255, 107, 53, 0.3)" />
                  <Text style={styles.placeholderText}>App Screenshot</Text>
                  <Text style={styles.placeholderHint}>Add screenshot to assets/images/onboarding/</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        );
      case 'commitment':
        return (
          <View style={styles.commitmentContainer}>
            {p.options.map((option: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.commitmentCard,
                  selectedCommitment === index && styles.commitmentCardSelected,
                  { borderColor: selectedCommitment === index ? colors.primary : 'rgba(255, 107, 53, 0.2)' }
                ]}
                onPress={() => setSelectedCommitment(index)}
                activeOpacity={0.8}
              >
                <View style={[styles.commitmentIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                  <MaterialCommunityIcons name={option.icon as any} size={32} color={colors.primary} />
                </View>
                <View style={styles.commitmentTextContainer}>
                  <Text style={styles.commitmentTitle}>{option.title}</Text>
                  <Text style={styles.commitmentDesc}>{option.description}</Text>
                </View>
                <View style={[styles.commitmentCheckbox, selectedCommitment === index && styles.commitmentCheckboxSelected]}>
                  {selectedCommitment === index && (
                    <MaterialCommunityIcons name="check" size={20} color="#000000" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {p.tagline && (
              <Text style={styles.commitmentTagline}>{p.tagline}</Text>
            )}
          </View>
        );
      case 'premium-features':
        return (
          <View style={styles.premiumFeaturesContainer}>
            {p.features.map((feature: any, index: number) => (
              <View key={index} style={styles.premiumFeatureCard}>
                <View style={styles.premiumFeatureIconContainer}>
                  <MaterialCommunityIcons name={feature.icon as any} size={28} color={colors.primary} />
                </View>
                <View style={styles.premiumFeatureTextContainer}>
                  <Text style={styles.premiumFeatureTitle}>{feature.title}</Text>
                  <Text style={styles.premiumFeatureDesc}>{feature.description}</Text>
                </View>
              </View>
            ))}
          </View>
        );
      case 'value-proposition':
        return (
          <View style={styles.valuePropContainer}>
            <View style={styles.valuePropStats}>
              <Text style={styles.valuePropMultiplier}>{p.stats.multiplier}</Text>
              <Text style={styles.valuePropMetric}>{p.stats.metric}</Text>
            </View>
            
            <View style={styles.valuePropHighlights}>
              {p.highlights.map((highlight: any, index: number) => (
                <View key={index} style={styles.valuePropHighlightCard}>
                  <View style={styles.valuePropHighlightIcon}>
                    <MaterialCommunityIcons name={highlight.icon as any} size={24} color={colors.primary} />
                  </View>
                  <View style={styles.valuePropHighlightText}>
                    <Text style={styles.valuePropHighlightTitle}>{highlight.title}</Text>
                    <Text style={styles.valuePropHighlightDesc}>{highlight.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressRingContainer}>
                <View style={styles.progressRingOuter}>
                  <View style={[styles.progressRingMiddle, { width: '70%', height: '70%' }]}>
                    <View style={[styles.progressRingInner, { width: '60%', height: '60%' }]} />
                  </View>
                </View>
              </View>
              <View style={styles.progressMetrics}>
                <View style={styles.progressMetricItem}>
                  <View style={[styles.progressDot, { backgroundColor: colors.primary }]} />
                  <View>
                    <Text style={styles.progressMetricLabel}>Workouts</Text>
                    <Text style={styles.progressMetricValue}>{p.progressData.workouts.current} / {p.progressData.workouts.goal}</Text>
                  </View>
                </View>
                <View style={styles.progressMetricItem}>
                  <View style={[styles.progressDot, { backgroundColor: '#4FC3F7' }]} />
                  <View>
                    <Text style={styles.progressMetricLabel}>Meals</Text>
                    <Text style={styles.progressMetricValue}>{p.progressData.meals.current} / {p.progressData.meals.goal}</Text>
                  </View>
                </View>
                <View style={styles.progressMetricItem}>
                  <View style={[styles.progressDot, { backgroundColor: '#FF9800' }]} />
                  <View>
                    <Text style={styles.progressMetricLabel}>Photos</Text>
                    <Text style={styles.progressMetricValue}>{p.progressData.photos.current} / {p.progressData.photos.goal}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.illustrationContainer}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name={p.icon as any} size={100} color={p.iconColor} />
            </View>
            <View style={[styles.glow, { backgroundColor: p.iconColor, opacity: 0.1 }]} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {currentPage && renderSection()}

          {section !== 'risks' && (
            <View style={styles.pagination}>
              {(section === 'showcase1' ? SHOWCASE_PART1 : 
                section === 'showcase2a' ? SHOWCASE_PART2A : 
                section === 'showcase2b' ? SHOWCASE_PART2B : 
                currentPages).map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    pageIndex === index && styles.activeDot,
                    pageIndex === index && { backgroundColor: currentPage?.iconColor || colors.primary }
                  ]} 
                />
              ))}
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.nextButton,
              currentPage?.type === 'commitment' && selectedCommitment === null && styles.nextButtonDisabled
            ]} 
            onPress={handleNext}
            disabled={currentPage?.type === 'commitment' && selectedCommitment === null}
            activeOpacity={currentPage?.type === 'commitment' && selectedCommitment === null ? 1 : 0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>
                {section === 'showcase2b' && pageIndex === SHOWCASE_PART2B.length - 1 ? 
                   "Get Started" :
                   (section === 'showcase2a' && pageIndex === SHOWCASE_PART2A.length - 1 ? 
                     (currentPage?.type === 'commitment' ? (selectedCommitment !== null ? "Continue" : "Select Your Commitment") : "See Benefits") :
                   (currentPage?.type === 'commitment' ? (selectedCommitment !== null ? "Continue" : "Select Your Commitment") : 
                   (section === 'showcase1' && pageIndex === SHOWCASE_PART1.length - 1 ? "See Features" : "Next")))}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  transitionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  preTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -1,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: '90%',
  },
  illustrationContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  riskImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  appIcon: {
    width: 160,
    height: 160,
    borderRadius: 40,
  },
  glow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    zIndex: 1,
  },
  mascotContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
    position: 'relative',
  },
  mascotCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  mascotImage: {
    width: 200,
    height: 200,
    resizeMode: 'cover',
  },
  mascotOnlineIndicator: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#000000',
    zIndex: 3,
  },
  resultsContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  resultCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  resultName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultAge: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  resultText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  achievementBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.4)',
  },
  achievementText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  mapContainer: {
    height: 300,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  mapDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  screenshotContainer: {
    width: '100%',
    height: 420,
    alignItems: 'center',
    marginBottom: 40,
    paddingLeft: 20,
  },
  phoneFrame: {
    width: 240,
    height: 420,
    borderRadius: 40,
    borderWidth: 10,
    borderColor: 'rgba(255, 107, 53, 0.25)',
    backgroundColor: '#000000',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    position: 'relative',
    marginLeft: -20,
  },
  phoneInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  phoneFrameInner: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
  },
  mockScreenContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    position: 'absolute',
    top: 0,
    left: 0,
    transform: [
      { translateX: -(Dimensions.get('window').width - 240) / 2 },
      { translateY: -(Dimensions.get('window').height - 420) / 2 },
      { scale: 240 / Dimensions.get('window').width }
    ],
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.2)',
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  placeholderHint: {
    color: 'rgba(255, 107, 53, 0.4)',
    marginTop: 8,
    fontSize: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  featuresGridContainer: {
    width: '100%',
    gap: 20,
    marginBottom: 40,
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  featurePhoneFrame: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    borderWidth: 6,
    borderColor: 'rgba(255, 107, 53, 0.25)',
    backgroundColor: '#000000',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  featureMockScreenContainer: {
    width: Dimensions.get('window').width * 1.2,
    height: Dimensions.get('window').height * 1.2,
    position: 'absolute',
    top: -Dimensions.get('window').height * 0.1,
    left: -Dimensions.get('window').width * 0.1,
    transform: [{ scale: 0.25 }],
  },
  featureInfo: {
    paddingHorizontal: 4,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  featureCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeDot: {
    width: 20,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  nextButton: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commitmentContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 30,
  },
  commitmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    gap: 16,
  },
  commitmentCardSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: colors.primary,
  },
  commitmentIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitmentTextContainer: {
    flex: 1,
  },
  commitmentTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commitmentDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  commitmentCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitmentCheckboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  commitmentTagline: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  roadmapVisualContainer: {
    height: 350,
    width: '100%',
    paddingLeft: 40,
    marginBottom: 40,
  },
  roadmapTimeline: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  roadmapMainLine: {
    position: 'absolute',
    left: 15,
    top: 15,
    width: 2,
    height: '85%',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
  },
  milestoneItem: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  milestoneDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  milestoneDotActive: {
    backgroundColor: colors.primary,
  },
  milestoneTextContainer: {
    marginLeft: 16,
  },
  milestoneWeek: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  milestoneLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  motivationClipboard: {
    width: 140,
    height: 180,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  clipboardClip: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  motivationDeco: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
  },
  routineContainer: {
    height: 300,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  routineIconGroup: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  routineIcon: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthPersonContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  healthFoodIcons: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  foodIcon: {
    position: 'absolute',
  },
  premiumFeaturesContainer: {
    width: '100%',
    gap: 16,
    marginBottom: 40,
  },
  premiumFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    gap: 16,
  },
  premiumFeatureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  premiumFeatureTextContainer: {
    flex: 1,
  },
  premiumFeatureTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premiumFeatureDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  valuePropContainer: {
    width: '100%',
    marginBottom: 40,
    gap: 24,
  },
  valuePropStats: {
    alignItems: 'center',
    marginBottom: 8,
  },
  valuePropMultiplier: {
    color: colors.primary,
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 72,
  },
  valuePropMetric: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  valuePropHighlights: {
    gap: 16,
    marginBottom: 20,
  },
  valuePropHighlightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  valuePropHighlightIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  valuePropHighlightText: {
    flex: 1,
  },
  valuePropHighlightTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  valuePropHighlightDesc: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  progressCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    gap: 24,
    alignItems: 'center',
  },
  progressRingContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingMiddle: {
    borderRadius: 35,
    borderWidth: 6,
    borderColor: '#4FC3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingInner: {
    borderRadius: 30,
    borderWidth: 4,
    borderColor: '#FF9800',
  },
  progressMetrics: {
    flex: 1,
    gap: 16,
  },
  progressMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressMetricLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  progressMetricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingContainer: {
    width: '100%',
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  ratingStarContainer: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  ratingStarCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  ratingModal: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    alignItems: 'center',
  },
  ratingModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingAppIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#000000',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ratingAppIconImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  ratingModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ratingStarButton: {
    padding: 4,
  },
  ratingNotNowButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  ratingNotNowText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LifestyleConvincerScreen;





