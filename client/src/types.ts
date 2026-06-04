export type Budget = "under10" | "10to15" | "15to20" | "nolimit";
export type DistancePreference = "nearby" | "medium" | "flexible";
export type Mood = "tired" | "happy" | "stressed" | "bored";
export type HealthPreference = "healthy" | "normal" | "comfort";
export type FeedbackType = "ate_this" | "not_interested" | "too_expensive" | "too_far" | "dont_like_cuisine";

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

export interface HistoryFeedback {
  restaurantId: number;
  feedbackType: FeedbackType;
  createdAt: string;
}

export interface HistorySession {
  id: number;
  input: {
    message?: string;
    budget?: Budget;
    distance?: DistancePreference;
    mood?: Mood;
    health?: HealthPreference;
  };
  recommendations: Recommendation[];
  createdAt: string;
  feedback: HistoryFeedback[];
}

export interface CuisineCount {
  cuisine: string;
  count: number;
}

export interface LearnedPreferences {
  totalFeedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  likedCuisines: CuisineCount[];
  avoidedCuisines: CuisineCount[];
  priceSensitivity: {
    tooExpensiveCount: number;
    affectedPriceLevels: number[];
  };
  distanceSensitivity: {
    tooFarCount: number;
    affectedDistanceLevels: number[];
  };
  lastUpdatedAt: string | null;
}
