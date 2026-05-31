import type { CalendarDayResponse, CalendarMonthResponse } from "../types/calendar";
import { apiClient } from "./client";

export function getCalendarMonth(year: number, month: number): Promise<CalendarMonthResponse> {
  return apiClient.get<CalendarMonthResponse>(`/calendar/month?year=${year}&month=${month}`);
}

export function getCalendarDay(date: string): Promise<CalendarDayResponse> {
  return apiClient.get<CalendarDayResponse>(`/calendar/day?date=${date}`);
}
