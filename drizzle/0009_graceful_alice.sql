ALTER TABLE `product_entitlements` MODIFY COLUMN `productKey` enum('clarity','ged_tutor','hidden_gems','pd_pro','recovery','task_force_pro','sitrep','wraith','pam') NOT NULL;--> statement-breakpoint
ALTER TABLE `product_work_items` MODIFY COLUMN `productKey` enum('clarity','ged_tutor','hidden_gems','pd_pro','recovery','task_force_pro','sitrep','wraith','pam') NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `kind` enum('clarity','ged','office','wraith','pam') NOT NULL;--> statement-breakpoint
UPDATE `product_entitlements` SET `productKey` = 'pam' WHERE `productKey` = 'wraith';--> statement-breakpoint
UPDATE `product_work_items` SET `productKey` = 'pam' WHERE `productKey` = 'wraith';--> statement-breakpoint
UPDATE `conversations` SET `kind` = 'pam' WHERE `kind` = 'wraith';--> statement-breakpoint
UPDATE `reflective_profiles` SET `enabledProducts` = REPLACE(`enabledProducts`, '"wraith"', '"pam"') WHERE `enabledProducts` LIKE '%"wraith"%';--> statement-breakpoint
ALTER TABLE `product_entitlements` MODIFY COLUMN `productKey` enum('clarity','ged_tutor','hidden_gems','pd_pro','recovery','task_force_pro','sitrep','pam') NOT NULL;--> statement-breakpoint
ALTER TABLE `product_work_items` MODIFY COLUMN `productKey` enum('clarity','ged_tutor','hidden_gems','pd_pro','recovery','task_force_pro','sitrep','pam') NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` MODIFY COLUMN `kind` enum('clarity','ged','office','pam') NOT NULL;
