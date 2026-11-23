CREATE TABLE `clarity_truth_ledger_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL,
	`premiseBroken` text NOT NULL,
	`boundedAction` text NOT NULL,
	`constraint` text NOT NULL,
	`verificationGate` text NOT NULL,
	`canonicalPayload` text NOT NULL,
	`hash` varchar(64) NOT NULL,
	`status` enum('PENDING','VERIFIED','FAILED') NOT NULL DEFAULT 'PENDING',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clarity_truth_ledger_sessionId_pk` PRIMARY KEY(`sessionId`) NONCLUSTERED,
	CONSTRAINT `clarity_truth_ledger_id_unique` UNIQUE(`id`),
	CONSTRAINT `clarity_truth_ledger_hash_unique` UNIQUE(`hash`)
);
--> statement-breakpoint
ALTER TABLE `clarity_truth_ledger_v2` ADD CONSTRAINT `clarity_truth_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `clarity_truth_ledger_user_created_idx` ON `clarity_truth_ledger_v2` (`userId`,`createdAt`);
--> statement-breakpoint
INSERT INTO `clarity_truth_ledger_v2` (`id`,`userId`,`sessionId`,`timestamp`,`premiseBroken`,`boundedAction`,`constraint`,`verificationGate`,`canonicalPayload`,`hash`,`status`,`createdAt`)
SELECT `id`,`userId`,`sessionId`,`timestamp`,`premiseBroken`,`boundedAction`,`constraint`,`verificationGate`,`canonicalPayload`,`hash`,`status`,`createdAt`
FROM `clarity_truth_ledger`;
--> statement-breakpoint
RENAME TABLE `clarity_truth_ledger` TO `clarity_truth_ledger_legacy_20261018`, `clarity_truth_ledger_v2` TO `clarity_truth_ledger`;
