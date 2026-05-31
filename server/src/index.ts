import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { addExplanations } from "./ai.js";
import { requireAuth, signToken, type AuthRequest } from "./auth.js";
import { config } from "./config.js";
import { db, initDb, listRestaurants } from "./db.js";
import { enrichInput, getRecommendations } from "./scoring.js";
import type { FeedbackType } from "./types.js";

initDb();

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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const result = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(parsed.data.email.toLowerCase(), passwordHash);
    res.status(201).json({ token: signToken(Number(result.lastInsertRowid)), email: parsed.data.email.toLowerCase() });
  } catch {
    res.status(409).json({ error: "Email already registered" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = authSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(parsed.data.email.toLowerCase()) as { id: number; email: string; password_hash: string } | undefined;

  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  res.json({ token: signToken(user.id), email: user.email });
});

app.get("/api/me", requireAuth, (req: AuthRequest, res) => {
  const user = db.prepare("SELECT id, email, created_at FROM users WHERE id = ?").get(req.userId) as
    | { id: number; email: string; created_at: string }
    | undefined;
  res.json({ user });
});

app.get("/api/restaurants", requireAuth, (_req, res) => {
  res.json({ restaurants: listRestaurants() });
});

app.post("/api/recommendations", requireAuth, async (req: AuthRequest, res) => {
  const parsed = recommendationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const input = enrichInput(parsed.data);
  const ranked = getRecommendations(req.userId!, input);
  const recommendations = await addExplanations(input, ranked);
  const result = db
    .prepare("INSERT INTO recommendation_sessions (user_id, input_json, result_json) VALUES (?, ?, ?)")
    .run(req.userId, JSON.stringify(input), JSON.stringify(recommendations));

  res.json({ sessionId: Number(result.lastInsertRowid), input, recommendations });
});

app.get("/api/history", requireAuth, (req: AuthRequest, res) => {
  const sessions = db
    .prepare("SELECT id, input_json, result_json, created_at FROM recommendation_sessions WHERE user_id = ? ORDER BY id DESC LIMIT 20")
    .all(req.userId) as Array<{ id: number; input_json: string; result_json: string; created_at: string }>;
  res.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      input: JSON.parse(session.input_json),
      recommendations: JSON.parse(session.result_json),
      createdAt: session.created_at
    }))
  });
});

app.post("/api/feedback", requireAuth, (req: AuthRequest, res) => {
  const parsed = z
    .object({
      restaurantId: z.number(),
      sessionId: z.number().optional(),
      feedbackType: z.enum(["ate_this", "not_interested", "too_expensive", "too_far", "dont_like_cuisine"])
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const restaurant = listRestaurants().find((item) => item.id === parsed.data.restaurantId);
  if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

  db.prepare(
    `INSERT INTO feedback (user_id, restaurant_id, session_id, feedback_type, cuisine, price_level, distance_level)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    req.userId,
    restaurant.id,
    parsed.data.sessionId ?? null,
    parsed.data.feedbackType satisfies FeedbackType,
    restaurant.cuisine,
    restaurant.priceLevel,
    restaurant.distanceLevel
  );

  res.status(201).json({ ok: true });
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
