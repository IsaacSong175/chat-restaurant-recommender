import { listRestaurants } from "./db.js";
import { prisma } from "./prisma.js";
import type {
  Budget,
  DistancePreference,
  Recommendation,
  RecommendationInput,
  ScoredRestaurant
} from "./types.js";

const budgetToMaxPrice: Record<Budget, number> = {
  under10: 1,
  "10to15": 2,
  "15to20": 3,
  nolimit: 4
};

const distanceToMax: Record<DistancePreference, number> = {
  nearby: 1,
  medium: 2,
  flexible: 3
};

const cuisineAliases = new Map([
  ["中餐", "chinese"],
  ["中国菜", "chinese"],
  ["日料", "japanese"],
  ["日本", "japanese"],
  ["韩餐", "korean"],
  ["韩国", "korean"],
  ["印度", "indian"],
  ["越南", "vietnamese"],
  ["素食", "vegan"],
  ["健康", "healthy"]
]);

export function enrichInput(input: RecommendationInput): RecommendationInput {
  const message = input.message.toLowerCase();
  const avoided = new Set(input.avoidedCuisines.map(normalizeCuisine));
  const wanted = new Set(input.wantedCuisines.map(normalizeCuisine));

  for (const [raw, normalized] of cuisineAliases.entries()) {
    if (message.includes(`不想吃${raw}`) || message.includes(`不要${raw}`)) avoided.add(normalized);
    if (message.includes(`想吃${raw}`)) wanted.add(normalized);
  }

  for (const cuisine of ["chinese", "japanese", "korean", "indian", "vietnamese", "vegan"]) {
    if (message.includes(`no ${cuisine}`) || message.includes(`not ${cuisine}`)) avoided.add(cuisine);
    if (message.includes(cuisine) && !message.includes(`no ${cuisine}`)) wanted.add(cuisine);
  }

  let budget = input.budget;
  if (/(15|十五).*(以内|under|below|less)/i.test(input.message)) budget = "10to15";
  if (/(10|十).*(以内|under|below|less)/i.test(input.message)) budget = "under10";
  if (/(20|二十).*(以内|under|below|less)/i.test(input.message)) budget = "15to20";

  let distance = input.distance;
  if (/(不想走太远|nearby|close|near|近)/i.test(input.message)) distance = "nearby";
  if (/(远一点|flexible|anywhere|都行)/i.test(input.message)) distance = "flexible";

  return {
    ...input,
    budget,
    distance,
    wantedCuisines: [...wanted],
    avoidedCuisines: [...avoided]
  };
}

export async function getRecommendations(
  userId: number,
  rawInput: RecommendationInput
): Promise<Omit<Recommendation, "explanation">[]> {
  const input = enrichInput(rawInput);
  const restaurants = await listRestaurants();
  const feedbackRows = await prisma.feedback.findMany({
    where: { userId },
    select: {
      feedbackType: true,
      restaurantId: true,
      cuisine: true,
      priceLevel: true,
      distanceLevel: true
    }
  });

  const scored = restaurants
    .map((restaurant): ScoredRestaurant => {
      let score = 0;
      const reasons: string[] = [];
      const penalties: string[] = [];
      const maxPrice = budgetToMaxPrice[input.budget];
      const maxDistance = distanceToMax[input.distance];
      const cuisine = normalizeCuisine(restaurant.cuisine);

      if (restaurant.priceLevel <= maxPrice) {
        score += 3;
        reasons.push("fits your budget");
      } else if (restaurant.priceLevel === maxPrice + 1) {
        score -= 1;
        penalties.push("slightly above budget");
      } else {
        score -= 4;
        penalties.push("well above budget");
      }

      if (restaurant.distanceLevel <= maxDistance) {
        score += restaurant.distanceLevel === 1 ? 3 : 1;
        reasons.push("distance works");
      } else {
        score -= 3;
        penalties.push("farther than requested");
      }

      if (input.wantedCuisines.includes(cuisine)) {
        score += 4;
        reasons.push(`matches ${restaurant.cuisine} craving`);
      }
      if (input.avoidedCuisines.includes(cuisine)) {
        score -= 5;
        penalties.push(`you asked to avoid ${restaurant.cuisine}`);
      }

      if (input.health === "healthy" && restaurant.tags.includes("healthy")) {
        score += 2;
        reasons.push("has a healthy tag");
      }
      if (input.health === "comfort" && restaurant.tags.includes("comfort")) {
        score += 2;
        reasons.push("matches comfort food mood");
      }
      if (input.mood === "tired" && restaurant.tags.includes("fast")) {
        score += 1;
        reasons.push("fast option for a low-energy day");
      }
      if (input.mood === "stressed" && restaurant.tags.includes("comfort")) {
        score += 1;
        reasons.push("comforting option for stress");
      }
      if (input.mood === "bored" && !["Chinese", "Canadian", "Fast Food"].includes(restaurant.cuisine)) {
        score += 1;
        reasons.push("less routine cuisine choice");
      }

      for (const feedback of feedbackRows) {
        if (feedback.feedbackType === "ate_this" && normalizeCuisine(feedback.cuisine) === cuisine) score += 2;
        if (feedback.feedbackType === "not_interested" && feedback.restaurantId === restaurant.id) score -= 2;
        if (feedback.feedbackType === "too_expensive" && feedback.priceLevel === restaurant.priceLevel) score -= 2;
        if (feedback.feedbackType === "too_far" && feedback.distanceLevel === restaurant.distanceLevel) score -= 2;
        if (feedback.feedbackType === "dont_like_cuisine" && normalizeCuisine(feedback.cuisine) === cuisine) score -= 3;
      }

      return { ...restaurant, score, reasons, penalties };
    })
    .sort((a, b) => b.score - a.score);

  const used = new Set<number>();
  const safe = pick(scored, used);
  const budget = pick([...scored].sort((a, b) => a.priceLevel - b.priceLevel || b.score - a.score), used);
  const different = pick(
    scored.filter((item) => !input.wantedCuisines.includes(normalizeCuisine(item.cuisine))),
    used
  );

  return [
    { category: "Safe Pick", restaurant: safe },
    { category: "Budget Pick", restaurant: budget },
    { category: "Try Something Different", restaurant: different }
  ];
}

function pick(restaurants: ScoredRestaurant[], used: Set<number>): ScoredRestaurant {
  const selected = restaurants.find((restaurant) => !used.has(restaurant.id)) ?? restaurants[0];
  used.add(selected.id);
  return selected;
}

function normalizeCuisine(value: string) {
  return value.trim().toLowerCase();
}
