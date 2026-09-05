import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(), value: text("value").notNull().default(""), updatedAt: text("updated_at").notNull(),
});
export const members = sqliteTable("members", {
  id: text("id").primaryKey(), name: text("name").notNull(), role: text("role").notNull(), bio: text("bio").notNull().default(""),
  photoKey: text("photo_key"), email: text("email").notNull().default(""), instagram: text("instagram").notNull().default(""), linkedin: text("linkedin").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0), active: integer("active", { mode: "boolean" }).notNull().default(true), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const packages = sqliteTable("packages", {
  id: text("id").primaryKey(), name: text("name").notNull(), label: text("label").notNull().default(""), price: integer("price").notNull().default(0),
  priceNote: text("price_note").notNull().default("/ project"), features: text("features").notNull().default("[]"), featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true), sortOrder: integer("sort_order").notNull().default(0), updatedAt: text("updated_at").notNull(),
});
export const statSettings = sqliteTable("stat_settings", {
  id: text("id").primaryKey(), label: text("label").notNull(), manualValue: integer("manual_value").notNull().default(0), suffix: text("suffix").notNull().default("+"),
  autoMode: integer("auto_mode", { mode: "boolean" }).notNull().default(true), sortOrder: integer("sort_order").notNull().default(0), updatedAt: text("updated_at").notNull(),
});
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), title: text("title").notNull(), clientName: text("client_name").notNull(),
  status: text("status", { enum: ["active", "completed"] }).notNull().default("active"), satisfaction: integer("satisfaction"), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
});
export const contactLeads = sqliteTable("contact_leads", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(), phone: text("phone").notNull().default(""),
  subject: text("subject").notNull(), message: text("message").notNull(), status: text("status", { enum: ["new", "contacted", "qualified", "won", "closed", "spam"] }).notNull().default("new"),
  notes: text("notes").notNull().default(""), source: text("source").notNull().default("website"), ipHash: text("ip_hash"), consentAt: text("consent_at").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("contact_leads_created_idx").on(table.createdAt),
  index("contact_leads_status_created_idx").on(table.status, table.createdAt),
  index("contact_leads_email_idx").on(table.email),
  index("contact_leads_ip_created_idx").on(table.ipHash, table.createdAt),
]);

export const adminAccounts = sqliteTable("admin_accounts", {
  email: text("email").primaryKey(),
  displayName: text("display_name").notNull().default("MIKRAS Admin"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  recoveryEmail: text("recovery_email").notNull(),
  notificationEmail: text("notification_email").notNull(),
  notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).notNull().default(true),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  sessionVersion: integer("session_version").notNull().default(1),
  passwordChangedAt: text("password_changed_at").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  adminEmail: text("admin_email").notNull().references(() => adminAccounts.email, { onDelete: "cascade" }),
  sessionVersion: integer("session_version").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
}, (table) => [
  index("admin_sessions_email_idx").on(table.adminEmail),
  index("admin_sessions_expires_idx").on(table.expiresAt),
]);

export const adminPasswordResets = sqliteTable("admin_password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  adminEmail: text("admin_email").notNull().references(() => adminAccounts.email, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
}, (table) => [
  index("admin_password_resets_email_idx").on(table.adminEmail),
  index("admin_password_resets_expires_idx").on(table.expiresAt),
]);

export const adminNotes = sqliteTable("admin_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("admin_notes_pinned_updated_idx").on(table.pinned, table.updatedAt),
]);
