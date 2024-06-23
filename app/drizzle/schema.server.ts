import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey(),
  user_id: text("user_id"),
  date: text("date"),
  dailyProfitLoss: integer("dailyProfitLoss").notNull(),
  winRate: text("winRate").notNull(),
  averageProfitLoss: integer("averageProfitLoss").notNull(),
  largestProfit: integer("largestProfit").notNull(),
  largestLoss: integer("largestLoss").notNull(),
  trades: blob("trades").notNull(),
});

// Auth
export const Users = sqliteTable("Users", {
  id: text("id").primaryKey().notNull(),
  username: text("username").notNull(),
  password: text("password"),
  github_id: text("github_id"),
  google_id: text("google_id"),
  email: text("email"),
  avatar_url: text("avatar_url"),
  auth_token: text("auth_token"),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  expires_at: integer("expires_at").notNull(),
});

// Waitlist
export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey(),
  email: text("email").notNull(),
});
