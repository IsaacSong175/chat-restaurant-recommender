import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { addExplanations } from "./ai.js";
import { requireAuth, signToken, type AuthRequest } from "./auth.js";
import { config } from "./config.js";
import { listRestaurants } from "./db.js";
import { prisma } from "./prisma.js";
import { enrichInput, getRecommendations } from "./scoring.js";
import type { FeedbackType } from "./types.js";

const app = express();
app.use(cors({ origin: config.clientOrigin ?? true }));
app.use(express.json());

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const recommendationSchema = z.object({
  message: z.string().default(""),
  budget: z.enum(["under10", "10to15", "15to20", "nolimit"]).default("10to15"),
  distance: z.enum(["nearby", "medium", "flexible"]).default("nearby"),
  mood: z.enum(["tired", "happy", "stressed", "bored"]).default("tired"),
  health: z.enum(["healthy", "normal", "comfort"]).default("normal"),
  wantedCuisines: z.array(z.string()).default([]),
  avoidedCuisines: z.array(z.string()).default([])
});

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ cuisine: key, count }))
    .sort((left, right) => right.count - left.count || left.cuisine.localeCompare(right.cuisine));
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        passwordHash
      }
    });
    res.status(201).json({ token: signToken(user.id), email: user.email });
  } catch {
    res.status(409).json({ error: "Email already registered" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() }
  });

  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ token: signToken(user.id), email: user.email });
});

app.get("/api/me", requireAuth, (req: AuthRequest, res) => {
  prisma.user
    .findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, createdAt: true }
    })
    .then((user) => {
      res.json({
        user: user ? { id: user.id, email: user.email, created_at: user.createdAt } : undefined
      });
    });
});

app.get("/api/restaurants", requireAuth, async (_req, res) => {
  res.json({ restaurants: await listRestaurants() });
});

app.post("/api/recommendations", requireAuth, async (req: AuthRequest, res) => {
  const parsed = recommendationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const input = enrichInput(parsed.data);
  const ranked = await getRecommendations(req.userId!, input);
  const recommendations = await addExplanations(input, ranked);
  const result = await prisma.recommendationSession.create({
    data: {
      userId: req.userId!,
      inputJson: toPrismaJson(input),
      resultJson: toPrismaJson(recommendations)
    }
  });

  res.json({ sessionId: result.id, input, recommendations });
});

app.get("/api/history", requireAuth, async (req: AuthRequest, res) => {
  const sessions = await prisma.recommendationSession.findMany({
    where: { userId: req.userId },
    orderBy: { id: "desc" },
    take: 20,
    include: {
      feedback: {
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        select: {
          restaurantId: true,
          feedbackType: true,
          createdAt: true
        }
      }
    }
  });
  res.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      input: session.inputJson,
      recommendations: session.resultJson,
      createdAt: session.createdAt.toISOString(),
      feedback: session.feedback.map((feedback) => ({
        restaurantId: feedback.restaurantId,
        feedbackType: feedback.feedbackType,
        createdAt: feedback.createdAt.toISOString()
      }))
    }))
  });
});

app.get("/api/preferences", requireAuth, async (req: AuthRequest, res) => {
  const feedback = await prisma.feedback.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    select: {
      feedbackType: true,
      cuisine: true,
      priceLevel: true,
      distanceLevel: true,
      createdAt: true
    }
  });

  const positiveFeedback = feedback.filter((item) => item.feedbackType === "ate_this");
  const avoidedCuisineFeedback = feedback.filter(
    (item) => item.feedbackType === "dont_like_cuisine" || item.feedbackType === "not_interested"
  );
  const expensiveFeedback = feedback.filter((item) => item.feedbackType === "too_expensive");
  const farFeedback = feedback.filter((item) => item.feedbackType === "too_far");

  res.json({
    totalFeedbackCount: feedback.length,
    positiveCount: positiveFeedback.length,
    negativeCount: feedback.length - positiveFeedback.length,
    likedCuisines: countBy(positiveFeedback, (item) => item.cuisine),
    avoidedCuisines: countBy(avoidedCuisineFeedback, (item) => item.cuisine),
    priceSensitivity: {
      tooExpensiveCount: expensiveFeedback.length,
      affectedPriceLevels: uniqueSorted(expensiveFeedback.map((item) => item.priceLevel))
    },
    distanceSensitivity: {
      tooFarCount: farFeedback.length,
      affectedDistanceLevels: uniqueSorted(farFeedback.map((item) => item.distanceLevel))
    },
    lastUpdatedAt: feedback[0]?.createdAt.toISOString() ?? null
  });
});

app.post("/api/feedback", requireAuth, async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      restaurantId: z.number(),
      sessionId: z.number().optional(),
      feedbackType: z.enum(["ate_this", "not_interested", "too_expensive", "too_far", "dont_like_cuisine"])
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const restaurant = (await listRestaurants()).find((item) => item.id === parsed.data.restaurantId);
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  await prisma.feedback.create({
    data: {
      userId: req.userId!,
      restaurantId: restaurant.id,
      sessionId: parsed.data.sessionId ?? null,
      feedbackType: parsed.data.feedbackType satisfies FeedbackType,
      cuisine: restaurant.cuisine,
      priceLevel: restaurant.priceLevel,
      distanceLevel: restaurant.distanceLevel
    }
  });

  res.status(201).json({ ok: true });
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
