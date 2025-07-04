/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agConfig from "../agConfig.js";
import type * as agRegistrations from "../agRegistrations.js";
import type * as agSessions from "../agSessions.js";
import type * as assemblies from "../assemblies.js";
import type * as attendance from "../attendance.js";
import type * as backupUtils from "../backupUtils.js";
import type * as crons from "../crons.js";
import type * as databaseBackup from "../databaseBackup.js";
import type * as databaseBackupMutations from "../databaseBackupMutations.js";
import type * as files from "../files.js";
import type * as qrReaders from "../qrReaders.js";
import type * as registrationModalities from "../registrationModalities.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agConfig: typeof agConfig;
  agRegistrations: typeof agRegistrations;
  agSessions: typeof agSessions;
  assemblies: typeof assemblies;
  attendance: typeof attendance;
  backupUtils: typeof backupUtils;
  crons: typeof crons;
  databaseBackup: typeof databaseBackup;
  databaseBackupMutations: typeof databaseBackupMutations;
  files: typeof files;
  qrReaders: typeof qrReaders;
  registrationModalities: typeof registrationModalities;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
