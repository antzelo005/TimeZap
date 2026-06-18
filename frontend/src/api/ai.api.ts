import type { AISuggestionsRequest, AISuggestionsResponse } from "../types/ai";
import { apiClient } from "./client";

export function generateAISuggestions(payload: AISuggestionsRequest): Promise<AISuggestionsResponse> {
  return apiClient.post<AISuggestionsResponse>("/ai/suggestions", payload);
}
