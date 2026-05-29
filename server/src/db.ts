import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { restaurants } from "./data/restaurants.js";
import type { Restaurant } from "./types.js";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cuisine TEXT NOT NULL,
      price_level INTEGER NOT NULL,
      distance_level INTEGER NOT NULL,
      area TEXT NOT NULL,
      tags TEXT NOT NULL,
      notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recommendation_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      input_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      restaurant_id INTEGER NOT NULL,
      session_id INTEGER,
      feedback_type TEXT NOT NULL,
      cuisine TEXT NOT NULL,
      price_level INTEGER NOT NULL,
      distance_level INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
    );
  `);

  const count = db.prepare("SELECT COUNT(*) as count FROM restaurants").get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare(`
      INSERT INTO restaurants (name, cuisine, price_level, distance_level, area, tags, notes)
      VALUES (@name, @cuisine, @priceLevel, @distanceLevel, @area, @tags, @notes)
    `);
    const seed = db.transaction(() => {
      for (const restaurant of restaurants) {
        insert.run({ ...restaurant, tags: JSON.stringify(restaurant.tags) });
      }
    });
    seed();
  }
}

export function listRestaurants(): Restaurant[] {
  const rows = db.prepare("SELECT * FROM restaurants ORDER BY name").all() as Array<{
    id: number;
    name: string;
    cuisine: string;
    price_level: number;
    distance_level: number;
    area: string;
    tags: string;
    notes: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    cuisine: row.cuisine,
    priceLevel: row.price_level,
    distanceLevel: row.distance_level,
    area: row.area,
    tags: JSON.parse(row.tags) as string[],
    notes: row.notes
  }));
}
