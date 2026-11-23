CREATE TABLE `product_work_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productKey` enum('clarity','ged_tutor','hidden_gems','pd_pro','recovery','task_force_pro','sitrep','wraith') NOT NULL,
	`kind` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`details` text,
	`status` enum('active','complete','archived') NOT NULL DEFAULT 'active',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_work_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `product_work_items` ADD CONSTRAINT `product_work_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_work_items_user_product_status_idx` ON `product_work_items` (`userId`,`productKey`,`status`);--> statement-breakpoint
CREATE INDEX `product_work_items_user_created_idx` ON `product_work_items` (`userId`,`createdAt`);