export interface CalendarMonthTaskItem {
  task_id: string;
  title: string;
  status: string;
  start_time?: string | null;
  end_time?: string | null;
}

export interface CalendarMonthDateEntry {
  tasks: CalendarMonthTaskItem[];
  habit_logs_completed: number;
}

export interface CalendarMonthResponse {
  year: number;
  month: number;
  dates: Record<string, CalendarMonthDateEntry>;
}

export interface CalendarTaskItem {
  task_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  end_date: string | null;
  due_time: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  is_all_day: boolean;
  completed_at: string | null;
  emoji: string | null;
  color: string | null;
}

export interface CalendarHabitLog {
  habit_id: string;
  completed_count: number;
  target_count_snapshot: number;
  status: string;
}

export interface CalendarHabitItem {
  habit_id: string;
  title: string;
  description: string | null;
  status: string;
  emoji: string | null;
  color: string | null;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  recurrence_type: string | null;
  target_count: number | null;
  target_period?: string | null;
  period_progress?: number | null;
  completed_for_period?: boolean | null;
  period_label?: string | null;
  completed: boolean;
  log: CalendarHabitLog | null;
}

export interface CalendarDayResponse {
  date: string;
  tasks: CalendarTaskItem[];
  habits: CalendarHabitItem[];
}
