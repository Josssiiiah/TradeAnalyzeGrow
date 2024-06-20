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
