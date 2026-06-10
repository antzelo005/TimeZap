import React, { useCallback, useEffect } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./navigation/AppNavigator";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { notifyNotificationsChanged } from "./services/appEvents";
import { syncNotificationSchedules } from "./services/notifications";
import { useAppTheme } from "./theme/useAppTheme";

function AppContent() {
  const { isAuthenticated, isBootstrapping, user } = useAuth();
  const { settings } = useSettings();
  const { colors, isDark } = useAppTheme();

  const reconcileNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    await syncNotificationSchedules(user.user_id, undefined, settings.notifications_enabled).catch(() => undefined);
    notifyNotificationsChanged();
  }, [isAuthenticated, settings.notifications_enabled, user]);

  useEffect(() => {
    void reconcileNotifications();
  }, [reconcileNotifications]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reconcileNotifications();
      }
    });

    return () => subscription.remove();
  }, [reconcileNotifications]);

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.appBackground,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primaryBlue
    }
  };

  if (isBootstrapping) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.appBackground
        }}
      >
        <ActivityIndicator size="large" color={colors.primaryBlue} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
