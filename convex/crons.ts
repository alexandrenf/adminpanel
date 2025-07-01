import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily database backup at midnight UTC
crons.daily(
  "daily database backup",
  { hourUTC: 0, minuteUTC: 0 }, // Every day at midnight UTC
  internal.databaseBackup.createDatabaseBackup,
);

// Alternative cron syntax (commented out - same schedule as above)
// crons.cron(
//   "daily database backup",
//   "0 0 * * *", // Every day at midnight UTC
//   internal.databaseBackup.createDatabaseBackup,
// );

export default crons; 