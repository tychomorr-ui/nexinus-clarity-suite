CREATE TABLE `auth_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`email` varchar(320),
	`kind` varchar(64) NOT NULL,
	`ip` varchar(128),
	`userAgent` varchar(256),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clarity_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`conversationId` int,
	`resistance` int NOT NULL DEFAULT 0,
	`currentState` enum('ALCHEMY','RESPOND','LIGHT_WARRIOR'),
	`thresholds` json,
	`turnCount` int NOT NULL DEFAULT 0,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clarity_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `clarity_sessions_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `clarity_trace_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`turn` int NOT NULL,
	`state` enum('ALCHEMY','RESPOND','LIGHT_WARRIOR') NOT NULL,
	`resistance` int NOT NULL,
	`tags` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clarity_trace_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('system','user','assistant') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('clarity','ged','office','wraith') NOT NULL,
	`title` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`delta` int NOT NULL,
	`reason` varchar(128) NOT NULL,
	`idempotencyKey` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_ledger_id` PRIMARY KEY(`id`),
	CONSTRAINT `credit_ledger_idempotencyKey_unique` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `ged_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subject` enum('math','rla','science','social') NOT NULL,
	`title` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ged_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ged_turns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`role` enum('student','tutor') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ged_turns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gem_appraisals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageKey` varchar(512),
	`imageUrl` text,
	`hint` varchar(500),
	`result` json NOT NULL,
	`source` enum('free_quota','xc','plus') NOT NULL DEFAULT 'free_quota',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gem_appraisals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mode_usage` (
	`userId` int NOT NULL,
	`mode` varchar(48) NOT NULL,
	`weekStart` timestamp NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mode_usage_userId_mode_weekStart_pk` PRIMARY KEY(`userId`,`mode`,`weekStart`)
);
--> statement-breakpoint
CREATE TABLE `pd_case_deadlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`dueAt` timestamp NOT NULL,
	`label` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pd_case_deadlines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pd_case_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`text` text NOT NULL,
	`source` enum('voice','note') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pd_case_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pd_case_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseId` int NOT NULL,
	`text` text NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	`source` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `pd_case_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pd_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`client` varchar(255),
	`lastDraft` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pd_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pd_workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('CLIENT','PD','EMERGENCY') NOT NULL DEFAULT 'CLIENT',
	`preEmergencyMode` enum('CLIENT','PD'),
	`clarityLevel` int NOT NULL DEFAULT 50,
	`riskScore` int NOT NULL DEFAULT 0,
	`streak` int NOT NULL DEFAULT 0,
	`lastAction` text,
	`nonExecutionCount` int NOT NULL DEFAULT 0,
	`lastEventAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pd_workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `pd_workspaces_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`type` enum('missed_checkin','missed_obligation','panic','high_risk') NOT NULL,
	`resolved` boolean NOT NULL DEFAULT false,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `recidivism_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(128) NOT NULL,
	`phone` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recidivism_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_geofences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`radius` int NOT NULL,
	`type` enum('avoid','required') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recidivism_geofences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_obligations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`dueAt` timestamp NOT NULL,
	`type` enum('court','meeting','test','curfew') NOT NULL,
	`status` enum('upcoming','completed','missed') NOT NULL DEFAULT 'upcoming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recidivism_obligations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_subject_memberships` (
	`subjectId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('subject','anchor') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recidivism_subject_memberships_subjectId_userId_pk` PRIMARY KEY(`subjectId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`streak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`lastCheckInAt` timestamp,
	`riskScore` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recidivism_subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recidivism_triggers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subjectId` int NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`situation` text NOT NULL,
	`place` varchar(255),
	`person` varchar(255),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recidivism_triggers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sitrep_assessments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('general','travel','immigration') NOT NULL,
	`situation` text NOT NULL,
	`context` text,
	`result` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sitrep_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `terminal_commands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`command` varchar(128) NOT NULL,
	`args` text,
	`outcome` enum('ok','err','pending_confirmation') NOT NULL DEFAULT 'ok',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `terminal_commands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionTier` enum('core','plus') NOT NULL DEFAULT 'core',
	`subscriptionStatus` varchar(48),
	`subscriptionRenewsAt` timestamp,
	`stripeCustomerId` varchar(128),
	`subscriptionId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `user_profiles_stripeCustomerId_unique` UNIQUE(`stripeCustomerId`)
);
--> statement-breakpoint
ALTER TABLE `auth_audit_events` ADD CONSTRAINT `auth_audit_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clarity_sessions` ADD CONSTRAINT `clarity_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clarity_sessions` ADD CONSTRAINT `clarity_sessions_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clarity_trace_points` ADD CONSTRAINT `clarity_trace_points_sessionId_clarity_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `clarity_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_messages` ADD CONSTRAINT `conversation_messages_conversationId_conversations_id_fk` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ged_sessions` ADD CONSTRAINT `ged_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ged_turns` ADD CONSTRAINT `ged_turns_sessionId_ged_sessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `ged_sessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gem_appraisals` ADD CONSTRAINT `gem_appraisals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mode_usage` ADD CONSTRAINT `mode_usage_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pd_case_deadlines` ADD CONSTRAINT `pd_case_deadlines_caseId_pd_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `pd_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pd_case_notes` ADD CONSTRAINT `pd_case_notes_caseId_pd_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `pd_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pd_case_tasks` ADD CONSTRAINT `pd_case_tasks_caseId_pd_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `pd_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pd_cases` ADD CONSTRAINT `pd_cases_workspaceId_pd_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `pd_workspaces`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pd_workspaces` ADD CONSTRAINT `pd_workspaces_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_alerts` ADD CONSTRAINT `recidivism_alerts_subjectId_recidivism_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_contacts` ADD CONSTRAINT `recidivism_contacts_subjectId_recidivism_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_geofences` ADD CONSTRAINT `recidivism_geofences_subjectId_recidivism_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_obligations` ADD CONSTRAINT `recidivism_obligations_subjectId_recidivism_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_subject_memberships` ADD CONSTRAINT `recidivism_subject_memberships_subjectId_recidivism_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_subject_memberships` ADD CONSTRAINT `recidivism_subject_memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_subjects` ADD CONSTRAINT `recidivism_subjects_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_triggers` ADD CONSTRAINT `recidivism_triggers_subjectId_recidivism_subjects_id_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sitrep_assessments` ADD CONSTRAINT `sitrep_assessments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `terminal_commands` ADD CONSTRAINT `terminal_commands_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `auth_audit_events_kind_idx` ON `auth_audit_events` (`kind`);--> statement-breakpoint
CREATE INDEX `auth_audit_events_created_idx` ON `auth_audit_events` (`createdAt`);--> statement-breakpoint
CREATE INDEX `clarity_trace_points_session_turn_idx` ON `clarity_trace_points` (`sessionId`,`turn`);--> statement-breakpoint
CREATE INDEX `conversation_messages_conversation_idx` ON `conversation_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `conversations_user_kind_idx` ON `conversations` (`userId`,`kind`);--> statement-breakpoint
CREATE INDEX `credit_ledger_user_created_idx` ON `credit_ledger` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ged_sessions_user_subject_idx` ON `ged_sessions` (`userId`,`subject`);--> statement-breakpoint
CREATE INDEX `ged_turns_session_created_idx` ON `ged_turns` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `gem_appraisals_user_created_idx` ON `gem_appraisals` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `pd_cases_workspace_updated_idx` ON `pd_cases` (`workspaceId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `recidivism_obligations_subject_status_idx` ON `recidivism_obligations` (`subjectId`,`status`);--> statement-breakpoint
CREATE INDEX `recidivism_memberships_user_role_idx` ON `recidivism_subject_memberships` (`userId`,`role`);--> statement-breakpoint
CREATE INDEX `recidivism_subjects_owner_updated_idx` ON `recidivism_subjects` (`ownerUserId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `sitrep_assessments_user_created_idx` ON `sitrep_assessments` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `terminal_commands_created_idx` ON `terminal_commands` (`createdAt`);