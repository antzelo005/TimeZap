import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import DashboardScreen from "../screens/DashboardScreen";
import TasksScreen from "../screens/TasksScreen";
import HabitsScreen from "../screens/HabitsScreen";
import CalendarScreen from "../screens/CalendarScreen";
import AccountScreen from "../screens/AccountScreen";
import colors from "../theme/colors";

const AuthStack = createNativeStackNavigator();
const MainTabs = createBottomTabNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainTabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted
      }}
    >
      <MainTabs.Screen name="Dashboard" component={DashboardScreen} />
      <MainTabs.Screen name="Tasks" component={TasksScreen} />
      <MainTabs.Screen name="Habits" component={HabitsScreen} />
      <MainTabs.Screen name="Calendar" component={CalendarScreen} />
      <MainTabs.Screen name="Account" component={AccountScreen} />
    </MainTabs.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <MainNavigator /> : <AuthNavigator />;
}
