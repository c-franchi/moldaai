CREATE TABLE `studio_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `studio_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_assets_object_key_unique` ON `studio_assets` (`object_key`);--> statement-breakpoint
CREATE TABLE `studio_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`theme` text DEFAULT '' NOT NULL,
	`source_note` text DEFAULT '' NOT NULL,
	`document_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`source_revision` integer NOT NULL,
	`title` text NOT NULL,
	`theme` text NOT NULL,
	`source_note` text NOT NULL,
	`document_json` text NOT NULL,
	`validation_note` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `studio_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_template_revision` ON `studio_versions` (`template_id`,`source_revision`);