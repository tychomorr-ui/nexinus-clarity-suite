ALTER TABLE `recidivism_subject_memberships` DROP FOREIGN KEY `recidivism_subject_memberships_subjectId_recidivism_subjects_id_fk`;
--> statement-breakpoint
ALTER TABLE `recidivism_subject_memberships` DROP FOREIGN KEY `recidivism_subject_memberships_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `recidivism_subject_memberships` ADD CONSTRAINT `recidivism_memberships_subject_fk` FOREIGN KEY (`subjectId`) REFERENCES `recidivism_subjects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recidivism_subject_memberships` ADD CONSTRAINT `recidivism_memberships_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;