export interface DashboardTaskItem {
  task_id: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  end_date?: string | null;
  due_time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status: string;
  is_all_day?: boolean;
  completed_at?: string | null;
  emoji?: string | null;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardHabitItem {
  habit_id: string;
  title: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string;
  emoji?: string | null;
  color?: string | null;
  recurrence_type?: string | null;
  target_count?: number | null;
  completed_today: boolean;
}

export interface DashboardTodayResponse {
  date: string;
  tasks: {
    completed: number;
    total: number;
    items: DashboardTaskItem[];
  };
  habits: {
    completed: number;
    total: number;
    items: DashboardHabitItem[];
  };
  current_streak: number;
}
