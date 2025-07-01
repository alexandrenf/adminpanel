# Database Backup System

This document describes the automated database backup system implemented for the project using Convex and MySQL.

## Overview

The backup system automatically creates compressed SQL dumps of your Prisma-connected MySQL database every day at midnight and stores them securely in Convex storage with automatic rotation (keeping only the 5 most recent backups).

## Components

### 1. Database Schema (`convex/schema.ts`)
Added a new `databaseBackups` table to track backup metadata:

```typescript
databaseBackups: defineTable({
  fileName: v.string(),           // Name of the backup file
  storageId: v.string(),         // Convex storage ID for the compressed backup
  fileSize: v.number(),          // Size of the compressed backup in bytes
  createdAt: v.number(),         // Timestamp when backup was created
  backupDate: v.string(),        // Formatted date string (YYYY-MM-DD)
  compressionType: v.string(),   // "gzip" - compression format used
  status: v.string(),            // "success" | "failed" | "in_progress"
  errorMessage: v.optional(v.string()), // Error message if backup failed
})
```

### 2. Backup Logic (`convex/databaseBackup.ts`)
Contains the main backup functionality:

- **`createDatabaseBackup`**: Internal action that performs the actual backup
- **`createBackupRecord`**: Internal mutation to create backup metadata records
- **`cleanupOldBackups`**: Internal mutation to remove old backups (keeps only 5)
- **`getBackupHistory`**: Query to retrieve backup history
- **`getBackupById`**: Internal query to get a specific backup

### 3. Cron Job Configuration (`convex.json`)
Configured to run daily at midnight:

```json
{
  "crons": [
    {
      "name": "Daily Database Backup",
      "spec": "0 0 * * *",
      "functionHandle": "databaseBackup:createDatabaseBackup"
    }
  ]
}
```

### 4. Utility Functions (`convex/backupUtils.ts`)
Helper functions for manual backup management (available after API generation).

## How It Works

1. **Daily Execution**: Every day at midnight (00:00), the cron job triggers the backup process
2. **SQL Dump Creation**: Uses `mysqldump` to create a complete database dump
3. **Compression**: Compresses the SQL dump using gzip to save storage space
4. **Storage**: Stores the compressed backup in Convex file storage
5. **Metadata**: Records backup information in the `databaseBackups` table
6. **Cleanup**: Automatically removes old backups, keeping only the 5 most recent successful backups
7. **Error Handling**: Logs failures and stores error information for debugging

## Requirements

### System Requirements
- `mysqldump` utility must be available in the system PATH
- Node.js environment with access to spawn child processes
- Convex deployment with file storage enabled

### Environment Variables
- `DATABASE_URL`: MySQL connection string used by Prisma

### Database Permissions
The MySQL user must have sufficient permissions to:
- SELECT on all tables
- Access to routines, triggers, and events
- Lock tables (though `--skip-lock-tables` is used for compatibility)

## Setup Instructions

1. **Deploy the Convex Functions**:
   ```bash
   npx convex deploy
   ```

2. **Verify Cron Job**:
   After deployment, check the Convex dashboard to ensure the cron job is registered and active.

3. **Test Manual Backup** (after API generation):
   ```javascript
   // In your application or Convex dashboard
   await convex.action(api.backupUtils.manualDatabaseBackup, {});
   ```

4. **Monitor Backup History**:
   ```javascript
   const backups = await convex.query(api.databaseBackup.getBackupHistory, {});
   ```

## File Naming Convention

Backup files are named using the following pattern:
```
database_backup_YYYY-MM-DD_timestamp.sql.gz
```

Example: `database_backup_2024-12-20_1703030400000.sql.gz`

## Storage and Compression

- **Compression**: All backups are compressed using gzip to minimize storage usage
- **Storage Location**: Convex file storage system
- **Retention**: Only the 5 most recent successful backups are kept
- **Automatic Cleanup**: Old backups are automatically deleted when new ones are created

## Monitoring and Troubleshooting

### Checking Backup Status
Query the backup history to see recent backup attempts:

```javascript
const recentBackups = await convex.query(api.databaseBackup.getBackupHistory, {});
```

### Common Issues

1. **mysqldump not found**: Ensure `mysqldump` is installed and in PATH
2. **Database connection issues**: Verify `DATABASE_URL` is correct and accessible
3. **Permission issues**: Ensure the database user has appropriate permissions
4. **Storage issues**: Check Convex storage limits and usage

### Error Logging
Failed backups are recorded in the database with:
- Status: "failed"
- Error message: Detailed error information
- Empty storage ID (no file stored)

## Security Considerations

- Database credentials are accessed via environment variables
- Backup files are stored securely in Convex storage
- No database passwords are logged or exposed in error messages
- Access to backup downloads should be restricted to authorized users

## Recovery Process

To restore from a backup:

1. Download the backup file using the `downloadBackup` action
2. Extract the gzipped file: `gunzip backup_file.sql.gz`
3. Restore to MySQL: `mysql -u username -p database_name < backup_file.sql`

## Performance Impact

- Backups run at midnight to minimize impact on production systems
- Uses `--single-transaction` for consistency without locking tables
- Compression reduces storage requirements significantly
- Automatic cleanup prevents unlimited storage growth

## Maintenance

The backup system is designed to be self-maintaining:
- Automatic cleanup of old backups
- Error logging for monitoring
- No manual intervention required for normal operation

Monitor the backup history periodically to ensure backups are completing successfully. 