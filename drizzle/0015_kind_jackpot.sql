ALTER TABLE `sitrep_assessments` ADD `evidenceStatus` enum('verified','partially_verified','unverified') DEFAULT 'partially_verified' NOT NULL;--> statement-breakpoint
ALTER TABLE `sitrep_assessments` ADD `simulationStatus` enum('baseline','simulation_branch') DEFAULT 'baseline' NOT NULL;--> statement-breakpoint
ALTER TABLE `sitrep_assessments` ADD `confidenceScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sitrep_assessments` ADD `decisionState` enum('ready','cross_check_required','hold') DEFAULT 'cross_check_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `sitrep_assessments` ADD `tracking` json;