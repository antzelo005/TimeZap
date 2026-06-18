export type AISuggestionLanguage = "en" | "el" | "ro";
export type AISuggestionFocus = "study" | "work" | "health" | "personal" | "general";
export type AISuggestionDateHint = "today" | "tomorrow" | "this_week" | "none";
export type AISuggestionPriority = "low" | "medium" | "high";
export type AISuggestionHabitRecurrence = "daily" | "specific_weekdays" | "x_times_per_week";
export type AISuggestionHabitTargetPeriod = "day" | "week";

export interface AISuggestedTask {
  title: string;
  description: string;
  date_hint: AISuggestionDateHint;
  estimated_duration_minutes: number;
  priority: AISuggestionPriority;
  icon: string;
  color: string;
}

export interface AISuggestedHabit {
  title: string;
  description: string;
  recurrence_type: AISuggestionHabitRecurrence;
  target_count: number;
  target_period: AISuggestionHabitTargetPeriod;
  icon: string;
  color: string;
}

export interface AISuggestions {
  tasks: AISuggestedTask[];
  habits: AISuggestedHabit[];
  notes: string;
}

export interface AISuggestionsRequest {
  prompt: string;
  language?: AISuggestionLanguage;
  focus?: AISuggestionFocus;
}

export interface AISuggestionsResponse {
  suggestions: AISuggestions;
}
