import {
  boolean,
  foreignKey,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Platform-backed identity; all suite records remain user scoped. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["core", "plus"]).default("core").notNull(),
  subscriptionStatus: varchar("subscriptionStatus", { length: 48 }),
  subscriptionRenewsAt: timestamp("subscriptionRenewsAt"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }).unique(),
  subscriptionId: varchar("subscriptionId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Products can be purchased independently while still sharing one XinUS identity. */
export const productKeyValues = ["clarity", "ged_tutor", "hidden_gems", "pd_pro", "recovery", "task_force_pro", "sitrep", "pam"] as const;
export type ProductKey = (typeof productKeyValues)[number];

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  billingEmail: varchar("billingEmail", { length: 320 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const organizationMembers = mysqlTable("organization_members", {
  organizationId: int("organizationId").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["owner", "admin", "member"]).notNull().default("member"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  primary: primaryKey({ columns: [table.organizationId, table.userId] }),
  userIndex: index("organization_members_user_idx").on(table.userId),
}));

/** An entitlement may belong directly to a user or to a payer organization. */
export const productEntitlements = mysqlTable("product_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  productKey: mysqlEnum("productKey", productKeyValues).notNull(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  organizationId: int("organizationId").references(() => organizations.id, { onDelete: "cascade" }),
  payerType: mysqlEnum("payerType", ["individual", "organization", "sponsored", "free"]).notNull(),
  source: mysqlEnum("source", ["stripe", "grant", "recovery_access", "admin"]).notNull(),
  status: mysqlEnum("status", ["active", "trialing", "past_due", "canceled", "expired"]).notNull().default("active"),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  stripePriceId: varchar("stripePriceId", { length: 128 }),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userProductIndex: index("product_entitlements_user_product_idx").on(table.userId, table.productKey, table.status),
  organizationProductIndex: index("product_entitlements_org_product_idx").on(table.organizationId, table.productKey, table.status),
  subscriptionIndex: index("product_entitlements_subscription_idx").on(table.stripeSubscriptionId),
}));

/** User-owned context shared only with permitted XinUS products. */
export const reflectiveProfiles = mysqlTable("reflective_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  northStar: text("northStar"),
  preferences: text("preferences"),
  sharedAcrossProducts: boolean("sharedAcrossProducts").notNull().default(true),
  shareNorthStar: boolean("shareNorthStar").notNull().default(true),
  sharePreferences: boolean("sharePreferences").notNull().default(true),
  enabledProducts: json("enabledProducts"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const authAuditEvents = mysqlTable("auth_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 320 }),
  kind: varchar("kind", { length: 64 }).notNull(),
  ip: varchar("ip", { length: 128 }),
  userAgent: varchar("userAgent", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  kindIndex: index("auth_audit_events_kind_idx").on(table.kind),
  createdIndex: index("auth_audit_events_created_idx").on(table.createdAt),
}));

/** Durable, one-time OAuth state makes login resilient to browser cookie restrictions. */
export const oauthLoginStates = mysqlTable("oauth_login_states", {
  nonce: varchar("nonce", { length: 96 }).primaryKey(),
  redirectUri: varchar("redirectUri", { length: 512 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  expiresIndex: index("oauth_login_states_expires_idx").on(table.expiresAt),
}));

/** Private XinUS identity records used exclusively by the self-controlled first-party OAuth issuer. */
export const privateOAuthAccounts = mysqlTable("private_oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  handle: varchar("handle", { length: 80 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** One-time authorization codes are stored only as SHA-256 digests and require PKCE verification. */
export const privateOAuthCodes = mysqlTable("private_oauth_codes", {
  codeHash: varchar("codeHash", { length: 128 }).primaryKey(),
  accountId: int("accountId").notNull().references(() => privateOAuthAccounts.id, { onDelete: "cascade" }),
  redirectUri: varchar("redirectUri", { length: 512 }).notNull(),
  codeChallenge: varchar("codeChallenge", { length: 128 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  expiresIndex: index("private_oauth_codes_expires_idx").on(table.expiresAt),
}));

export const terminalCommands = mysqlTable("terminal_commands", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "set null" }),
  command: varchar("command", { length: 128 }).notNull(),
  args: text("args"),
  outcome: mysqlEnum("outcome", ["ok", "err", "pending_confirmation"]).notNull().default("ok"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  createdIndex: index("terminal_commands_created_idx").on(table.createdAt),
}));

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: mysqlEnum("kind", ["clarity", "ged", "office", "pam"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userKindIndex: index("conversations_user_kind_idx").on(table.userId, table.kind),
}));

export const conversationMessages = mysqlTable("conversation_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["system", "user", "assistant"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conversationIndex: index("conversation_messages_conversation_idx").on(table.conversationId, table.createdAt),
}));

export const claritySessions = mysqlTable("clarity_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  conversationId: int("conversationId").references(() => conversations.id, { onDelete: "set null" }),
  resistance: int("resistance").default(0).notNull(),
  currentState: mysqlEnum("currentState", ["ALCHEMY", "RESPOND", "LIGHT_WARRIOR"]),
  thresholds: json("thresholds"),
  turnCount: int("turnCount").default(0).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const clarityTracePoints = mysqlTable("clarity_trace_points", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => claritySessions.id, { onDelete: "cascade" }),
  turn: int("turn").notNull(),
  state: mysqlEnum("state", ["ALCHEMY", "RESPOND", "LIGHT_WARRIOR"]).notNull(),
  resistance: int("resistance").notNull(),
  tags: json("tags").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionTurnIndex: index("clarity_trace_points_session_turn_idx").on(table.sessionId, table.turn),
}));

export const clarityTruthLedger = mysqlTable("clarity_truth_ledger", {
  id: int("id").autoincrement().notNull().unique(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 64 }).notNull().primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  premiseBroken: text("premiseBroken").notNull(),
  boundedAction: text("boundedAction").notNull(),
  constraint: text("constraint").notNull(),
  verificationGate: text("verificationGate").notNull(),
  canonicalPayload: text("canonicalPayload").notNull(),
  hash: varchar("hash", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["PENDING", "VERIFIED", "FAILED"]).notNull().default("PENDING"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("clarity_truth_ledger_user_created_idx").on(table.userId, table.createdAt),
  sessionHashUnique: uniqueIndex("clarity_truth_ledger_session_hash_unique").on(table.sessionId, table.hash),
}));

export const clarityAuditEvents = mysqlTable("clarity_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  timestamp: timestamp("timestamp").notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: mysqlEnum("eventType", ["RECEIPT_ACCEPTED", "TAMPER_ATTEMPT"]).notNull(),
  clientHash: varchar("clientHash", { length: 64 }).notNull(),
  serverHash: varchar("serverHash", { length: 64 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
}, (table) => ({
  sessionTimestampIndex: index("clarity_audit_events_session_timestamp_idx").on(table.sessionId, table.timestamp),
  userTimestampIndex: index("clarity_audit_events_user_timestamp_idx").on(table.userId, table.timestamp),
}));

export const modeUsage = mysqlTable("mode_usage", {
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mode: varchar("mode", { length: 48 }).notNull(),
  weekStart: timestamp("weekStart").notNull(),
  count: int("count").notNull().default(0),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  primary: primaryKey({ columns: [table.userId, table.mode, table.weekStart] }),
}));

export const creditLedger = mysqlTable("credit_ledger", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  delta: int("delta").notNull(),
  reason: varchar("reason", { length: 128 }).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("credit_ledger_user_created_idx").on(table.userId, table.createdAt),
  userIdempotencyIndex: uniqueIndex("credit_ledger_user_idempotency_unique").on(table.userId, table.idempotencyKey),
}));

export const gedSessions = mysqlTable("ged_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  subject: mysqlEnum("subject", ["math", "rla", "science", "social"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userSubjectIndex: index("ged_sessions_user_subject_idx").on(table.userId, table.subject),
}));

export const gedTurns = mysqlTable("ged_turns", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => gedSessions.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["student", "tutor"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  sessionCreatedIndex: index("ged_turns_session_created_idx").on(table.sessionId, table.createdAt),
}));

export const gemAppraisals = mysqlTable("gem_appraisals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageKey: varchar("imageKey", { length: 512 }),
  imageUrl: text("imageUrl"),
  hint: varchar("hint", { length: 500 }),
  result: json("result").notNull(),
  source: mysqlEnum("source", ["free_quota", "xc", "plus"]).notNull().default("free_quota"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("gem_appraisals_user_created_idx").on(table.userId, table.createdAt),
}));

export const sitrepAssessments = mysqlTable("sitrep_assessments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mode: mysqlEnum("mode", ["general", "travel", "immigration"]).notNull(),
  situation: text("situation").notNull(),
  context: text("context"),
  result: text("result").notNull(),
  evidenceStatus: mysqlEnum("evidenceStatus", ["verified", "partially_verified", "unverified"]).notNull().default("partially_verified"),
  simulationStatus: mysqlEnum("simulationStatus", ["baseline", "simulation_branch"]).notNull().default("baseline"),
  confidenceScore: int("confidenceScore").notNull().default(0),
  decisionState: mysqlEnum("decisionState", ["ready", "cross_check_required", "hold"]).notNull().default("cross_check_required"),
  tracking: json("tracking"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("sitrep_assessments_user_created_idx").on(table.userId, table.createdAt),
}));

/** Product-specific user work records. These intentionally never contain shared subject or case records. */
export const productWorkItems = mysqlTable("product_work_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productKey: mysqlEnum("productKey", productKeyValues).notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["active", "complete", "archived"]).notNull().default("active"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userProductStatusIndex: index("product_work_items_user_product_status_idx").on(table.userId, table.productKey, table.status),
  userCreatedIndex: index("product_work_items_user_created_idx").on(table.userId, table.createdAt),
}));

export const pdWorkspaces = mysqlTable("pd_workspaces", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  mode: mysqlEnum("mode", ["CLIENT", "PD", "EMERGENCY"]).notNull().default("CLIENT"),
  preEmergencyMode: mysqlEnum("preEmergencyMode", ["CLIENT", "PD"]),
  clarityLevel: int("clarityLevel").notNull().default(50),
  riskScore: int("riskScore").notNull().default(0),
  streak: int("streak").notNull().default(0),
  lastAction: text("lastAction"),
  nonExecutionCount: int("nonExecutionCount").notNull().default(0),
  lastEventAt: timestamp("lastEventAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pdCases = mysqlTable("pd_cases", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull().references(() => pdWorkspaces.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  client: varchar("client", { length: 255 }),
  lastDraft: text("lastDraft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  workspaceUpdatedIndex: index("pd_cases_workspace_updated_idx").on(table.workspaceId, table.updatedAt),
}));

export const pdCaseNotes = mysqlTable("pd_case_notes", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull().references(() => pdCases.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  source: mysqlEnum("source", ["voice", "note"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pdCaseTasks = mysqlTable("pd_case_tasks", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull().references(() => pdCases.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").notNull().default(false),
  source: text("source"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const pdCaseDeadlines = mysqlTable("pd_case_deadlines", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull().references(() => pdCases.id, { onDelete: "cascade" }),
  dueAt: timestamp("dueAt").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const recidivismSubjects = mysqlTable("recidivism_subjects", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  streak: int("streak").notNull().default(0),
  longestStreak: int("longestStreak").notNull().default(0),
  lastCheckInAt: timestamp("lastCheckInAt"),
  riskScore: int("riskScore").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  ownerUpdatedIndex: index("recidivism_subjects_owner_updated_idx").on(table.ownerUserId, table.updatedAt),
}));

export const recidivismSubjectMemberships = mysqlTable("recidivism_subject_memberships", {
  subjectId: int("subjectId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["subject", "anchor"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  primary: primaryKey({ columns: [table.subjectId, table.userId] }),
  userRoleIndex: index("recidivism_memberships_user_role_idx").on(table.userId, table.role),
  subjectForeignKey: foreignKey({
    columns: [table.subjectId],
    foreignColumns: [recidivismSubjects.id],
    name: "recidivism_memberships_subject_fk",
  }).onDelete("cascade"),
  userForeignKey: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "recidivism_memberships_user_fk",
  }).onDelete("cascade"),
}));

export const recidivismTriggers = mysqlTable("recidivism_triggers", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => recidivismSubjects.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurredAt").notNull(),
  situation: text("situation").notNull(),
  place: varchar("place", { length: 255 }),
  person: varchar("person", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const recidivismObligations = mysqlTable("recidivism_obligations", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => recidivismSubjects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  dueAt: timestamp("dueAt").notNull(),
  type: mysqlEnum("type", ["court", "meeting", "test", "curfew"]).notNull(),
  status: mysqlEnum("status", ["upcoming", "completed", "missed"]).notNull().default("upcoming"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  subjectStatusIndex: index("recidivism_obligations_subject_status_idx").on(table.subjectId, table.status),
}));

export const recidivismContacts = mysqlTable("recidivism_contacts", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => recidivismSubjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const recidivismGeofences = mysqlTable("recidivism_geofences", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => recidivismSubjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  radius: int("radius").notNull(),
  type: mysqlEnum("type", ["avoid", "required"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const recidivismAlerts = mysqlTable("recidivism_alerts", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => recidivismSubjects.id, { onDelete: "cascade" }),
  type: mysqlEnum("type", ["missed_checkin", "missed_obligation", "panic", "high_risk"]).notNull(),
  resolved: boolean("resolved").notNull().default(false),
  occurredAt: timestamp("occurredAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
