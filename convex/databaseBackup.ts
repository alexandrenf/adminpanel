"use node";

import { internalAction } from "./_generated/server";
import * as zlib from "zlib";
import { promisify } from "util";
// @ts-ignore
import mysqldump from "mysqldump";

const gzip = promisify(zlib.gzip);

// Helper function to create mysqldump using the npm package
async function createMySQLDump(): Promise<Buffer> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Parse the database URL to extract connection details
  const url = new URL(databaseUrl);
  const hostname = url.hostname;
  const port = parseInt(url.port || "3306");
  const username = url.username;
  const password = url.password;
  const database = url.pathname.slice(1); // Remove leading '/'

  try {
    console.log(`Connecting to database: ${hostname}:${port}/${database}`);
    
    // Use mysqldump npm package
    const result = await mysqldump({
      connection: {
        host: hostname,
        port: port,
        user: username,
        password: password,
        database: database,
      },
      dumpToFile: false, // We want the dump as a string, not written to file
      compressFile: false, // We'll handle compression ourselves
      dump: {
        schema: {
          table: {
            ifNotExist: true,
            dropIfExist: true,
            charset: true,
          },
        },
        data: {
          format: true,
          verbose: true,
          lockTables: false,
        },
        trigger: {
          delimiter: ';;',
          dropIfExist: true,
          definer: false,
        },
      },
    });

    console.log("MySQL dump completed successfully");
    return Buffer.from(result.dump.schema + result.dump.data + result.dump.trigger, 'utf8');
  } catch (error) {
    console.error("MySQL dump failed:", error);
    throw new Error(`MySQL dump failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main backup action
export const createDatabaseBackup = internalAction({
  args: {},
  handler: async (ctx) => {
    const backupDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const fileName = `database_backup_${backupDate}_${Date.now()}.sql.gz`;
    
    try {
      console.log("Starting database backup process...");
      
      // Create SQL dump
      console.log("Creating MySQL dump...");
      const sqlDump = await createMySQLDump();
      
      // Compress the dump
      console.log("Compressing SQL dump...");
      const compressedDump = await gzip(sqlDump);
      
      // Store in Convex storage
      console.log("Uploading to Convex storage...");
      const storageId = await ctx.storage.store(new Blob([compressedDump], {
        type: "application/gzip"
      }));
      
      // Create database record
      console.log("Creating backup record...");
      const { internal } = await import("./_generated/api");
      await ctx.runMutation(internal.databaseBackupMutations.createBackupRecord, {
        fileName,
        storageId,
        fileSize: compressedDump.length,
        backupDate,
        compressionType: "gzip",
        status: "success",
      });
      
      // Cleanup old backups
      console.log("Cleaning up old backups...");
      const deletedCount = await ctx.runMutation(internal.databaseBackupMutations.cleanupOldBackups, {});
      
      console.log(`Database backup completed successfully: ${fileName}`);
      return { success: true, fileName, fileSize: compressedDump.length, deletedOldBackups: deletedCount };
      
    } catch (error) {
      console.error("Database backup failed:", error);
      
      // Record the failure
      try {
        const { internal } = await import("./_generated/api");
        await ctx.runMutation(internal.databaseBackupMutations.createBackupRecord, {
          fileName,
          storageId: "", // Empty storage ID for failed backups
          fileSize: 0,
          backupDate,
          compressionType: "gzip",
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (recordError) {
        console.error("Failed to record backup failure:", recordError);
      }
      
      throw error;
    }
  },
}); 