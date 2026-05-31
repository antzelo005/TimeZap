export interface Task {
  task_id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  status: "pending" | "completed" | "cancelled";
  is_all_day: boolean;
  completed_at: string | null;
  emoji?: string | null;
  color?: string | null;
  created_at: string;
  updated_at: string;
  is_overdue: boolean;
}

export interface TaskListResponse {
  items: Task[];
}

export interface TaskResponse {
  message: string;
  task: Task;
}

export interface CreateTaskPayload {
  title: string;
  due_date: string | null;
  due_time: string | null;
  is_all_day: boolean;
}
