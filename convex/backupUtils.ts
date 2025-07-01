import { action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Define return types to avoid circular references
type BackupResult = {
  success: boolean;
  fileName: string;
  fileSize: number;
  deletedOldBackups: number;
} | {
  error: string;
  message: string;
};

type DownloadResult = {
  url: string;
  fileName: string;
  fileSize: number;
} | {
  error: string;
  message: string;
};

type BackupStatsResult = {
  total: number;
  successful: number;
  failed: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  latestBackup: any;
} | {
  error: string;
  message: string;
};

// Public action to manually trigger backup (for testing)
export const manualDatabaseBackup = action({
  args: {},
  handler: async (ctx: ActionCtx): Promise<BackupResult> => {
    try {
      const { internal } = await import("./_generated/api");
      const result = await ctx.runAction(internal.databaseBackup.createDatabaseBackup, {});
      return result;
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
  handler: async (ctx: ActionCtx, args: { backupId: Id<"databaseBackups"> }): Promise<DownloadResult> => {
    try {
      const { internal } = await import("./_generated/api");
      const backup = await ctx.runQuery(internal.databaseBackupMutations.getBackupById, { backupId: args.backupId });
      
      if (!backup) {
        throw new Error("Backup not found");
      }
      
      if (backup.status !== "success") {
        throw new Error("Cannot download failed backup");
      }
      
      const storageUrl = await ctx.storage.getUrl(backup.storageId);
      if (!storageUrl) {
        throw new Error("Failed to generate download URL");
      }
      
      return {
        url: storageUrl,
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
  handler: async (ctx: ActionCtx): Promise<BackupStatsResult> => {
    try {
      const { api } = await import("./_generated/api");
      const backups = await ctx.runQuery(api.databaseBackupMutations.getBackupHistory, {});
      
      const successful = backups.filter((b: any) => b.status === "success");
      const failed = backups.filter((b: any) => b.status === "failed");
      const totalSize = successful.reduce((sum: number, b: any) => sum + b.fileSize, 0);
      
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