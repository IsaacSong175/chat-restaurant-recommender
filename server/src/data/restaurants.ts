import type { Restaurant } from "../types.js";

export const restaurants: Omit<Restaurant, "id">[] = [
  {
    name: "Bao Sandwich Bar",
    cuisine: "Vietnamese",
    priceLevel: 2,
    distanceLevel: 1,
    area: "Uptown Waterloo",
    tags: ["cheap", "fast", "comfort"],
    notes: "Quick banh mi, bowls, and casual comfort food."
  },
  {
    name: "Freshii",
    cuisine: "Healthy",
    priceLevel: 2,
    distanceLevel: 1,
    area: "University District",
    tags: ["healthy", "fast", "vegetarian"],
    notes: "Reliable bowls and wraps when health matters."
  },
  {
    name: "Gol's Lanzhou Noodle",
    cuisine: "Chinese",
    priceLevel: 2,
    distanceLevel: 1,
    area: "University Plaza",
    tags: ["comfort", "spicy", "fast"],
    notes: "Hand-pulled noodle soup near campus."
  },
  {
    name: "Mel's Diner",
    cuisine: "Canadian",
    priceLevel: 2,
    distanceLevel: 2,
    area: "Uptown Waterloo",
    tags: ["comfort", "late-night", "breakfast"],
    notes: "Classic diner plates, big portions, late hours."
  },
  {
    name: "The Poke Box",
    cuisine: "Japanese",
    priceLevel: 3,
    distanceLevel: 1,
    area: "University District",
    tags: ["healthy", "fast"],
    notes: "Fresh poke bowls, good when you want lighter food."
  },
  {
    name: "Kim's Kitchen",
    cuisine: "Korean",
    priceLevel: 2,
    distanceLevel: 1,
    area: "University Plaza",
    tags: ["comfort", "spicy", "fast"],
    notes: "Campus-friendly Korean meals and stews."
  },
  {
    name: "Lazeez Shawarma",
    cuisine: "Middle Eastern",
    priceLevel: 2,
    distanceLevel: 1,
    area: "University District",
    tags: ["cheap", "fast", "comfort", "late-night"],
    notes: "Filling wraps and plates with flexible spice levels."
  },
  {
    name: "Copper Branch",
    cuisine: "Vegan",
    priceLevel: 3,
    distanceLevel: 2,
    area: "Uptown Waterloo",
    tags: ["healthy", "vegetarian"],
    notes: "Plant-based bowls, burgers, and smoothies."
  },
  {
    name: "Kenzo Ramen",
    cuisine: "Japanese",
    priceLevel: 3,
    distanceLevel: 2,
    area: "Waterloo",
    tags: ["comfort", "spicy"],
    notes: "Ramen for a warm, low-decision dinner."
  },
  {
    name: "Aunty's Kitchen",
    cuisine: "Indian",
    priceLevel: 2,
    distanceLevel: 2,
    area: "Waterloo",
    tags: ["comfort", "spicy", "vegetarian"],
    notes: "Curries, biryani, and filling vegetarian options."
  },
  {
    name: "iPotato",
    cuisine: "Fast Food",
    priceLevel: 1,
    distanceLevel: 1,
    area: "University Plaza",
    tags: ["cheap", "fast", "comfort"],
    notes: "Very cheap campus snack and meal option."
  },
  {
    name: "White Rabbit",
    cuisine: "Canadian",
    priceLevel: 4,
    distanceLevel: 2,
    area: "Uptown Waterloo",
    tags: ["date-night", "comfort"],
    notes: "More expensive small plates and cocktails."
  }
];
