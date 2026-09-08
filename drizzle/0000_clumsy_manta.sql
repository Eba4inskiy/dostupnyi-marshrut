CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`lat` real NOT NULL,
	`lng` real NOT NULL,
	`role` text NOT NULL,
	`actor` text NOT NULL,
	`photo_key` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_created_at` ON `reports` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_reports_actor_created` ON `reports` (`actor`,`created_at`);--> statement-breakpoint
CREATE TABLE `votes` (
	`report_id` text NOT NULL,
	`actor` text NOT NULL,
	`vote` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`report_id`, `actor`),
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
