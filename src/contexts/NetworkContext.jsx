import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { processOfflineQueue } from '../lib/offlineQueue';

const NetworkContext = createContext({
  isOnline: true,
  checkConnection: async () => true
});

export const useNetwork = () => useContext(NetworkContext);

export function NetworkProvider({ children }) {
  // Start with navigator's opinion, but we will verify it.
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Active ping to verify true internet access (overcomes "Li-Fi")
  const checkConnection = useCallback(async () => {
    try {
      // Fetch a tiny reliable endpoint to verify actual internet
      // Appending a random timestamp prevents browser caching
      const response = await fetch(`https://1.1.1.1/cdn-cgi/trace?t=${new Date().getTime()}`, {
        method: 'HEAD',
        mode: 'no-cors', // no-cors is important because we just want to know if the request completes
        cache: 'no-store'
      });
      return true; // If fetch completes without throwing, we have internet
    } catch (error) {
      return false; // Fetch threw an error, meaning no internet
    }
  }, []);

  useEffect(() => {
    let intervalId;

    const handleStatusChange = async () => {
      // When navigator says we are online, verify it actively
      if (navigator.onLine) {
        const actuallyOnline = await checkConnection();
        setIsOnline(actuallyOnline);
      } else {
        // If navigator says we are offline, we definitely are
        setIsOnline(false);
      }
    };

    // Listen to browser events
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Initial check
    handleStatusChange();

    // Set up a heartbeat to continuously verify connection while the app is open
    // This catches silent drops where the OS still thinks it's connected to Wi-Fi
    intervalId = setInterval(async () => {
      const actuallyOnline = await checkConnection();
      setIsOnline(prev => {
        if (prev !== actuallyOnline) {
          console.log(`[NetworkContext] True connectivity changed: ${actuallyOnline ? 'ONLINE' : 'OFFLINE'}`);
        }
        return actuallyOnline;
      });
    }, 15000); // Check every 15 seconds

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearInterval(intervalId);
    };
  }, [checkConnection]);

  // Sync offline queue when connection is restored
  useEffect(() => {
    if (isOnline) {
      console.log("[NetworkContext] Connection restored, processing offline queue...");
      processOfflineQueue().catch(err => console.error("Error processing queue on reconnect:", err));
    }
  }, [isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline, checkConnection }}>
      {children}
    </NetworkContext.Provider>
  );
}
