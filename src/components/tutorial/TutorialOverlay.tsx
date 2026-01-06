import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { usePathname } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect, Path } from 'react-native-svg';
import { useTutorial } from '../../contexts/TutorialContext';
import { colors } from '../../styles/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function TutorialOverlay() {
  const { state, nextStep, previousStep, skipTutorial, completeTutorial, getElementRef, getElementLayout } = useTutorial();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  
  const [highlightRegion, setHighlightRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [originalRegion, setOriginalRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation loop for highlight
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (state.isActive && !state.isPaused && state.currentStep) {
      // Reset highlight region when step changes
      setHighlightRegion(null);
      setOriginalRegion(null);
      setTooltipPosition(null);
      
      // Wait a bit for the screen to render before measuring
      const measureElement = () => {
        const elementId = state.currentStep!.elementId;
        
        // MANUAL OVERRIDE for 'Log Body Photos' step to ensure it targets the button
        if (state.currentStep?.id === 'progress_log_photo') {
            const buttonWidth = 240;
            const buttonHeight = 60;
            const buttonY = SCREEN_HEIGHT * 0.71; // Adjusted to 71% - moving up slightly from 74%
            
            const forcedHighlight = {
                x: (SCREEN_WIDTH - buttonWidth) / 2,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            };
            
            console.log('[TutorialOverlay] 🛡️ MANUALLY overriding highlight for progress_log_photo:', forcedHighlight);
            
            setOriginalRegion(forcedHighlight);
            setHighlightRegion(forcedHighlight);
            
            // Force tooltip position to top
            setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 150 });
            return;
        }

        // First, try to use stored layout from onLayout (most reliable)
        const storedLayout = getElementLayout(elementId);
        if (storedLayout) {
          console.log('[TutorialOverlay] ✅ Using stored layout:', storedLayout);
          const { x, y, width, height } = storedLayout;
          
          // Validate dimensions and clamp to visible area if off-screen
          const hasValidDimensions = width > 0 && height > 0;
          
          if (hasValidDimensions) {
            const clampedX = Math.max(0, Math.min(x, SCREEN_WIDTH - width));
            const clampedY = Math.max(0, Math.min(y, SCREEN_HEIGHT - height));
            const finalY = y > SCREEN_HEIGHT ? SCREEN_HEIGHT - Math.min(height, SCREEN_HEIGHT - 100) : clampedY;
            const finalX = x > SCREEN_WIDTH ? SCREEN_WIDTH - Math.min(width, SCREEN_WIDTH) : clampedX;
            
            // Store original coordinates for cutout
            setOriginalRegion({ x, y, width, height });
            setHighlightRegion({
              x: finalX,
              y: finalY,
              width: Math.min(width, SCREEN_WIDTH),
              height: Math.min(height, SCREEN_HEIGHT - finalY),
            });
            // For nutrition_plan_approaches, force position to top immediately
            if (state.currentStep?.id === 'nutrition_plan_approaches') {
              const forcedPosition = { x: SCREEN_WIDTH / 2, y: 80 };
              console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_plan_approaches position:', forcedPosition);
              setTooltipPosition(forcedPosition);
              return;
            }
            // highlight_quick_workout will be calculated in calculateTooltipPosition based on element position
            // For show_quick_workout, force position to top immediately
            if (state.currentStep?.id === 'show_quick_workout') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_quick_workout position:', forcedPosition);
                setTooltipPosition(forcedPosition);
                return;
            }
            // For show_progression_overview, force position to top immediately
            if (state.currentStep?.id === 'show_progression_overview') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_progression_overview position:', forcedPosition);
                setTooltipPosition(forcedPosition);
                return;
            }
            // For workout_plan_approaches, force position to top to avoid covering list
            if (state.currentStep?.id === 'workout_plan_approaches') {
              const forcedPosition = { x: SCREEN_WIDTH / 2, y: 100 };
              console.log('[TutorialOverlay] 🎯 DIRECTLY setting workout_plan_approaches position:', forcedPosition);
              setTooltipPosition(forcedPosition);
              return;
            }
            // For progress_log_weight
            if (state.currentStep?.id === 'progress_log_weight') {
              const forcedPosition = { x: SCREEN_WIDTH / 2, y: 300 };
              console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_weight position:', forcedPosition);
              setTooltipPosition(forcedPosition);
              return;
            }
            // For progress_weight_trend
            if (state.currentStep?.id === 'progress_weight_trend') {
              const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
              console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_weight_trend position:', forcedPosition);
              setTooltipPosition(forcedPosition);
              return;
            }
            // For progress_log_photo
            if (state.currentStep?.id === 'progress_log_photo') {
              const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
              console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_photo position:', forcedPosition);
              setTooltipPosition(forcedPosition);
              return;
            }
            // For progress_photo_comparison
            if (state.currentStep?.id === 'progress_photo_comparison') {
              const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
              console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_photo_comparison position:', forcedPosition);
              setTooltipPosition(forcedPosition);
              return;
            }
            
            const position = calculateTooltipPosition(
              finalX,
              finalY,
              Math.min(width, SCREEN_WIDTH),
              Math.min(height, SCREEN_HEIGHT - finalY),
              state.currentStep!.position || 'bottom'
            );
            console.log('[TutorialOverlay] 📍 Calculated tooltip position:', position, 'for step:', state.currentStep?.id);
            setTooltipPosition(position);
            return;
          }
        }
        
        // Fallback to measuring directly
        const elementRef = getElementRef(elementId);
        console.log('[TutorialOverlay] Looking for element:', elementId, 'ref found:', !!elementRef?.current, 'stored layout:', !!storedLayout);
        
        if (elementRef?.current) {
          // Use measureInWindow to get coordinates relative to the window
          // This is the correct method for Modal overlays
          elementRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
            console.log('[TutorialOverlay] ✅ Element measured (measureInWindow):', { 
              x, y, width, height,
              elementId: elementId,
              screenWidth: SCREEN_WIDTH, 
              screenHeight: SCREEN_HEIGHT,
              topInset: insets.top,
              bottomInset: insets.bottom
            });
            
            // Validate basic requirements (width/height must be positive)
            // Elements can be off-screen (in ScrollView), we'll clamp them to visible area
            const hasValidDimensions = width > 0 && height > 0;
            
            // Force tooltip position for special steps regardless of dimensions
            // highlight_quick_workout will be calculated in calculateTooltipPosition
            if (state.currentStep?.id === 'show_quick_workout') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_quick_workout position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'show_progression_overview') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_progression_overview position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'nutrition_plan_approaches') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 80 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_plan_approaches position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'workout_plan_approaches') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 100 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting workout_plan_approaches position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'create_workout_plan') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting create_workout_plan position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'progress_log_weight') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 300 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_weight position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'progress_weight_trend') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_weight_trend position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'progress_log_photo') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_photo position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'progress_photo_comparison') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_photo_comparison position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            } else if (state.currentStep?.id === 'nutrition_history') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 450 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_history position (pre-check):', forcedPosition);
                setTooltipPosition(forcedPosition);
            }

            if (hasValidDimensions) {
              // Store original coordinates for cutout
              setOriginalRegion({ x, y, width, height });
              // Clamp coordinates to visible screen bounds
              // If element is off-screen, show it at the edge of the screen
              const clampedX = Math.max(0, Math.min(x, SCREEN_WIDTH - width));
              const clampedY = Math.max(0, Math.min(y, SCREEN_HEIGHT - height));
              
              // If element is completely off-screen vertically, show at bottom
              const finalY = y > SCREEN_HEIGHT ? SCREEN_HEIGHT - Math.min(height, SCREEN_HEIGHT - 100) : clampedY;
              // If element is completely off-screen horizontally, show at right edge
              const finalX = x > SCREEN_WIDTH ? SCREEN_WIDTH - Math.min(width, SCREEN_WIDTH) : clampedX;
              
              setHighlightRegion({
                x: finalX,
                y: finalY,
                width: Math.min(width, SCREEN_WIDTH),
                height: Math.min(height, SCREEN_HEIGHT - finalY),
              });
              console.log('[TutorialOverlay] ✅ Highlight region set (clamped):', { 
                x: finalX, 
                y: finalY, 
                width: Math.min(width, SCREEN_WIDTH),
                height: Math.min(height, SCREEN_HEIGHT - finalY),
                originalX: x,
                originalY: y,
                wasOffScreen: y > SCREEN_HEIGHT || x > SCREEN_WIDTH
              });
              
              // Only set tooltip position if we have valid dimensions
              // For nutrition_plan_approaches, force position to top immediately
              if (state.currentStep?.id === 'nutrition_plan_approaches') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 80 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_plan_approaches position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              // highlight_quick_workout will be calculated in calculateTooltipPosition
              } else if (state.currentStep?.id === 'show_quick_workout') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_quick_workout position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'show_progression_overview') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_progression_overview position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'workout_plan_approaches') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 100 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting workout_plan_approaches position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'create_workout_plan') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting create_workout_plan position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'progress_log_weight') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 300 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_weight position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'progress_weight_trend') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_weight_trend position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'progress_log_photo') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_photo position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'progress_photo_comparison') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_photo_comparison position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else if (state.currentStep?.id === 'nutrition_history') {
                const forcedPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 450 };
                console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_history position (fallback):', forcedPosition);
                setTooltipPosition(forcedPosition);
              } else {
                // Calculate tooltip position
                const position = calculateTooltipPosition(
                  x,
                  y,
                  width,
                  height,
                  state.currentStep!.position || 'bottom'
                );
                setTooltipPosition(position);
              }
            } else {
              console.warn('[TutorialOverlay] ⚠️ Invalid dimensions (element not ready yet), will retry:', { 
                x, y, width, height, 
                elementId,
                screenWidth: SCREEN_WIDTH, 
                screenHeight: SCREEN_HEIGHT
              });
              setHighlightRegion(null);
              
              // Retry measuring after a delay if element isn't ready
              // This can happen if the element hasn't rendered yet
              setTimeout(() => {
                if (elementRef?.current && state.currentStep?.elementId === elementId) {
                  console.log('[TutorialOverlay] 🔄 Retrying measurement for element:', elementId);
                  elementRef.current.measureInWindow((retryX: number, retryY: number, retryWidth: number, retryHeight: number) => {
                    if (retryWidth > 0 && retryHeight > 0) {
                      console.log('[TutorialOverlay] ✅ Retry successful:', { retryX, retryY, retryWidth, retryHeight });
                      // Recursively call measureElement logic with valid dimensions
                      setOriginalRegion({ x: retryX, y: retryY, width: retryWidth, height: retryHeight });
                      const clampedX = Math.max(0, Math.min(retryX, SCREEN_WIDTH - retryWidth));
                      const clampedY = Math.max(0, Math.min(retryY, SCREEN_HEIGHT - retryHeight));
                      const finalY = retryY > SCREEN_HEIGHT ? SCREEN_HEIGHT - Math.min(retryHeight, SCREEN_HEIGHT - 100) : clampedY;
                      const finalX = retryX > SCREEN_WIDTH ? SCREEN_WIDTH - Math.min(retryWidth, SCREEN_WIDTH) : clampedX;
                      
                      setHighlightRegion({
                        x: finalX,
                        y: finalY,
                        width: Math.min(retryWidth, SCREEN_WIDTH),
                        height: Math.min(retryHeight, SCREEN_HEIGHT - finalY),
                      });
                      
                      // Set tooltip position
                      if (state.currentStep?.id === 'nutrition_plan_approaches') {
                        setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 80 });
                      } else if (state.currentStep?.id === 'navigate_workout') {
                        setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 150 });
                      } else if (state.currentStep?.id === 'nutrition_history') {
                        setTooltipPosition({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 450 });
                      } else {
                        const position = calculateTooltipPosition(
                          retryX,
                          retryY,
                          retryWidth,
                          retryHeight,
                          state.currentStep!.position || 'bottom'
                        );
                        setTooltipPosition(position);
                      }
                    } else {
                      console.warn('[TutorialOverlay] ⚠️ Retry still has invalid dimensions, element may not be visible');
                    }
                  });
                }
              }, 500); // Wait 500ms before retry
            }
          });
        } else {
          // Element not found, set default tooltip position
          // For nutrition_plan_approaches, force position to top
          if (state.currentStep?.id === 'nutrition_plan_approaches') {
            setTooltipPosition({
              x: SCREEN_WIDTH / 2,
              y: 80,
            });
          // highlight_quick_workout will be calculated in calculateTooltipPosition
          } else if (state.currentStep?.id === 'show_quick_workout') {
            setTooltipPosition({
              x: SCREEN_WIDTH / 2,
              y: 150,
            });
          } else if (state.currentStep?.id === 'show_progression_overview') {
            setTooltipPosition({
              x: SCREEN_WIDTH / 2,
              y: 200,
            });
          } else if (state.currentStep?.id === 'workout_plan_approaches') {
            setTooltipPosition({
              x: SCREEN_WIDTH / 2,
              y: 100,
            });
          } else if (state.currentStep?.id === 'create_workout_plan') {
            setTooltipPosition({
              x: SCREEN_WIDTH / 2,
              y: 200,
            });
          } else if (state.currentStep?.id === 'progress_log_weight') {
            setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 300 });
          } else if (state.currentStep?.id === 'progress_weight_trend') {
            setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 200 });
          } else if (state.currentStep?.id === 'progress_log_photo') {
            setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 150 });
          } else if (state.currentStep?.id === 'progress_photo_comparison') {
            setTooltipPosition({ x: SCREEN_WIDTH / 2, y: 150 });
          } else if (state.currentStep?.id === 'nutrition_history') {
            setTooltipPosition({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 450 });
          } else {
            setTooltipPosition({
              x: SCREEN_WIDTH / 2,
              y: SCREEN_HEIGHT - 200,
            });
          }
          
          // Retry finding element
          let retries = 0;
          const maxRetries = 15;
          const retryInterval = 200;
          
          const tryMeasure = () => {
            const elementId = state.currentStep!.elementId;
            
            // First check for stored layout
            const storedLayout = getElementLayout(elementId);
            if (storedLayout) {
              const { x, y, width, height } = storedLayout;
              const hasValidDimensions = width > 0 && height > 0;
              
              if (hasValidDimensions) {
                const clampedX = Math.max(0, Math.min(x, SCREEN_WIDTH - width));
                const clampedY = Math.max(0, Math.min(y, SCREEN_HEIGHT - height));
                const finalY = y > SCREEN_HEIGHT ? SCREEN_HEIGHT - Math.min(height, SCREEN_HEIGHT - 100) : clampedY;
                const finalX = x > SCREEN_WIDTH ? SCREEN_WIDTH - Math.min(width, SCREEN_WIDTH) : clampedX;
                
                setHighlightRegion({
                  x: finalX,
                  y: finalY,
                  width: Math.min(width, SCREEN_WIDTH),
                  height: Math.min(height, SCREEN_HEIGHT - finalY),
                });
                // For nutrition_plan_approaches, force position to top immediately
                if (state.currentStep?.id === 'nutrition_plan_approaches') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 80 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_plan_approaches position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'highlight_quick_workout') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting highlight_quick_workout position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'show_quick_workout') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_quick_workout position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'show_progression_overview') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_progression_overview position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'workout_plan_approaches') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 100 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting workout_plan_approaches position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'create_workout_plan') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting create_workout_plan position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'progress_log_weight') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 300 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_weight position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'progress_weight_trend') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_weight_trend position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'progress_log_photo') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_photo position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                if (state.currentStep?.id === 'progress_photo_comparison') {
                  const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                  console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_photo_comparison position (retry):', forcedPosition);
                  setTooltipPosition(forcedPosition);
                  return;
                }
                
                const position = calculateTooltipPosition(
                  finalX,
                  finalY,
                  Math.min(width, SCREEN_WIDTH),
                  Math.min(height, SCREEN_HEIGHT - finalY),
                  state.currentStep!.position || 'bottom'
                );
                setTooltipPosition(position);
                return;
              }
            }
            
            const elementRef = getElementRef(elementId);
            if (elementRef?.current) {
              elementRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                console.log('[TutorialOverlay] ✅ Element found on retry (measureInWindow):', { x, y, width, height });
                const hasValidDimensions = width > 0 && height > 0;
                
                if (hasValidDimensions) {
                  // Store original coordinates for cutout
                  setOriginalRegion({ x, y, width, height });
                  const clampedX = Math.max(0, Math.min(x, SCREEN_WIDTH - width));
                  const clampedY = Math.max(0, Math.min(y, SCREEN_HEIGHT - height));
                  const finalY = y > SCREEN_HEIGHT ? SCREEN_HEIGHT - Math.min(height, SCREEN_HEIGHT - 100) : clampedY;
                  const finalX = x > SCREEN_WIDTH ? SCREEN_WIDTH - Math.min(width, SCREEN_WIDTH) : clampedX;
                  
                  setHighlightRegion({
                    x: finalX,
                    y: finalY,
                    width: Math.min(width, SCREEN_WIDTH),
                    height: Math.min(height, SCREEN_HEIGHT - finalY),
                  });
                  console.log('[TutorialOverlay] ✅ Highlight region set on retry (clamped):', { 
                    x: finalX, 
                    y: finalY, 
                    width: Math.min(width, SCREEN_WIDTH),
                    height: Math.min(height, SCREEN_HEIGHT - finalY),
                    originalX: x,
                    originalY: y,
                    wasOffScreen: y > SCREEN_HEIGHT || x > SCREEN_WIDTH
                  });
                  
                  // For nutrition_plan_approaches, force position to top immediately
                  if (state.currentStep?.id === 'nutrition_plan_approaches') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 80 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_plan_approaches position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  // highlight_quick_workout will be calculated in calculateTooltipPosition
                  } else if (state.currentStep?.id === 'show_quick_workout') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_quick_workout position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'show_progression_overview') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting show_progression_overview position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'workout_plan_approaches') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 100 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting workout_plan_approaches position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'create_workout_plan') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting create_workout_plan position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'progress_log_weight') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 300 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_weight position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'progress_weight_trend') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 200 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_weight_trend position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'progress_log_photo') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_log_photo position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'progress_photo_comparison') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: 150 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting progress_photo_comparison position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else if (state.currentStep?.id === 'nutrition_history') {
                    const forcedPosition = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 450 };
                    console.log('[TutorialOverlay] 🎯 DIRECTLY setting nutrition_history position (retry2):', forcedPosition);
                    setTooltipPosition(forcedPosition);
                  } else {
                    const position = calculateTooltipPosition(
                      finalX,
                      finalY,
                      Math.min(width, SCREEN_WIDTH),
                      Math.min(height, SCREEN_HEIGHT - finalY),
                      state.currentStep!.position || 'bottom'
                    );
                    setTooltipPosition(position);
                  }
                } else {
                  console.warn('[TutorialOverlay] ⚠️ Invalid dimensions on retry (element still not ready):', { 
                    x, y, width, height,
                    elementId: state.currentStep?.elementId,
                    screenWidth: SCREEN_WIDTH,
                    screenHeight: SCREEN_HEIGHT
                  });
                  setHighlightRegion(null);
                  // Don't set tooltip position if element isn't ready
                }
              });
            } else if (retries < maxRetries) {
              retries++;
              setTimeout(tryMeasure, retryInterval);
            }
        };
        
        setTimeout(tryMeasure, retryInterval);
      }
      };
    
      // Wait a bit for screen to render, then measure
      // Longer delay for first step to ensure card is fully laid out
      const delay = state.currentStep.id === 'dashboard_reminders' || state.currentStep.id === 'progress_log_photo' ? 500 : 100;
      timeoutId = setTimeout(measureElement, delay);

      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setHighlightRegion(null);
        setTooltipPosition(null);
      });
    }
    
    return () => {
      // Cleanup timeout if component unmounts or dependencies change
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [state.isActive, state.isPaused, state.currentStep, getElementRef, getElementLayout, fadeAnim, scaleAnim, insets]);

  const calculateTooltipPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  ): { x: number; y: number } => {
    // CHECK FOR nutrition_plan_approaches FIRST - before any other calculations
    if (state.currentStep?.id === 'nutrition_plan_approaches') {
      // Position tooltip in the upper area of the screen - force it much higher
      // Use a fixed position from top to ensure it's well above the content
      const fixedTopOffset = 80; // Fixed pixels from top - very high position near top
      const finalY = fixedTopOffset; // Force to this position (ignore all other calculations)
      const finalX = SCREEN_WIDTH / 2;
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING nutrition_plan_approaches tooltip to VERY HIGH position:', {
        finalY,
        screenHeight: SCREEN_HEIGHT,
        fixedTopOffset,
        topInset: insets.top,
        stepId: state.currentStep?.id,
        stepTitle: state.currentStep?.title
      });
      return { x: finalX, y: finalY };
    }

    // CHECK FOR highlight_quick_workout - Position tooltip below the button
    if (state.currentStep?.id === 'highlight_quick_workout') {
      // Calculate position below the button (button is in Quick Actions Grid)
      // Quick Actions Grid is typically around y: 200-300, button height ~60, so place tooltip below
      const buttonBottom = y + height;
      const padding = 20;
      const tooltipY = buttonBottom + padding;
      const maxY = SCREEN_HEIGHT - 240 - 80 - 34 - 20; // Account for tooltip height, nav bar, safe area
      const finalY = Math.min(tooltipY, maxY);
      console.log('[TutorialOverlay] ⬇️⬇️⬇️ FORCING highlight_quick_workout tooltip BELOW button:', { 
        buttonBottom, 
        tooltipY, 
        finalY,
        elementY: y,
        elementHeight: height
      });
      return { x: SCREEN_WIDTH / 2, y: finalY };
    }

    // CHECK FOR show_quick_workout - Move tooltip upper
    if (state.currentStep?.id === 'show_quick_workout') {
      const fixedTopOffset = 200;
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING show_quick_workout tooltip to UPPER position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR show_progression_overview - Move tooltip to top
    if (state.currentStep?.id === 'show_progression_overview') {
      const fixedTopOffset = 200; // Position higher up
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING show_progression_overview tooltip to TOP position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR workout_plan_approaches - Move tooltip to top to avoid blocking list
    if (state.currentStep?.id === 'workout_plan_approaches') {
      const fixedTopOffset = 100; // Position near top
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING workout_plan_approaches tooltip to TOP position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR create_workout_plan - Move tooltip to top to avoid blocking FAB
    if (state.currentStep?.id === 'create_workout_plan') {
      const fixedTopOffset = 200; // Position higher up
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING create_workout_plan tooltip to TOP position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR progress_log_weight - Move tooltip down to avoid blocking button
    if (state.currentStep?.id === 'progress_log_weight') {
      const fixedTopOffset = 300; 
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING progress_log_weight tooltip to BOTTOM position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR progress_weight_trend - Move tooltip up
    if (state.currentStep?.id === 'progress_weight_trend') {
      const fixedTopOffset = 200; 
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING progress_weight_trend tooltip to TOP position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR progress_log_photo - Move tooltip up
    if (state.currentStep?.id === 'progress_log_photo') {
      const fixedTopOffset = 150; 
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING progress_log_photo tooltip to TOP position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR progress_photo_comparison - Move tooltip down
    if (state.currentStep?.id === 'progress_photo_comparison') {
      const fixedTopOffset = 150; 
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING progress_photo_comparison tooltip to TOP position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    // CHECK FOR nutrition_history - Move tooltip up from bottom
    if (state.currentStep?.id === 'nutrition_history') {
      const fixedTopOffset = SCREEN_HEIGHT - 450; // Position higher up, above the bottom navigation
      console.log('[TutorialOverlay] ⬆️⬆️⬆️ FORCING nutrition_history tooltip to UPPER position:', fixedTopOffset);
      return { x: SCREEN_WIDTH / 2, y: fixedTopOffset };
    }

    const padding = 40; // Increased padding to ensure tooltip is far from element
    const tooltipWidth = SCREEN_WIDTH - 64;
    const tooltipHeight = 240; // Increased to account for buttons, padding, and safe area
    const bottomNavBarHeight = 80; // Reserve space for bottom navigation bar
    const bottomSafeArea = insets.bottom || 34; // Bottom safe area (home indicator, etc.) - default to 34 for iPhone
    const topSafeArea = 100; // Reserve space for status bar and header

    const elementTop = y;
    const elementBottom = y + height;
    const elementLeft = x;
    const elementRight = x + width;
    const elementCenterX = x + width / 2;
    const spaceAbove = elementTop - topSafeArea;
    const spaceBelow = SCREEN_HEIGHT - elementBottom - bottomNavBarHeight;

    let finalX = SCREEN_WIDTH / 2;
    let finalY = SCREEN_HEIGHT - tooltipHeight - bottomNavBarHeight - bottomSafeArea - 20; // Default: above bottom nav bar and safe area

    // For nutrition section step, force tooltip above bottom tab bar
    if (state.currentStep?.id === 'navigate_nutrition') {
      finalY = SCREEN_HEIGHT - bottomNavBarHeight - bottomSafeArea - tooltipHeight - 20; // Place above bottom tab bar with safe area
      finalX = SCREEN_WIDTH / 2;
      return { x: finalX, y: finalY };
    }

    // Position tooltip far from element to avoid overlap
    // Prefer bottom (above nav bar), but ensure it's well separated
    if (position === 'top' || spaceAbove >= tooltipHeight + padding) {
      // Enough space above element, place it there
      finalY = Math.max(topSafeArea, elementTop - tooltipHeight - padding);
      finalX = elementCenterX;
    } else if (spaceBelow >= tooltipHeight + padding) {
      // Enough space below element, place it there
      // But ensure it doesn't go below the safe area
      const proposedY = elementBottom + padding;
      const maxY = SCREEN_HEIGHT - tooltipHeight - bottomNavBarHeight - bottomSafeArea - 20;
      finalY = Math.min(proposedY, maxY);
      finalX = elementCenterX;
    } else {
      // Not enough space above or below, place above bottom nav bar
      finalY = SCREEN_HEIGHT - tooltipHeight - bottomNavBarHeight - bottomSafeArea - 20;
      finalX = SCREEN_WIDTH / 2;
    }

    // Double-check: ensure tooltip doesn't overlap with highlighted element
    const tooltipTop = finalY;
    const tooltipBottom = finalY + tooltipHeight;
    const tooltipLeft = finalX - tooltipWidth / 2;
    const tooltipRight = finalX + tooltipWidth / 2;
    
    const overlaps = !(
      tooltipBottom <= elementTop - padding ||
      tooltipTop >= elementBottom + padding ||
      tooltipRight <= elementLeft - padding ||
      tooltipLeft >= elementRight + padding
    );

    if (overlaps) {
      // Force to above bottom nav bar if still overlapping
      finalY = SCREEN_HEIGHT - tooltipHeight - bottomNavBarHeight - bottomSafeArea - 20;
      finalX = SCREEN_WIDTH / 2;
      console.log('[TutorialOverlay] ⚠️ Tooltip would overlap, moved above bottom nav bar');
    }

    // Ensure tooltip stays within screen bounds (above nav bar, below header, accounting for safe areas)
    // For nutrition_plan_approaches, we already calculated the position, so don't override it
    if (state.currentStep?.id !== 'nutrition_plan_approaches') {
      finalX = Math.max(tooltipWidth / 2 + 32, Math.min(SCREEN_WIDTH - tooltipWidth / 2 - 32, finalX));
      finalY = Math.max(topSafeArea, Math.min(SCREEN_HEIGHT - tooltipHeight - bottomNavBarHeight - bottomSafeArea - 20, finalY));
    } else {
      // For nutrition_plan_approaches, keep the position we calculated (already returned above, but just in case)
      finalX = SCREEN_WIDTH / 2;
      // Don't modify finalY - it was already set correctly above
    }

    return { x: finalX, y: finalY };
  };

  if (!state.isActive || state.isPaused || !state.currentStep) {
    return null;
  }

  // Check if we're on the correct screen before rendering
  // This prevents showing the tutorial step on the wrong screen during navigation
  if (pathname && state.currentStep.screen) {
    const normalizePath = (path: string) => {
      if (!path) return '';
      return path
        .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
        .replace(/^\(main\)\/?/, '') // Remove (main)/ prefix
        .toLowerCase();
    };
    
    const normalizedPathname = normalizePath(pathname);
    const normalizedScreen = normalizePath(state.currentStep.screen);
    
    // Check if paths match or start with each other (handling nested routes)
    // We allow if we are ON the target screen or a SUB-SCREEN of the target
    // We do NOT allow if we are on a PARENT screen of the target (element likely not visible)
    const isMatch = normalizedPathname === normalizedScreen || 
                   normalizedPathname.startsWith(normalizedScreen);
                   
    if (!isMatch) {
      console.log('[TutorialOverlay] ⏳ Waiting for screen match:', {
        current: normalizedPathname,
        target: normalizedScreen,
        originalPath: pathname,
        originalTarget: state.currentStep.screen
      });
      
      // Logic for auto-advance is now handled in TutorialContext
      
      return null; // Don't render overlay if screen doesn't match
    }
  }

  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === state.steps.length - 1;
  const tooltipAtBottom = tooltipPosition && tooltipPosition.y > SCREEN_HEIGHT / 2;
  
  // Hide highlight for steps that use cutout approach (normal lighting)
  const shouldShowHighlight = state.currentStep.id !== 'navigate_nutrition' && 
                              state.currentStep.id !== 'dashboard_reminders' &&
                              state.currentStep.id !== 'show_quick_workout' &&
                              state.currentStep.id !== 'show_progression_overview' &&
                              state.currentStep.id !== 'progress_log_weight' &&
                              state.currentStep.id !== 'progress_weight_trend' &&
                              state.currentStep.id !== 'progress_photo_comparison';

  // Render 4-view overlay if we have a highlight region
  // This creates a "hole" around the target element without using complex SVG masking
  const renderOverlay = () => {
    if (!highlightRegion || !originalRegion) {
      return <View style={styles.overlay} />;
    }

    // If we want a full blackout (no cutout), return simple overlay
    if (!shouldShowHighlight) {
      // For specific steps, we might want the cutout logic even if highlight border is hidden
      // But currently the logic was: if hidden highlight -> use cutout (normal lighting).
      // Wait, previous logic was:
      // if (state.currentStep.id === 'navigate_nutrition' || state.currentStep.id === 'dashboard_reminders') -> show cutout
      // else -> show full overlay
      
      // Let's respect the exact cutout logic requested:
      // Use cutout for navigate_nutrition and dashboard_reminders
      const useCutout = state.currentStep.id === 'navigate_nutrition' || 
                        state.currentStep.id === 'dashboard_reminders' ||
                        state.currentStep.id === 'show_quick_workout' ||
                        state.currentStep.id === 'show_progression_overview' ||
                        state.currentStep.id === 'progress_log_weight' ||
                        state.currentStep.id === 'progress_weight_trend' ||
                        state.currentStep.id === 'progress_log_photo' ||
                        state.currentStep.id === 'progress_photo_comparison';
      
      if (!useCutout) {
        return <View style={styles.overlay} />;
      }
    }

    // Use original coordinates for the cutout "hole"
    // Add padding to make the hole larger than the element
    const padding = 10;
    const holeX = Math.max(0, originalRegion.x - padding);
    const holeY = Math.max(0, originalRegion.y - padding);
    // Calculate dimensions ensuring we don't just add padding blindly if x/y were clamped
    // We want the hole to extend 'padding' amount from the original edges
    const holeW = (originalRegion.x + originalRegion.width + padding) - holeX;
    const holeH = (originalRegion.y + originalRegion.height + padding) - holeY;

    // Calculate 4 rectangles around the hole
    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Top Block */}
        <View 
          style={[
            styles.overlayBlock, 
            { top: 0, left: 0, width: SCREEN_WIDTH, height: holeY }
          ]} 
        />
        {/* Bottom Block */}
        <View 
          style={[
            styles.overlayBlock, 
            { top: holeY + holeH, left: 0, width: SCREEN_WIDTH, height: SCREEN_HEIGHT - (holeY + holeH) }
          ]} 
        />
        {/* Left Block (between top/bottom) */}
        <View 
          style={[
            styles.overlayBlock, 
            { top: holeY, left: 0, width: holeX, height: holeH }
          ]} 
        />
        {/* Right Block (between top/bottom) */}
        <View 
          style={[
            styles.overlayBlock, 
            { top: holeY, left: holeX + holeW, width: SCREEN_WIDTH - (holeX + holeW), height: holeH }
          ]} 
        />
      </View>
    );
  };

  return (
    <Modal
      visible={state.isActive && !state.isPaused}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Dark overlay using 4-view technique */}
        {renderOverlay()}

        {/* Highlighted element - border only, adapts to element size and shape */}
        {highlightRegion && shouldShowHighlight && (
          <>
            {/* Calculate appropriate border radius based on element size */}
            {(() => {
              // For larger elements (cards), use a standard card border radius (16px)
              // For smaller elements (buttons), use a smaller border radius
              // For very small elements, use a minimal border radius
              const isLargeElement = highlightRegion.width > 200 || highlightRegion.height > 100;
              const isMediumElement = highlightRegion.width > 100 || highlightRegion.height > 50;
              const baseRadius = isLargeElement ? 16 : isMediumElement ? 12 : 8;
              
              // Ensure border radius doesn't exceed half the smallest dimension
              const maxRadius = Math.min(highlightRegion.width, highlightRegion.height) / 2;
              const glowRadius = Math.min(baseRadius + 2, maxRadius);
              const borderRadius = Math.min(baseRadius, maxRadius);
              
              return (
                <>
                  {/* Outer glow - subtle, doesn't cover content, adapts to element size */}
                  <View
                    style={[
                      styles.highlightGlow,
                      {
                        left: highlightRegion.x - 14, // padding + 4
                        top: highlightRegion.y - 14,
                        width: highlightRegion.width + 28,
                        height: highlightRegion.height + 28,
                        borderRadius: glowRadius + 4,
                      },
                    ]}
                  />
                  {/* Main border - visible but doesn't cover content, adapts to element size */}
                  <Animated.View
                    style={[
                      styles.highlightBorder,
                      {
                        left: highlightRegion.x - 10, // padding
                        top: highlightRegion.y - 10,
                        width: highlightRegion.width + 20,
                        height: highlightRegion.height + 20,
                        borderRadius: borderRadius + 4,
                        transform: [{ scale: pulseAnim }],
                      },
                    ]}
                  />
                </>
              );
            })()}
          </>
        )}

        {/* Tooltip with arrow */}
        {state.currentStep && (
          <Animated.View
            style={[
              styles.tooltipContainer,
              {
                left: tooltipPosition 
                  ? tooltipPosition.x - (SCREEN_WIDTH - 64) / 2
                  : 32,
                top: tooltipPosition 
                  ? tooltipPosition.y
                  : SCREEN_HEIGHT - 200,
                maxHeight: tooltipPosition 
                  ? Math.min(220, SCREEN_HEIGHT - tooltipPosition.y - insets.bottom - 40) // Ensure tooltip doesn't extend beyond safe area with extra padding
                  : 220,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Arrow pointing to element */}
            {highlightRegion && tooltipPosition && (() => {
              // Calculate arrow position relative to tooltip
              const elementCenterY = highlightRegion.y + highlightRegion.height / 2;
              const tooltipCenterY = tooltipPosition.y + 100; // Middle of tooltip
              const arrowPointsUp = tooltipCenterY > elementCenterY;
              
              return (
                <View
                  style={[
                    styles.tooltipArrow,
                    {
                      left: tooltipPosition.x - 8,
                      top: arrowPointsUp ? -12 : 200, // Arrow above or below tooltip
                      transform: [
                        { rotate: arrowPointsUp ? '0deg' : '180deg' }
                      ],
                    },
                  ]}
                >
                  <View style={styles.arrowTriangle} />
                </View>
              );
            })()}
            
            <View style={styles.tooltipCard}>
              <View style={styles.tooltipContent}>
                <Text style={styles.tooltipTitle}>{state.currentStep.title}</Text>
                <Text style={styles.tooltipDescription}>{state.currentStep.description}</Text>
              </View>

              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${((state.currentStepIndex + 1) / state.steps.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {state.currentStepIndex + 1} / {state.steps.length}
                </Text>
              </View>

              {/* Action buttons */}
              <View style={styles.buttonContainer}>
                <View style={styles.spacer} />
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={isLastStep ? completeTutorial : nextStep}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={colors.gradients.primary}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.nextButtonGradient}
                  >
                    <Text style={styles.nextButtonText}>
                      {isLastStep ? 'Finish' : 'Next'}
                    </Text>
                    <Icon name="chevron-right" size={20} color={colors.white} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    zIndex: 9999,
    elevation: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Darker overlay for better contrast
    zIndex: 1,
    elevation: 1,
  },
  overlayBlock: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Match overlay color
    zIndex: 1,
    elevation: 1,
  },
  highlightGlow: {
    position: 'absolute',
    backgroundColor: 'transparent', // No background to avoid covering content
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10001,
    zIndex: 10001,
  },
  highlightBorder: {
    position: 'absolute',
    borderWidth: 4, // Visible border
    borderColor: colors.primary,
    backgroundColor: 'transparent', // No background - just border
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10002,
    zIndex: 10002,
  },
  tooltipContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 64,
    maxHeight: 260,
    zIndex: 10000,
    elevation: 10000,
  },
  tooltipArrow: {
    position: 'absolute',
    width: 16,
    height: 16,
    zIndex: 10001,
    elevation: 10001,
  },
  arrowTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  tooltipCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tooltipContent: {
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  tooltipDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  nextButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
    marginRight: 6,
  },
});
