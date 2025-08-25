import React, { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import PremiumSession from './[sessionId]-premium';

export default function SessionWrapper() {
  const { id, sessionTitle, fallbackExercises } = useLocalSearchParams<{ id: string; sessionTitle?: string; fallbackExercises?: string }>();

  useEffect(() => {
    if (id) {
      router.setParams({
        sessionId: String(id),
        sessionTitle: sessionTitle ? String(sessionTitle) : undefined,
        fallbackExercises: fallbackExercises ? String(fallbackExercises) : undefined,
      });
    }
  }, [id, sessionTitle, fallbackExercises]);

  return <PremiumSession />;
} 