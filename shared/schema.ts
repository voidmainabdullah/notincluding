import { pgTable, text, serial, integer, boolean, uuid, bigint, timestamp, inet, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table for authentication
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Profiles table for user metadata
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  subscriptionTier: text("subscription_tier").notNull().default('free'), // 'free' | 'pro'
  subscriptionStatus: text("subscription_status").default('active'), // 'active' | 'canceled' | 'past_due'
  subscriptionEndDate: timestamp("subscription_end_date"),
  dailyUploadCount: integer("daily_upload_count").notNull().default(0),
  dailyUploadLimit: integer("daily_upload_limit").notNull().default(10),
  lastUploadReset: date("last_upload_reset").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Files table to store file metadata
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalName: text("original_name").notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  fileType: text("file_type").notNull(),
  storagePath: text("storage_path").notNull(),
  shareCode: text("share_code").unique(),
  isPublic: boolean("is_public").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  downloadLimit: integer("download_limit"),
  downloadCount: integer("download_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Shared links table for different sharing methods
export const sharedLinks = pgTable("shared_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  linkType: text("link_type").notNull(), // 'public' | 'email' | 'code'
  shareToken: text("share_token").unique().notNull(),
  recipientEmail: text("recipient_email"),
  passwordHash: text("password_hash"),
  expiresAt: timestamp("expires_at"),
  downloadLimit: integer("download_limit"),
  downloadCount: integer("download_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Download logs for tracking
export const downloadLogs = pgTable("download_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  sharedLinkId: uuid("shared_link_id").references(() => sharedLinks.id, { onDelete: "set null" }),
  downloaderIp: inet("downloader_ip"),
  downloaderUserAgent: text("downloader_user_agent"),
  downloadMethod: text("download_method").notNull(), // 'direct' | 'code' | 'email' | 'link'
  downloadedAt: timestamp("downloaded_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  files: many(files),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.id],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  sharedLinks: many(sharedLinks),
  downloadLogs: many(downloadLogs),
}));

export const sharedLinksRelations = relations(sharedLinks, ({ one, many }) => ({
  file: one(files, {
    fields: [sharedLinks.fileId],
    references: [files.id],
  }),
  downloadLogs: many(downloadLogs),
}));

export const downloadLogsRelations = relations(downloadLogs, ({ one }) => ({
  file: one(files, {
    fields: [downloadLogs.fileId],
    references: [files.id],
  }),
  sharedLink: one(sharedLinks, {
    fields: [downloadLogs.sharedLinkId],
    references: [sharedLinks.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSharedLinkSchema = createInsertSchema(sharedLinks).omit({
  id: true,
  createdAt: true,
});

export const insertDownloadLogSchema = createInsertSchema(downloadLogs).omit({
  id: true,
  downloadedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertSharedLink = z.infer<typeof insertSharedLinkSchema>;
export type SharedLink = typeof sharedLinks.$inferSelect;
export type InsertDownloadLog = z.infer<typeof insertDownloadLogSchema>;
export type DownloadLog = typeof downloadLogs.$inferSelect;
