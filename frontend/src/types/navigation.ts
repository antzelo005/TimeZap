export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Tasks: { selectedDate?: string } | undefined;
  Habits: { selectedDate?: string } | undefined;
  Calendar: { selectedDate?: string } | undefined;
  Account: undefined;
};
