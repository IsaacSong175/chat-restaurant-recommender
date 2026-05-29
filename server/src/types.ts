export type Budget = "under10" | "10to15" | "15to20" | "nolimit";
export type DistancePreference = "nearby" | "medium" | "flexible";
export type Mood = "tired" | "happy" | "stressed" | "bored";
export type HealthPreference = "healthy" | "normal" | "comfort";
export type FeedbackType =
  | "ate_this"
  | "not_interested"
  | "too_expensive"
  | "too_far"
  | "dont_like_cuisine";

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  priceLevel: number;
  distanceLevel: number;
  area: string;
  tags: string[];
  notes: string;
}

export interface RecommendationInput {
  message: string;
  budget: Budget;
  distance: DistancePreference;
  mood: Mood;
  health: HealthPreference;
  wantedCuisines: string[];
  avoidedCuisines: string[];
}

export interface ScoredRestaurant extends Restaurant {
  score: number;
  reasons: string[];
  penalties: string[];
}

export interface Recommendation {
  category: "Safe Pick" | "Budget Pick" | "Try Something Different";
  restaurant: ScoredRestaurant;
  explanation: string;
}
