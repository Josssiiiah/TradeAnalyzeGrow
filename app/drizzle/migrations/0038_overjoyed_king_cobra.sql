CREATE TABLE `Users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password` text,
	`github_id` text,
	`google_id` text,
	`email` text,
	`avatar_url` text,
	`auth_token` text
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`href` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text,
	`category` text,
	`description` text,
	`image_url` text
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` text,
	`date` text,
	`dailyProfitLoss` integer NOT NULL,
	`winRate` text NOT NULL,
	`averageProfitLoss` integer NOT NULL,
	`largestProfit` integer NOT NULL,
	`largestLoss` integer NOT NULL,
	`trades` blob NOT NULL
);
