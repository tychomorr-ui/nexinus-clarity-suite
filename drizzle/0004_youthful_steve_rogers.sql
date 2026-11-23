CREATE TABLE `organization_members` (
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organization_members_organizationId_userId_pk` PRIMARY KEY(`organizationId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`billingEmail` varchar(320),
	`stripeCustomerId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`)
);
--> statement-breakpoint
CREATE TABLE `product_entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productKey` enum('clarity','ged_tutor','hidden_gems','pd_pro','recovery','task_force_pro','sitrep','wraith') NOT NULL,
	`userId` int,
	`organizationId` int,
	`payerType` enum('individual','organization','sponsored','free') NOT NULL,
	`source` enum('stripe','grant','recovery_access','admin') NOT NULL,
	`status` enum('active','trialing','past_due','canceled','expired') NOT NULL DEFAULT 'active',
	`stripeSubscriptionId` varchar(128),
	`stripePriceId` varchar(128),
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`endsAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_entitlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reflective_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`northStar` text,
	`preferences` text,
	`sharedAcrossProducts` boolean NOT NULL DEFAULT true,
	`enabledProducts` json,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reflective_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `reflective_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_entitlements` ADD CONSTRAINT `product_entitlements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_entitlements` ADD CONSTRAINT `product_entitlements_organizationId_organizations_id_fk` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reflective_profiles` ADD CONSTRAINT `reflective_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `organization_members_user_idx` ON `organization_members` (`userId`);--> statement-breakpoint
CREATE INDEX `product_entitlements_user_product_idx` ON `product_entitlements` (`userId`,`productKey`,`status`);--> statement-breakpoint
CREATE INDEX `product_entitlements_org_product_idx` ON `product_entitlements` (`organizationId`,`productKey`,`status`);--> statement-breakpoint
CREATE INDEX `product_entitlements_subscription_idx` ON `product_entitlements` (`stripeSubscriptionId`);