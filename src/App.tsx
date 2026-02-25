// App.tsx
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import "react-native-gesture-handler";
import { getUserId, onAuthStateChange } from "./services/auth";
import { StackNavigator } from './navigation/StackNavigator';

// Enable screens for better performance on native navigation
enableScreens();

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);

  // Load user ID from local storage and set up auth state change listener
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedId = await getUserId();
        setUserId(storedId);
      } catch (error) {
        console.error("Error loading user ID:", error);
      }
    };

    loadUserId();

    // Listen for authentication state changes
    const unsubscribe = onAuthStateChange((authUser) => {
      if (authUser) {
        setUserId(authUser.id);
      } else {
        setUserId(null);
      }
    });

    // Clean up the subscription on unmount
    return () => unsubscribe.data?.subscription?.unsubscribe?.();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StackNavigator userId={userId} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
