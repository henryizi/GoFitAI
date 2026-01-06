import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase/client';

export interface TutorialStep {
  id: string;
  screen: string;
  elementId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'navigate' | 'highlight' | 'wait';
  nextScreen?: string;
  mockScreen?: 'dashboard' | 'nutrition' | 'log_food' | 'progress' | 'workout' | 'workout_plan_create' | 'quick_workout' | 'progression_insights';
}

export interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  steps: TutorialStep[];
  isPaused: boolean;
}

interface TutorialContextType {
  state: TutorialState;
  startTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTutorial: () => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  completeTutorial: () => Promise<void>;
  registerElement: (id: string, ref: any) => void;
  unregisterElement: (id: string) => void;
  getElementRef: (id: string) => any;
  updateElementLayout: (id: string, layout: { x: number; y: number; width: number; height: number }) => void;
  getElementLayout: (id: string) => { x: number; y: number; width: number; height: number } | undefined;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

// Define all tutorial steps
const TUTORIAL_STEPS: TutorialStep[] = [
  // ============================================
  // DASHBOARD SECTION
  // ============================================
  {
    id: 'dashboard_ai_coach',
    screen: '/walkthrough',
    mockScreen: 'dashboard',
    elementId: 'ai-coach-header',
    title: 'Your AI Coach',
    description: 'Meet your AI Coach! It greets you every day and provides personalized guidance based on your progress and goals. Look for it at the top of every screen.',
    position: 'bottom',
  },
  {
    id: 'dashboard_stats',
    screen: '/walkthrough',
    mockScreen: 'dashboard',
    elementId: 'total-stats-card',
    title: 'Track Your Progress',
    description: 'View your total workouts, meals logged, and weight entries. Tap any stat to see detailed insights and celebrate your achievements!',
    position: 'top',
  },
  {
    id: 'dashboard_reminders',
    screen: '/walkthrough',
    mockScreen: 'dashboard',
    elementId: 'workout-reminder-card',
    title: 'Workout Reminders',
    description: 'Never miss a session. Your scheduled workouts appear here with timely reminders to keep you on track.',
    position: 'bottom',
  },
  {
    id: 'navigate_nutrition',
    screen: '/walkthrough',
    mockScreen: 'dashboard',
    elementId: 'nutrition-tab-button',
    title: 'Nutrition Section',
    description: 'Tap the Nutrition tab to access features where you can create meal plans, log food, and track your macros.',
    position: 'top',
  },

  // ============================================
  // NUTRITION SECTION
  // ============================================
  {
    id: 'nutrition_plan_approaches',
    screen: '/walkthrough',
    mockScreen: 'nutrition',
    elementId: 'create-plan-button',
    title: 'Create Your Nutrition Plan',
    description: 'Tap the "+" button to create a personalized nutrition plan. Choose from AI-powered plans, mathematical calculations, or manual customization - all designed to match your goals.',
    position: 'bottom',
  },
  {
    id: 'nutrition_log_food',
    screen: '/walkthrough',
    mockScreen: 'nutrition',
    elementId: 'log-food-button',
    title: 'Log Your Meals',
    description: 'Track your daily nutrition by logging meals. Use manual entry or AI-powered photo analysis to stay on top of your macros and calories.',
    position: 'bottom',
  },
  {
    id: 'nutrition_ai_log',
    screen: '/walkthrough',
    mockScreen: 'log_food',
    elementId: 'ai-camera-button',
    title: 'AI Food Recognition',
    description: 'Take a photo of your meal and let AI do the work! Our advanced system identifies food items and automatically calculates calories and macros for you.',
    position: 'top',
  },
  {
    id: 'nutrition_history',
    screen: '/walkthrough',
    mockScreen: 'nutrition',
    elementId: 'food-history-button',
    title: 'Food History',
    description: 'Review your past meals and nutritional intake. Identify patterns and stay consistent with your diet.',
    position: 'top',
  },
  {
    id: 'nutrition_smart_suggestions',
    screen: '/walkthrough',
    mockScreen: 'nutrition',
    elementId: 'food-suggestion-button',
    title: 'Smart Suggestions',
    description: 'Get personalized food recommendations based on your remaining macros for the day.',
    position: 'top',
  },

  // ============================================
  // WORKOUT SECTION
  // ============================================
  {
    id: 'navigate_workout_tab',
    screen: '/walkthrough',
    mockScreen: 'dashboard',
    elementId: 'workout-tab-button',
    title: 'Workout Tab',
    description: 'Tap the Workout tab to access all your training plans, history, and analytics.',
    position: 'top',
  },
  {
    id: 'create_workout_plan',
    screen: '/walkthrough',
    mockScreen: 'workout',
    elementId: 'create-workout-plan-button',
    title: 'Create Your Workout Plan',
    description: 'Tap the orange "+" button to create a personalized workout plan tailored to your fitness goals and experience level.',
    position: 'top',
  },
  {
    id: 'workout_plan_approaches',
    screen: '/walkthrough',
    mockScreen: 'workout_plan_create',
    elementId: 'workout-plan-types-list',
    title: 'Choose Your Approach',
    description: 'Select how you want to build your plan: AI-powered generation, famous bodybuilder styles, or create your own custom plan from scratch.',
    position: 'top',
  },
  {
    id: 'highlight_quick_workout',
    screen: '/walkthrough',
    mockScreen: 'workout',
    elementId: 'quick-workout-button',
    title: 'Quick Workout',
    description: 'Short on time? Tap the purple button to start a quick, flexible workout session immediately.',
    position: 'bottom',
  },
  {
    id: 'show_quick_workout',
    screen: '/walkthrough',
    mockScreen: 'quick_workout',
    elementId: 'finish-workout-button',
    title: 'Workout Session',
    description: 'Track your sets, reps, and weight in real-time. Use the rest timer and finish when you are done.',
    position: 'bottom',
  },
  {
    id: 'workout_overview',
    screen: '/walkthrough',
    mockScreen: 'workout',
    elementId: 'workout-overview-button',
    title: 'Progression Analytics',
    description: 'View detailed insights about your workout performance, strength gains, and training consistency. Track your progress and identify areas for improvement.',
    position: 'top',
  },
  {
    id: 'show_progression_overview',
    screen: '/walkthrough',
    mockScreen: 'progression_insights',
    elementId: 'progression-insight-card',
    title: 'Performance Analysis',
    description: 'Get deep insights into your progress. Identify plateaus, track strength gains, and get AI recommendations.',
    position: 'top',
  },
  {
    id: 'workout_history',
    screen: '/walkthrough',
    mockScreen: 'workout',
    elementId: 'workout-history-button',
    title: 'Workout History',
    description: 'Track your past sessions, monitor your improvements, and stay consistent with your training.',
    position: 'bottom',
  },

  // ============================================
  // PROGRESS SECTION
  // ============================================
  {
    id: 'progress_log_weight',
    screen: '/walkthrough',
    mockScreen: 'progress',
    elementId: 'log-weight-button',
    title: 'Track Your Weight',
    description: 'Log your weight regularly to track your progress over time. Tap here to add a new weight entry and see your transformation journey.',
    position: 'bottom',
  },
  {
    id: 'progress_weight_trend',
    screen: '/walkthrough',
    mockScreen: 'progress',
    elementId: 'weight-trend-chart',
    title: 'Weight Trends',
    description: 'Visualize your weight changes over time with interactive charts. See your progress patterns and understand your transformation journey.',
    position: 'top',
  },
  {
    id: 'progress_log_photo',
    screen: '/walkthrough',
    mockScreen: 'progress',
    elementId: 'log-body-photos-manual',
    title: 'Log Body Photos',
    description: 'Capture your transformation visually. Upload photos regularly to see the changes that the scale might miss.',
    position: 'top',
  },
  {
    id: 'progress_photo_comparison',
    screen: '/walkthrough',
    mockScreen: 'progress',
    elementId: 'before-after-comparison',
    title: 'Photo Comparison',
    description: 'Compare your "Before" and "After" photos side-by-side to see how far you have come.',
    position: 'top',
  },
];

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const pathname = usePathname();
  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentStepIndex: -1,
    currentStep: null,
    steps: TUTORIAL_STEPS,
    isPaused: false,
  });
  const [elementRefs, setElementRefs] = useState<Map<string, any>>(new Map());
  const [elementLayouts, setElementLayouts] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());

  // Normalize path helper
  const normalizePath = useCallback((path: string) => {
    if (!path) return '';
    return path
      .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
      .replace(/^\(main\)\/?/, '') // Remove (main)/ prefix
      .toLowerCase();
  }, []);

  // Auto-advance logic based on navigation
  useEffect(() => {
    if (state.isActive && !state.isPaused && state.currentStep) {
      const currentStep = state.currentStep;
      
      // Check if we are already on the target screen for a "navigate" action
      if (currentStep.action === 'navigate' && currentStep.nextScreen) {
        const normalizedPathname = normalizePath(pathname);
        const normalizedNextScreen = normalizePath(currentStep.nextScreen);
        
        // Check if current path matches the NEXT screen
        const isNextMatch = normalizedPathname === normalizedNextScreen || 
                           normalizedPathname.startsWith(normalizedNextScreen);
                           
        if (isNextMatch) {
          console.log('[TutorialContext] ⏩ Already on target screen, auto-advancing tutorial step...');
          // Use a timeout to avoid state updates during render
          setTimeout(() => {
            nextStep();
          }, 500); // Small delay to allow screen to settle
        }
      }
    }
  }, [pathname, state.isActive, state.isPaused, state.currentStep, nextStep, normalizePath]);

  const registerElement = useCallback((id: string, ref: any) => {
    setElementRefs((prev) => {
      const next = new Map(prev);
      next.set(id, ref);
      return next;
    });
  }, []);

  const unregisterElement = useCallback((id: string) => {
    setElementRefs((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setElementLayouts((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const getElementRef = useCallback((id: string) => {
    return elementRefs.get(id);
  }, [elementRefs]);

  const updateElementLayout = useCallback((id: string, layout: { x: number; y: number; width: number; height: number }) => {
    setElementLayouts((prev) => {
      const next = new Map(prev);
      next.set(id, layout);
      return next;
    });
  }, []);

  const getElementLayout = useCallback((id: string) => {
    return elementLayouts.get(id);
  }, [elementLayouts]);

  const startTutorial = useCallback(() => {
    // Check if tutorial is already completed before starting
    // Note: Routing logic is handled by app/index.tsx, so if we're here, tutorial should start
    // But we still check to prevent accidental restart
    if (profile?.tutorial_completed === true) {
      console.log('[Tutorial] ⚠️ Tutorial already completed, preventing restart');
      // Don't redirect here - let app/index.tsx handle routing
      return;
    }

    console.log('[Tutorial] Starting tutorial...');
    console.log('[Tutorial] First step:', TUTORIAL_STEPS[0]);
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStepIndex: 0,
      currentStep: TUTORIAL_STEPS[0],
      isPaused: false,
    }));
    console.log('[Tutorial] Tutorial state set, navigating to walkthrough...');
    // Navigate to walkthrough screen
    setTimeout(() => {
      console.log('[Tutorial] Navigating to walkthrough...');
      router.push('/walkthrough');
    }, 300);
  }, [profile?.tutorial_completed]);

  const nextStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStepIndex >= TUTORIAL_STEPS.length - 1) {
        // Tutorial complete - TutorialOverlay will handle calling completeTutorial
        console.log('[Tutorial] Last step reached, tutorial will be completed by overlay');
        return prev;
      }
      
      const currentStep = prev.currentStep;
      const nextIndex = prev.currentStepIndex + 1;
      const nextStep = TUTORIAL_STEPS[nextIndex];
      
      // If current step has navigation action, navigate first
      if (currentStep?.action === 'navigate' && currentStep.nextScreen) {
        router.push(currentStep.nextScreen as any);
        // Wait for navigation, then move to next step
        setTimeout(() => {
          setState((current) => ({
            ...current,
            currentStepIndex: nextIndex,
            currentStep: nextStep,
          }));
        }, 800);
        return prev; // Keep current state while navigating
      }
      
      return {
        ...prev,
        currentStepIndex: nextIndex,
        currentStep: nextStep,
      };
    });
  }, []);

  const previousStep = useCallback(() => {
    setState((prev) => {
      if (prev.currentStepIndex <= 0) {
        return prev;
      }
      const prevIndex = prev.currentStepIndex - 1;
      const prevStep = TUTORIAL_STEPS[prevIndex];
      
      // Navigate if needed - check if previous step was on a different screen
      if (prevStep.screen !== prev.currentStep?.screen) {
        router.push(prevStep.screen as any);
      }
      
      return {
        ...prev,
        currentStepIndex: prevIndex,
        currentStep: prevStep,
      };
    });
  }, []);

  const skipTutorial = useCallback(async () => {
    await completeTutorial();
  }, [completeTutorial]);

  const pauseTutorial = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resumeTutorial = useCallback(() => {
    setState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const completeTutorial = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('[Tutorial] Completing tutorial for user:', user.id);
      
      // First, update the database
      const { error } = await supabase
        .from('profiles')
        .update({ tutorial_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('[Tutorial] Error completing tutorial:', error);
        return;
      }

      console.log('[Tutorial] ✅ Database updated, tutorial_completed set to true');

      // Stop tutorial immediately
      setState({
        isActive: false,
        currentStepIndex: -1,
        currentStep: null,
        steps: TUTORIAL_STEPS,
        isPaused: false,
      });

      // Refresh profile to get latest state
      await refreshProfile();
      
      // Wait a bit to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[Tutorial] ✅ Navigating to dashboard');
      // Navigate to dashboard
      router.replace('/(main)/dashboard');
    } catch (error) {
      console.error('[Tutorial] Error completing tutorial:', error);
    }
  }, [user?.id, refreshProfile]);

  return (
    <TutorialContext.Provider
      value={{
        state,
        startTutorial,
        nextStep,
        previousStep,
        skipTutorial,
        pauseTutorial,
        resumeTutorial,
        completeTutorial,
        registerElement,
        unregisterElement,
        getElementRef,
        updateElementLayout,
        getElementLayout,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

