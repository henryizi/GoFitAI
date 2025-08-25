import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';

interface ServerStatusContextType {
  isServerConnected: boolean;
  isChecking: boolean;
  lastCheckTime: Date | null;
  checkServerStatus: () => Promise<void>;
  suppressAlerts: boolean;
  setSuppressAlerts: (suppress: boolean) => void;
}

const ServerStatusContext = createContext<ServerStatusContextType | undefined>(undefined);

interface ServerStatusProviderProps {
  children: ReactNode;
}

export const ServerStatusProvider: React.FC<ServerStatusProviderProps> = ({ children }) => {
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [suppressAlerts, setSuppressAlerts] = useState(false);

  const checkServerStatus = async () => {
    setIsChecking(true);
    
    try {
      // Prefer env URL first (developer-controlled), then production, then common local
      const DEFAULT_TIMEOUT_MS = 12000;
      const MAX_ATTEMPTS_PER_URL = 2;
      const envUrl = process.env.EXPO_PUBLIC_API_URL;
      const serverUrls = [
        envUrl,
        'https://gofitai-production.up.railway.app',
        'http://localhost:4000'
      ].filter(Boolean);
      
      console.log(`[SERVER STATUS] Environment variable EXPO_PUBLIC_API_URL: ${process.env.EXPO_PUBLIC_API_URL}`);
      console.log(`[SERVER STATUS] Server URLs to test: ${JSON.stringify(serverUrls)}`);
      console.log(`[SERVER STATUS] __DEV__ mode: ${__DEV__}`);
      
      let connected = false;
      
      for (const url of serverUrls) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_URL; attempt++) {
          try {
            console.log(`[SERVER STATUS] Checking server at: ${url} (attempt ${attempt}/${MAX_ATTEMPTS_PER_URL})`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
            
            const response = await fetch(`${url}/api/health`, { 
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`[SERVER STATUS] Response status for ${url}: ${response.status}`);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`[SERVER STATUS] ✅ Server is healthy at: ${url}`, data);
              global.API_URL = url;
              connected = true;
              break;
            } else {
              console.log(`[SERVER STATUS] ❌ Server responded with status ${response.status} at: ${url}`);
            }
          } catch (error) {
            const message = (error as any)?.message ? (error as any).message : String(error);
            console.log(`[SERVER STATUS] ❌ Failed to connect to ${url} on attempt ${attempt}: ${message}`);
          }
        }
        if (connected) break;
      }
      
      console.log(`[SERVER STATUS] Final connection status: ${connected ? 'CONNECTED' : 'DISCONNECTED'}`);
      setIsServerConnected(connected);
      setLastCheckTime(new Date());
      
      // Only show alert if not suppressed and server is not connected
      if (!connected && !suppressAlerts) {
        console.log(`[SERVER STATUS] Showing connection error alert (__DEV__: ${__DEV__})`);
        setTimeout(() => {
          Alert.alert(
            "Server Connection Issue",
            `Unable to connect to the AI server at ${process.env.EXPO_PUBLIC_API_URL}. Some features may not work properly.\n\nTested URLs:\n${serverUrls.join('\n')}\n\nPlease check your internet connection.`,
            [
              { text: "OK" },
              { text: "Don't Show Again", onPress: () => setSuppressAlerts(true) },
              { text: "Retry", onPress: () => checkServerStatus() }
            ]
          );
        }, 1000); // Reduced delay
      }
      
    } catch (error) {
      console.error('[SERVER STATUS] Error checking server status:', error);
      setIsServerConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Check server status on mount
  useEffect(() => {
    checkServerStatus();
  }, []);

  const value: ServerStatusContextType = {
    isServerConnected,
    isChecking,
    lastCheckTime,
    checkServerStatus,
    suppressAlerts,
    setSuppressAlerts,
  };

  return (
    <ServerStatusContext.Provider value={value}>
      {children}
    </ServerStatusContext.Provider>
  );
};

export const useServerStatus = (): ServerStatusContextType => {
  const context = useContext(ServerStatusContext);
  if (context === undefined) {
    throw new Error('useServerStatus must be used within a ServerStatusProvider');
  }
  return context;
};


