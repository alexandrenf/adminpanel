import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to create backup record
export const createBackupRecord = internalMutation({
  args: {
    fileName: v.string(),
    storageId: v.string(),
    fileSize: v.number(),
    backupDate: v.string(),
    compressionType: v.string(),
    status: v.string(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("databaseBackups", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Internal mutation to cleanup old backups
export const cleanupOldBackups = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existingBackups = await ctx.db
      .query("databaseBackups")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    
    const successfulBackups = existingBackups.filter(backup => backup.status === "success");
    
    if (successfulBackups.length > 5) {
      const backupsToDelete = successfulBackups.slice(5); // Keep first 5 (most recent), delete the rest
      
      for (const backup of backupsToDelete) {
        try {
          await ctx.storage.delete(backup.storageId);
          await ctx.db.delete(backup._id);
        } catch (error) {
          console.error(`Failed to delete backup ${backup._id}:`, error);
        }
      }
      console.log(`Deleted ${backupsToDelete.length} old backup(s)`);
      return backupsToDelete.length;
    }
    return 0;
  },
});

// Query to get backup history
export const getBackupHistory = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("databaseBackups")
      .withIndex("by_created_at")
      .order("desc")
      .take(20); // Get last 20 backups
  },
});

// Internal query to get a backup by ID
export const getBackupById = internalQuery({
  args: { backupId: v.id("databaseBackups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.backupId);
  },
}); 