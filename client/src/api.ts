import type { Budget, DistancePreference, FeedbackType, HealthPreference, Mood, Recommendation } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface RecommendationRequest {
  message: string;
  budget: Budget;
  distance: DistancePreference;
  mood: Mood;
  health: HealthPreference;
  wantedCuisines: string[];
  avoidedCuisines: string[];
}

export async function request<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error.error ?? "Request failed");
  }

  return (await response.json()) as T;
}

export function login(email: string, password: string) {
  return request<{ token: string; email: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function register(email: string, password: string) {
  return request<{ token: string; email: string }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function getRecommendations(payload: RecommendationRequest) {
  return request<{ sessionId: number; recommendations: Recommendation[] }>("/api/recommendations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function sendFeedback(restaurantId: number, sessionId: number, feedbackType: FeedbackType) {
  return request<{ ok: true }>("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ restaurantId, sessionId, feedbackType })
  });
}
