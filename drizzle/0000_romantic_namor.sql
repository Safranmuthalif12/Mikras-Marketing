CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`photo_key` text,
	`email` text DEFAULT '' NOT NULL,
	`instagram` text DEFAULT '' NOT NULL,
	`linkedin` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `packages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`price_note` text DEFAULT '/ project' NOT NULL,
	`features` text DEFAULT '[]' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`client_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`satisfaction` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stat_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`manual_value` integer DEFAULT 0 NOT NULL,
	`suffix` text DEFAULT '+' NOT NULL,
	`auto_mode` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
