import React from 'react';
import { Redirect } from 'expo-router';

// Temporary dashboard that forwards to the Progress hub
// This prevents a blank screen when the app redirects to /(main)/dashboard
export default function Dashboard() {
  return <Redirect href="/(main)/progress" />;
}







