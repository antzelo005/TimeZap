import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationBell from "../components/NotificationBell";
import StreakBadge from "../components/StreakBadge";
import TimeZapIcon, { type TimeZapIconName } from "../components/icons/TimeZapIcon";
import { getDashboardToday } from "../api/dashboard.api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { subscribeDashboardChanged } from "../services/appEvents";
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
import type { DashboardTodayResponse } from "../types/dashboard";

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
        <TimeZapIcon name="zap" size={15} color={colors.warning} secondaryColor={colors.zapYellow} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: "700" }}>{title}</Text>
    </View>
  );
}

interface TabIconProps {
  icon: TimeZapIconName;
  color: string;
}

function TabIcon({ icon, color }: TabIconProps) {
  return <TimeZapIcon name={icon} size={21} color={color} secondaryColor={color} strokeWidth={2.2} />;
}

function HeaderStatus() {
  const { width } = useWindowDimensions();
  const { colors, spacing } = useAppTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => createHeaderStyles(colors, spacing), [colors, spacing]);
  const [today, setToday] = React.useState<DashboardTodayResponse | null>(null);
  const isCompact = width < 390;

  const loadToday = React.useCallback(async () => {
    try {
      const response = await getDashboardToday();
      setToday(response);
    } catch {
      setToday(null);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadToday();
    }, [loadToday])
  );

  React.useEffect(() => subscribeDashboardChanged(() => void loadToday()), [loadToday]);

  const streak = today?.current_streak ?? 0;
  const tasksLabel = today
    ? isCompact
      ? `${today.tasks.completed}/${today.tasks.total}`
      : t("dashboard.topTasks", { completed: today.tasks.completed, total: today.tasks.total })
    : isCompact
      ? "-/-"
      : t("dashboard.topTasks", { completed: 0, total: 0 });
  const habitsLabel = today
    ? isCompact
      ? `${today.habits.completed}/${today.habits.total}`
      : t("dashboard.topHabits", { completed: today.habits.completed, total: today.habits.total })
    : isCompact
      ? "-/-"
      : t("dashboard.topHabits", { completed: 0, total: 0 });

  return (
    <View style={styles.row}>
      <View style={styles.summaryWrap}>
        <Text style={styles.summaryChip}>
          {tasksLabel}
        </Text>
        <Text style={styles.summaryChip}>
          {habitsLabel}
        </Text>
      </View>
      <StreakBadge count={streak} compact />
      <NotificationBell />
    </View>
  );
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
  const insets = useSafeAreaInsets();

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
        headerRight: () => <HeaderStatus />,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 76 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10
        },
        tabBarActiveTintColor: colors.primaryBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "700",
          paddingBottom: 2
        },
        tabBarItemStyle: {
          minHeight: 56,
          borderRadius: 8,
          marginHorizontal: 4,
          marginVertical: 3
        },
        tabBarIconStyle: {
          marginBottom: 1
        },
        tabBarHideOnKeyboard: true
      }}
    >
      <MainTabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: t("tabs.dashboard"),
          tabBarLabel: t("tabs.dashboard"),
          tabBarIcon: ({ color }) => <TabIcon icon="zap" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Tasks"
        component={TasksScreen}
        options={{
          title: t("tabs.tasks"),
          tabBarLabel: t("tabs.tasks"),
          tabBarIcon: ({ color }) => <TabIcon icon="task" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Habits"
        component={HabitsScreen}
        options={{
          title: t("tabs.habits"),
          tabBarLabel: t("tabs.habits"),
          tabBarIcon: ({ color }) => <TabIcon icon="habit" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: t("tabs.calendar"),
          tabBarLabel: t("tabs.calendar"),
          tabBarIcon: ({ color }) => <TabIcon icon="calendar" color={color} />
        }}
      />
      <MainTabs.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: t("tabs.account"),
          tabBarLabel: t("tabs.account"),
          tabBarIcon: ({ color }) => <TabIcon icon="account" color={color} />
        }}
      />
    </MainTabs.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}

function createHeaderStyles(
  colors: ReturnType<typeof useAppTheme>["colors"],
  spacing: ReturnType<typeof useAppTheme>["spacing"]
) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6
    },
    summaryWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4
    },
    summaryChip: {
      maxWidth: 96,
      borderRadius: 999,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "800",
      paddingHorizontal: spacing.sm,
      paddingVertical: 5
    },
  });
}
