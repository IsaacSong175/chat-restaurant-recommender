import { prisma } from "./prisma.js";
import type { Restaurant } from "./types.js";

export async function listRestaurants(): Promise<Restaurant[]> {
  return prisma.restaurant.findMany({
    orderBy: { name: "asc" }
  });
}
