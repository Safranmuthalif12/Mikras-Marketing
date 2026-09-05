CREATE TABLE `contact_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'website' NOT NULL,
	`ip_hash` text,
	`consent_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_leads_created_idx` ON `contact_leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `contact_leads_status_created_idx` ON `contact_leads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `contact_leads_email_idx` ON `contact_leads` (`email`);--> statement-breakpoint
CREATE INDEX `contact_leads_ip_created_idx` ON `contact_leads` (`ip_hash`,`created_at`);