import { action } from "./_generated/server";
import { v } from "convex/values";

// Public action to manually trigger backup (for testing)
export const manualDatabaseBackup = action({
  args: {},
  handler: async (ctx) => {
    try {
      const { internal } = await import("./_generated/api");
      return await ctx.runAction(internal.databaseBackup.createDatabaseBackup, {});
    } catch (error) {
      return { 
        error: "Manual backup failed",
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Action to download a backup file
export const downloadBackup = action({
  args: { backupId: v.id("databaseBackups") },
  handler: async (ctx, args) => {
    try {
      const { internal } = await import("./_generated/api");
      const backup = await ctx.runQuery(internal.databaseBackupMutations.getBackupById, { backupId: args.backupId });
      
      if (!backup) {
        throw new Error("Backup not found");
      }
      
      if (backup.status !== "success") {
        throw new Error("Cannot download failed backup");
      }
      
      const url = await ctx.storage.getUrl(backup.storageId);
      return {
        url,
        fileName: backup.fileName,
        fileSize: backup.fileSize,
      };
    } catch (error) {
      return {
        error: "Download failed",
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
});

// Helper function to get backup statistics
export const getBackupStats = action({
  args: {},
  handler: async (ctx) => {
    try {
      const { api } = await import("./_generated/api");
      const backups = await ctx.runQuery(api.databaseBackupMutations.getBackupHistory, {});
      
      const successful = backups.filter(b => b.status === "success");
      const failed = backups.filter(b => b.status === "failed");
      const totalSize = successful.reduce((sum, b) => sum + b.fileSize, 0);
      
      return {
        total: backups.length,
        successful: successful.length,
        failed: failed.length,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        latestBackup: successful[0] || null
      };
    } catch (error) {
      return {
        error: "Failed to get backup stats",
        message: error instanceof Error ? error.message : "Unknown error"
      };
    }
  },
}); 