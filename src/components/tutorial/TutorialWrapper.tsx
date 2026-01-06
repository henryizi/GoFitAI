import React, { useRef, useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTutorial } from '../../contexts/TutorialContext';
import { usePathname } from 'expo-router';

interface TutorialWrapperProps {
  children: React.ReactNode;
  tutorialId: string;
  style?: ViewStyle;
}

export function TutorialWrapper({ children, tutorialId, style }: TutorialWrapperProps) {
  const { registerElement, unregisterElement, state, updateElementLayout } = useTutorial();
  const ref = useRef<View>(null);

  useEffect(() => {
    // Simple registration - just let context know this element exists
    if (ref.current) {
      registerElement(tutorialId, ref);
    }
    
    return () => {
      unregisterElement(tutorialId);
    };
  }, [tutorialId, registerElement, unregisterElement]);

  const handleLayout = () => {
    // Always report layout when it changes
    // This ensures we have the latest dimensions even if the element moves
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        // Only update if valid dimensions
        if (x >= 0 && y >= 0 && width > 0 && height > 0) {
          updateElementLayout(tutorialId, { x, y, width, height });
        }
      });
    }
  };

  return (
    <View 
      ref={ref} 
      collapsable={false} 
      style={style} 
      onLayout={handleLayout}
    >
      {children}
    </View>
  );
}

