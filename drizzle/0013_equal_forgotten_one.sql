CREATE TABLE `clarity_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`eventType` enum('RECEIPT_ACCEPTED','TAMPER_ATTEMPT') NOT NULL,
	`clientHash` varchar(64) NOT NULL,
	`serverHash` varchar(64) NOT NULL,
	`ipAddress` varchar(64),
	CONSTRAINT `clarity_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clarity_audit_events` ADD CONSTRAINT `clarity_audit_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `clarity_audit_events_session_timestamp_idx` ON `clarity_audit_events` (`sessionId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `clarity_audit_events_user_timestamp_idx` ON `clarity_audit_events` (`userId`,`timestamp`);