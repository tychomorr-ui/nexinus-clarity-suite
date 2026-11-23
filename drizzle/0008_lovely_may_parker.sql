CREATE TABLE `private_oauth_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`handle` varchar(80) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `private_oauth_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `private_oauth_accounts_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `private_oauth_accounts_handle_unique` UNIQUE(`handle`)
);
--> statement-breakpoint
CREATE TABLE `private_oauth_codes` (
	`codeHash` varchar(128) NOT NULL,
	`accountId` int NOT NULL,
	`redirectUri` varchar(512) NOT NULL,
	`codeChallenge` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `private_oauth_codes_codeHash` PRIMARY KEY(`codeHash`)
);
--> statement-breakpoint
ALTER TABLE `private_oauth_accounts` ADD CONSTRAINT `private_oauth_accounts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `private_oauth_codes` ADD CONSTRAINT `private_oauth_codes_accountId_private_oauth_accounts_id_fk` FOREIGN KEY (`accountId`) REFERENCES `private_oauth_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `private_oauth_codes_expires_idx` ON `private_oauth_codes` (`expiresAt`);