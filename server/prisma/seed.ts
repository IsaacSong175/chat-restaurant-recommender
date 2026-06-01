import { PrismaClient } from "@prisma/client";
import { restaurants } from "../src/data/restaurants.js";

const prisma = new PrismaClient();

async function main() {
  for (const restaurant of restaurants) {
    await prisma.restaurant.upsert({
      where: { name: restaurant.name },
      update: restaurant,
      create: restaurant
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
