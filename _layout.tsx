import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";
import { ThemeProvider, useTheme } from "@/contexts/theme";
import { ActivityIndicator, View } from "react-native";
import Colors from "@/constants/colors";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  // Track the last navigated target to avoid re-redirecting within a section
  const lastTargetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const target = !user
      ? "/(auth)/login"
      : user.role === "admin"
        ? "/(admin)"
        : user.role === "vendor"
          ? "/(vendor)"
          : "/(shop)";
    // Only navigate if the destination section changed (prevents sub-screen redirects)
    if (lastTargetRef.current !== target) {
      lastTargetRef.current = target;
      router.replace(target as never);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(shop)" />
        <Stack.Screen name="(vendor)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="product/[id]" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="checkout" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="notifications" options={{ headerShown: false, presentation: "card" }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ThemeProvider>
              <AuthProvider>
                <CartProvider>
                  <RootLayoutNav />
                </CartProvider>
              </AuthProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
