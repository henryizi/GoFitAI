/**
 * App initialization script
 * This script runs when the app starts to perform initialization tasks
 */

import { Platform, Alert } from 'react-native';
import { environment } from '../src/config/environment';

// Flag to prevent showing the alert multiple times
let hasShownServerAlert = false;

// Function to check if the server is running
const checkServerStatus = async () => {
  console.log('Development build detected, checking server status');
  
  // List of URLs to try - prefer env first, then production
  const serverUrls = [
    environment.apiUrl,
    'https://gofitai-production.up.railway.app'
  ].filter(Boolean);
  
  // Try each URL
  for (const url of serverUrls) {
    try {
      console.log(`Checking server at: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`${url}/api/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`Server is running at: ${url}`);
        return true;
      }
    } catch (error) {
      console.log(`Failed to connect to ${url}: ${error.message}`);
    }
  }
  
  console.log('Server check failed. Railway server may be starting up.');
  console.log('Please wait a moment and try again.');
  
  // Only show the alert once per session and only in development
  if (!hasShownServerAlert && __DEV__) {
    hasShownServerAlert = true;
    
    // Show an alert to the user with a longer delay to avoid interrupting app startup
    setTimeout(() => {
      Alert.alert(
        "Server Connection Issue",
        "Unable to connect to the AI server. Some features may not work properly. Please ensure the server is running by opening a terminal and running:\n\ncd server && node start-server.js",
        [{ text: "OK" }]
      );
    }, 5000); // Increased delay to 5 seconds
  }
  
  return false;
};

// Initialize the app
const initializeApp = async () => {
  try {
    // Check if the server is running
    await checkServerStatus();
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
};

// Run initialization
initializeApp();

export default {}; 