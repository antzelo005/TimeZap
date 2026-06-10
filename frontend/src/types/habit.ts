export interface HabitRuleDay {
  rule_day_id?: string;
  day_of_week: number | null;
  day_of_month: number | null;
}

export type HabitRecurrenceType =
  | "daily"
  | "specific_weekdays"
  | "every_n_days"
  | "x_times_per_week"
  | "x_times_per_month";

export type HabitStatus = "active" | "archived";

export interface HabitRule {
  rule_id: string;
  recurrence_type: HabitRecurrenceType;
  interval_value: number;
  target_count: number;
  target_period: string | null;
  week_start: "monday" | "sunday";
  is_active: boolean;
  days: HabitRuleDay[];
}

export interface Habit {
  habit_id: string;
  user_id: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status: HabitStatus;
  emoji?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
  rule: HabitRule | null;
}

export interface HabitListResponse {
  items: Habit[];
}

export interface HabitResponse {
  message: string;
  habit: Habit;
}

export interface HabitLog {
  habit_log_id: string;
  habit_id: string;
  user_id: string;
  log_date: string;
  completed_count: number;
  target_count_snapshot: number;
  status: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface HabitLogResponse {
  message: string;
  log: HabitLog;
}

export interface HabitStreakResponse {
  habit_id: string;
  current_streak: number;
}

export interface HabitDeleteResponse {
  message: string;
}

export interface CreateHabitPayload {
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: HabitStatus;
  emoji?: string | null;
  color?: string | null;
  rule: {
    recurrence_type: HabitRecurrenceType;
    interval_value: number;
    target_count: number;
    target_period: string | null;
    week_start: "monday" | "sunday";
    days: HabitRuleDay[];
  };
}

export type UpdateHabitPayload = CreateHabitPayload;
