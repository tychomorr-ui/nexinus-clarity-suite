CREATE TABLE `oauth_login_states` (
	`nonce` varchar(96) NOT NULL,
	`redirectUri` varchar(512) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `oauth_login_states_nonce` PRIMARY KEY(`nonce`)
);
--> statement-breakpoint
CREATE INDEX `oauth_login_states_expires_idx` ON `oauth_login_states` (`expiresAt`);