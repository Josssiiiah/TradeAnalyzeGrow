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
