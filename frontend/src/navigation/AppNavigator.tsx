import React from "react";
import { Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import TasksScreen from "../screens/TasksScreen";
import HabitsScreen from "../screens/HabitsScreen";
import CalendarScreen from "../screens/CalendarScreen";
import AccountScreen from "../screens/AccountScreen";
import { useAppTheme } from "../theme/useAppTheme";
import type { AuthStackParamList, MainTabParamList } from "../types/navigation";
import { useTranslation } from "../i18n";
import type { DefaultView } from "../types/settings";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();

interface TitleWithZapProps {
  title: string;
}

function TitleWithZap({ title }: TitleWithZapProps) {
  const { colors } = useAppTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.zapYellowSoft,
          borderWidth: 1,
          borderColor: colors.zapYellow
        }}
      >
        <Text style={{ color: colors.primaryBlueDark, fontSize: 12, fontWeight: "800" }}>⚡</Text>
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

interface TabIconProps {
  icon: string;
  color: string;
}

function TabIcon({ icon, color }: TabIconProps) {
  return <Text style={{ fontSize: 16, color }}>{icon}</Text>;
}

function AuthNavigator() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          color: colors.textPrimary,
          fontWeight: "700"
        },
        contentStyle: {
          backgroundColor: colors.appBackground
        }
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerTitle: () => <TitleWithZap title={t("common.appName")} /> }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerTitle: () => <TitleWithZap title={t("register.title")} /> }}
      />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { settings } = useSettings();

  const initialRouteMap: Record<DefaultView, keyof MainTabParamList> = {
    dashboard: "Dashboard",
    tasks: "Tasks",
    habits: "Habits",
    calendar: "Calendar",
    account: "Account"
  };

  return (
    <MainTabs.Navigator
      key={settings.default_view}
      initialRouteName={initialRouteMap[settings.default_view]}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          color: colors.textPrimary,
          fontWeight: "700"
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarActiveTintColor: colors.primaryBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600"
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 4,
          marginVertical: 4
        },
        tabBarIconStyle: {
          marginBottom: 2
        }
      }}
    >
      <MainTabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t("tabs.dashboard"),
          tabBarLabel: t("tabs.dashboard"),
          tabBarIcon: ({ color }) => <TabIcon icon="⚡" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: t("tabs.tasks"),
          tabBarLabel: t("tabs.tasks"),
          tabBarIcon: ({ color }) => <TabIcon icon="✓" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          title: t("tabs.habits"),
          tabBarLabel: t("tabs.habits"),
          tabBarIcon: ({ color }) => <TabIcon icon="🔁" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: t("tabs.calendar"),
          tabBarLabel: t("tabs.calendar"),
          tabBarIcon: ({ color }) => <TabIcon icon="📅" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: t("tabs.account"),
          tabBarLabel: t("tabs.account"),
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />
        }}
      />
    </MainTabs.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}
