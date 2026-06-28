/**
 * What Are Next — single source-of-truth Drizzle schema (PRD §3.6).
 * Single-user; one `owner` constant, no row-level security.
 * Polymorphic attachments use (node_type, node_id) pairs.
 * sort_order is a float (fractional index) so reordering inserts between
 * neighbours without renumbering the whole set.
 */
import {
  pgTable, pgEnum, uuid, text, integer, doublePrecision, boolean,
  timestamp, jsonb, varchar, index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ enums */
export const nodeTypeEnum = pgEnum("node_type", [
  "objective", "goal", "domain", "initiative", "action", "task",
]);
export const goalStatusEnum = pgEnum("goal_status", [
  "not_started", "active", "at_risk", "done", "dropped",
]);
export const gtdStatusEnum = pgEnum("gtd_status", [
  "inbox", "next", "waiting", "scheduled", "someday", "done", "dropped",
]);
export const energyEnum = pgEnum("energy", ["low", "med", "high"]);
export const depStateEnum = pgEnum("dep_state", ["active", "resolved"]);
export const linkTypeEnum = pgEnum("link_type", [
  "linear", "notion", "drive", "prd", "github", "vercel", "other",
]);
export const stepStatusEnum = pgEnum("step_status", [
  "pending", "in_progress", "done", "blocked",
]);
export const tagKindEnum = pgEnum("tag_kind", ["context", "label"]);
export const aiRoleEnum = pgEnum("ai_role", ["user", "assistant", "system", "tool"]);

/* ----------------------------------------------------------- strategy layer */
// Annual / multi-quarter arc — schema seam only, no v1 UI (PRD §3.2).
export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  notes: text("notes"),
  horizon: text("horizon"),           // e.g. "FY26", "18-month"
  status: goalStatusEnum("status").default("active").notNull(),
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentObjectiveId: uuid("parent_objective_id").references(() => objectives.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),               // inlined markdown
  status: goalStatusEnum("status").default("not_started").notNull(),
  targetHorizon: text("target_horizon"), // e.g. "Q3 2026"
  domainIds: uuid("domain_ids").array().default([]).notNull(), // domains this goal serves (a goal can span domains)
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Rumelt kernel, 1:1 with a goal. Coherent actions live in kernel_actions
// so each can link down to a real execution node (PRD §3.2).
export const strategyKernels = pgTable("strategy_kernels", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  diagnosis: text("diagnosis"),
  guidingPrinciples: jsonb("guiding_principles").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ goalIdx: index("kernel_goal_idx").on(t.goalId) }));

// One coherent action; may link to an Initiative or Action (or neither →
// "strategy without execution" flag).
export const kernelActions = pgTable("kernel_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  kernelId: uuid("kernel_id").notNull().references(() => strategyKernels.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  linkedNodeType: nodeTypeEnum("linked_node_type"),  // initiative | action
  linkedNodeId: uuid("linked_node_id"),
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ kernelIdx: index("kernel_action_kernel_idx").on(t.kernelId) }));

/* ---------------------------------------------------------- execution layer */
export const domains = pgTable("domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  color: varchar("color", { length: 9 }).default("#0055FF").notNull(), // hex; band accent + health bar
  sortOrder: doublePrecision("sort_order").default(0).notNull(),       // vertical order = prioritization
  guidePersonIds: uuid("guide_person_ids").array().default([]).notNull(),
  collapsed: boolean("collapsed").default(false).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const initiatives = pgTable("initiatives", {
  id: uuid("id").primaryKey().defaultRandom(),
  domainId: uuid("domain_id").notNull().references(() => domains.id, { onDelete: "cascade" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  gtdStatus: gtdStatusEnum("gtd_status").default("next").notNull(), // "wishlist" KX rows → someday
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ domainIdx: index("initiative_domain_idx").on(t.domainId) }));

export const actions = pgTable("actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  initiativeId: uuid("initiative_id").notNull().references(() => initiatives.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  gtdStatus: gtdStatusEnum("gtd_status").default("next").notNull(),
  sequence: integer("sequence"),       // sheet's Time 1..Time 5 ordering
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ initiativeIdx: index("action_initiative_idx").on(t.initiativeId) }));

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  actionId: uuid("action_id").references(() => actions.id, { onDelete: "cascade" }),
  initiativeId: uuid("initiative_id").references(() => initiatives.id, { onDelete: "set null" }),
  goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  notes: text("notes"),
  // GTD machinery (PRD §3.3)
  gtdStatus: gtdStatusEnum("gtd_status").default("inbox").notNull(),
  isNextAction: boolean("is_next_action").default(false).notNull(),
  contexts: text("contexts").array().default([]).notNull(),  // @home, @clinic ...
  energy: energyEnum("energy"),
  timeEstimateMin: integer("time_estimate_min"),
  priority: integer("priority"),       // 1..3
  dueDate: timestamp("due_date", { withTimezone: true }),
  deferUntil: timestamp("defer_until", { withTimezone: true }), // tickler
  // Assignment & delegation
  assigneePersonId: uuid("assignee_person_id").references(() => people.id, { onDelete: "set null" }),
  waitingOnPersonId: uuid("waiting_on_person_id").references(() => people.id, { onDelete: "set null" }),
  waitingSince: timestamp("waiting_since", { withTimezone: true }),
  // Completion
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionNote: text("completion_note"),
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  actionIdx: index("task_action_idx").on(t.actionId),
  statusIdx: index("task_status_idx").on(t.gtdStatus),
  waitingIdx: index("task_waiting_idx").on(t.waitingOnPersonId),
}));

/* ------------------------------------------------------------- cross-cutting */
export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role"),
  team: text("team"),
  email: text("email"),
  avatarColor: varchar("avatar_color", { length: 9 }).default("#0055FF").notNull(),
  wasenderPhone: text("wasender_phone"),  // future dispatch seam, unused in v1
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const artefacts = pgTable("artefacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeType: nodeTypeEnum("node_type").notNull(),
  nodeId: uuid("node_id").notNull(),
  label: text("label"),
  blobUrl: text("blob_url").notNull(),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ nodeIdx: index("artefact_node_idx").on(t.nodeType, t.nodeId) }));

export const projectLinks = pgTable("project_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeType: nodeTypeEnum("node_type").notNull(),
  nodeId: uuid("node_id").notNull(),
  url: text("url").notNull(),
  type: linkTypeEnum("type").default("other").notNull(),
  title: text("title"),
  previewJson: jsonb("preview_json").$type<Record<string, unknown>>(),
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ nodeIdx: index("link_node_idx").on(t.nodeType, t.nodeId) }));

export const processes = pgTable("processes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeType: nodeTypeEnum("node_type").notNull(),
  nodeId: uuid("node_id").notNull(),
  title: text("title").notNull(),
  sortOrder: doublePrecision("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ nodeIdx: index("process_node_idx").on(t.nodeType, t.nodeId) }));

export const processSteps = pgTable("process_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  processId: uuid("process_id").notNull().references(() => processes.id, { onDelete: "cascade" }),
  stepNo: integer("step_no").notNull(),
  text: text("text").notNull(),
  ownerPersonId: uuid("owner_person_id").references(() => people.id, { onDelete: "set null" }),
  status: stepStatusEnum("status").default("pending").notNull(),
}, (t) => ({ processIdx: index("step_process_idx").on(t.processId) }));

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: tagKindEnum("kind").default("label").notNull(),
  color: varchar("color", { length: 9 }),
});

export const taskTags = pgTable("task_tags", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({ pk: index("task_tag_idx").on(t.taskId, t.tagId) }));

// Blockers are first-class, resolvable, audited (PRD §3.3).
export const dependencies = pgTable("dependencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  dependentNodeType: nodeTypeEnum("dependent_node_type").notNull(),
  dependentNodeId: uuid("dependent_node_id").notNull(),
  blockerNodeType: nodeTypeEnum("blocker_node_type"),     // null when external
  blockerNodeId: uuid("blocker_node_id"),
  externalLabel: text("external_label"),                  // "procurement approval"
  state: depStateEnum("state").default("active").notNull(),
  resolutionNote: text("resolution_note"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ depIdx: index("dep_dependent_idx").on(t.dependentNodeType, t.dependentNodeId) }));

export const inboxItems = pgTable("inbox_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawText: text("raw_text").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  promotedToType: nodeTypeEnum("promoted_to_type"),
  promotedToId: uuid("promoted_to_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  checklist: jsonb("checklist").$type<Record<string, boolean>>().default({}).notNull(),
});

// Every meaningful state change writes here — the board's memory (PRD §3.3).
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeType: nodeTypeEnum("node_type").notNull(),
  nodeId: uuid("node_id").notNull(),
  event: text("event").notNull(),       // assigned, delegated, blocked, unblocked, completed, dropped ...
  note: text("note"),
  actor: text("actor").default("V").notNull(),  // V or a named colleague reference
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ nodeIdx: index("activity_node_idx").on(t.nodeType, t.nodeId) }));

/* -------------------------------------------------------------- AI assistant */
export const aiThreads = pgTable("ai_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => aiThreads.id, { onDelete: "cascade" }),
  role: aiRoleEnum("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls").$type<unknown[]>(),
  citations: jsonb("citations").$type<unknown[]>(),  // node chips referenced
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ threadIdx: index("ai_message_thread_idx").on(t.threadId) }));

/* --------------------------------------------------------------- type infer */
export type Domain = typeof domains.$inferSelect;
export type Initiative = typeof initiatives.$inferSelect;
export type Action = typeof actions.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Dependency = typeof dependencies.$inferSelect;
export type InboxItem = typeof inboxItems.$inferSelect;
