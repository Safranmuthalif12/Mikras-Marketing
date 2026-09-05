CREATE TABLE `admin_accounts` (
	`email` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT 'MIKRAS Admin' NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`recovery_email` text NOT NULL,
	`notification_email` text NOT NULL,
	`notifications_enabled` integer DEFAULT true NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`session_version` integer DEFAULT 1 NOT NULL,
	`password_changed_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `admin_notes_pinned_updated_idx` ON `admin_notes` (`pinned`,`updated_at`);--> statement-breakpoint
CREATE TABLE `admin_password_resets` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`admin_email`) REFERENCES `admin_accounts`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_password_resets_email_idx` ON `admin_password_resets` (`admin_email`);--> statement-breakpoint
CREATE INDEX `admin_password_resets_expires_idx` ON `admin_password_resets` (`expires_at`);--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`admin_email` text NOT NULL,
	`session_version` integer NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`admin_email`) REFERENCES `admin_accounts`(`email`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `admin_sessions_email_idx` ON `admin_sessions` (`admin_email`);--> statement-breakpoint
CREATE INDEX `admin_sessions_expires_idx` ON `admin_sessions` (`expires_at`);