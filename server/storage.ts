import { 
  users, 
  profiles,
  files,
  sharedLinks,
  downloadLogs,
  type User, 
  type InsertUser,
  type Profile,
  type InsertProfile,
  type File,
  type InsertFile,
  type SharedLink,
  type InsertSharedLink,
  type DownloadLog,
  type InsertDownloadLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Profile operations
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, profile: Partial<InsertProfile>): Promise<Profile | undefined>;
  
  // File operations
  getFile(id: string): Promise<File | undefined>;
  getFileByShareCode(shareCode: string): Promise<File | undefined>;
  getUserFiles(userId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, file: Partial<InsertFile>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // Shared link operations
  getSharedLink(token: string): Promise<SharedLink | undefined>;
  getFileSharedLinks(fileId: string): Promise<SharedLink[]>;
  createSharedLink(link: InsertSharedLink): Promise<SharedLink>;
  updateSharedLink(id: string, link: Partial<InsertSharedLink>): Promise<SharedLink | undefined>;
  deleteSharedLink(id: string): Promise<boolean>;
  
  // Download log operations
  createDownloadLog(log: InsertDownloadLog): Promise<DownloadLog>;
  getFileDownloadLogs(fileId: string): Promise<DownloadLog[]>;
  
  // Utility functions
  generateShareCode(): string;
  hashPassword(password: string): string;
  validatePassword(password: string, hash: string): boolean;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private profiles: Map<string, Profile>;
  private files: Map<string, File>;
  private sharedLinks: Map<string, SharedLink>;
  private downloadLogs: Map<string, DownloadLog>;
  private shareCodeToFileId: Map<string, string>;
  private shareTokenToLinkId: Map<string, string>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.files = new Map();
    this.sharedLinks = new Map();
    this.downloadLogs = new Map();
    this.shareCodeToFileId = new Map();
    this.shareTokenToLinkId = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Profile operations
  async getProfile(userId: string): Promise<Profile | undefined> {
    return this.profiles.get(userId);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const profile: Profile = {
      ...insertProfile,
      displayName: insertProfile.displayName ?? null,
      avatarUrl: insertProfile.avatarUrl ?? null,
      subscriptionEndDate: insertProfile.subscriptionEndDate ?? null,
      lastUploadReset: insertProfile.lastUploadReset ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  async updateProfile(userId: string, profileUpdate: Partial<InsertProfile>): Promise<Profile | undefined> {
    const existing = this.profiles.get(userId);
    if (!existing) return undefined;
    
    const updated: Profile = {
      ...existing,
      ...profileUpdate,
      updatedAt: new Date(),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  // File operations
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFileByShareCode(shareCode: string): Promise<File | undefined> {
    const fileId = this.shareCodeToFileId.get(shareCode);
    if (!fileId) return undefined;
    return this.files.get(fileId);
  }

  async getUserFiles(userId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => file.userId === userId);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = crypto.randomUUID();
    const file: File = {
      ...insertFile,
      id,
      shareCode: insertFile.shareCode ?? null,
      downloadLimit: insertFile.downloadLimit ?? null,
      expiresAt: insertFile.expiresAt ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.files.set(id, file);
    
    if (file.shareCode) {
      this.shareCodeToFileId.set(file.shareCode, id);
    }
    
    return file;
  }

  async updateFile(id: string, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    const existing = this.files.get(id);
    if (!existing) return undefined;
    
    // Update share code mapping if changed
    if (existing.shareCode && fileUpdate.shareCode !== existing.shareCode) {
      this.shareCodeToFileId.delete(existing.shareCode);
    }
    
    const updated: File = {
      ...existing,
      ...fileUpdate,
      updatedAt: new Date(),
    };
    
    if (updated.shareCode) {
      this.shareCodeToFileId.set(updated.shareCode, id);
    }
    
    this.files.set(id, updated);
    return updated;
  }

  async deleteFile(id: string): Promise<boolean> {
    const file = this.files.get(id);
    if (!file) return false;
    
    if (file.shareCode) {
      this.shareCodeToFileId.delete(file.shareCode);
    }
    
    // Delete associated shared links
    const linksToDelete = Array.from(this.sharedLinks.values())
      .filter(link => link.fileId === id);
    for (const link of linksToDelete) {
      this.sharedLinks.delete(link.id);
      this.shareTokenToLinkId.delete(link.shareToken);
    }
    
    // Delete associated download logs
    const logsToDelete = Array.from(this.downloadLogs.values())
      .filter(log => log.fileId === id);
    for (const log of logsToDelete) {
      this.downloadLogs.delete(log.id);
    }
    
    this.files.delete(id);
    return true;
  }

  // Shared link operations
  async getSharedLink(token: string): Promise<SharedLink | undefined> {
    const linkId = this.shareTokenToLinkId.get(token);
    if (!linkId) return undefined;
    return this.sharedLinks.get(linkId);
  }

  async getFileSharedLinks(fileId: string): Promise<SharedLink[]> {
    return Array.from(this.sharedLinks.values()).filter(link => link.fileId === fileId);
  }

  async createSharedLink(insertLink: InsertSharedLink): Promise<SharedLink> {
    const id = crypto.randomUUID();
    const link: SharedLink = {
      ...insertLink,
      id,
      recipientEmail: insertLink.recipientEmail ?? null,
      passwordHash: insertLink.passwordHash ?? null,
      expiresAt: insertLink.expiresAt ?? null,
      downloadLimit: insertLink.downloadLimit ?? null,
      createdAt: new Date(),
    };
    
    this.sharedLinks.set(id, link);
    this.shareTokenToLinkId.set(link.shareToken, id);
    
    return link;
  }

  async updateSharedLink(id: string, linkUpdate: Partial<InsertSharedLink>): Promise<SharedLink | undefined> {
    const existing = this.sharedLinks.get(id);
    if (!existing) return undefined;
    
    // Update token mapping if changed
    if (linkUpdate.shareToken && linkUpdate.shareToken !== existing.shareToken) {
      this.shareTokenToLinkId.delete(existing.shareToken);
      this.shareTokenToLinkId.set(linkUpdate.shareToken, id);
    }
    
    const updated: SharedLink = {
      ...existing,
      ...linkUpdate,
    };
    
    this.sharedLinks.set(id, updated);
    return updated;
  }

  async deleteSharedLink(id: string): Promise<boolean> {
    const link = this.sharedLinks.get(id);
    if (!link) return false;
    
    this.shareTokenToLinkId.delete(link.shareToken);
    this.sharedLinks.delete(id);
    return true;
  }

  // Download log operations
  async createDownloadLog(insertLog: InsertDownloadLog): Promise<DownloadLog> {
    const id = crypto.randomUUID();
    const log: DownloadLog = {
      ...insertLog,
      id,
      sharedLinkId: insertLog.sharedLinkId ?? null,
      downloaderIp: insertLog.downloaderIp ?? null,
      downloaderUserAgent: insertLog.downloaderUserAgent ?? null,
      downloadedAt: new Date(),
    };
    
    this.downloadLogs.set(id, log);
    return log;
  }

  async getFileDownloadLogs(fileId: string): Promise<DownloadLog[]> {
    return Array.from(this.downloadLogs.values()).filter(log => log.fileId === fileId);
  }

  // Utility functions
  generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  hashPassword(password: string): string {
    // Simple hash for demo - in production use bcrypt or similar
    return btoa(password + 'salt');
  }

  validatePassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }
}

export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Profile operations
  async getProfile(userId: string): Promise<Profile | undefined> {
    const result = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    return result[0];
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const result = await db.insert(profiles).values(insertProfile).returning();
    return result[0];
  }

  async updateProfile(userId: string, profileUpdate: Partial<InsertProfile>): Promise<Profile | undefined> {
    const result = await db.update(profiles)
      .set(profileUpdate)
      .where(eq(profiles.id, userId))
      .returning();
    return result[0];
  }

  // File operations
  async getFile(id: string): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
    return result[0];
  }

  async getFileByShareCode(shareCode: string): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.shareCode, shareCode)).limit(1);
    return result[0];
  }

  async getUserFiles(userId: string): Promise<File[]> {
    return await db.select().from(files).where(eq(files.userId, userId));
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const result = await db.insert(files).values(insertFile).returning();
    return result[0];
  }

  async updateFile(id: string, fileUpdate: Partial<InsertFile>): Promise<File | undefined> {
    const result = await db.update(files)
      .set(fileUpdate)
      .where(eq(files.id, id))
      .returning();
    return result[0];
  }

  async deleteFile(id: string): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id)).returning();
    return result.length > 0;
  }

  // Shared link operations
  async getSharedLink(token: string): Promise<SharedLink | undefined> {
    const result = await db.select().from(sharedLinks).where(eq(sharedLinks.shareToken, token)).limit(1);
    return result[0];
  }

  async getFileSharedLinks(fileId: string): Promise<SharedLink[]> {
    return await db.select().from(sharedLinks).where(eq(sharedLinks.fileId, fileId));
  }

  async createSharedLink(insertLink: InsertSharedLink): Promise<SharedLink> {
    const result = await db.insert(sharedLinks).values(insertLink).returning();
    return result[0];
  }

  async updateSharedLink(id: string, linkUpdate: Partial<InsertSharedLink>): Promise<SharedLink | undefined> {
    const result = await db.update(sharedLinks)
      .set(linkUpdate)
      .where(eq(sharedLinks.id, id))
      .returning();
    return result[0];
  }

  async deleteSharedLink(id: string): Promise<boolean> {
    const result = await db.delete(sharedLinks).where(eq(sharedLinks.id, id)).returning();
    return result.length > 0;
  }

  // Download log operations
  async createDownloadLog(insertLog: InsertDownloadLog): Promise<DownloadLog> {
    const result = await db.insert(downloadLogs).values(insertLog).returning();
    return result[0];
  }

  async getFileDownloadLogs(fileId: string): Promise<DownloadLog[]> {
    return await db.select().from(downloadLogs).where(eq(downloadLogs.fileId, fileId));
  }

  // Utility functions
  generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  }

  validatePassword(password: string, hash: string): boolean {
    try {
      return bcrypt.compareSync(password, hash);
    } catch (error) {
      console.error('Password validation error:', error);
      return false;
    }
  }

  // Generate secure share token
  generateShareToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate secure password hash for file protection
  hashFilePassword(password: string): string {
    return bcrypt.hashSync(password, 12); // Higher salt rounds for file passwords
  }

  // Validate file password
  validateFilePassword(password: string, hash: string): boolean {
    try {
      return bcrypt.compareSync(password, hash);
    } catch (error) {
      console.error('File password validation error:', error);
      return false;
    }
  }

  // Fix ID type issues for shared links
  async updateSharedLink(id: string, updates: Partial<{ downloadCount: number; isActive: boolean }>): Promise<void> {
    await db.update(sharedLinks).set(updates).where(eq(sharedLinks.id, id));
  }

  async deleteSharedLink(id: string): Promise<void> {
    await db.delete(sharedLinks).where(eq(sharedLinks.id, id));
  }
}

// Use database storage by default, but allow switching to memory storage for testing
export const storage = new DatabaseStorage();
