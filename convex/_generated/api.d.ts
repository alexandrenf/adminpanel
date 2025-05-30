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
import type * as assemblies from "../assemblies.js";
import type * as attendance from "../attendance.js";
import type * as qrReaders from "../qrReaders.js";

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
  assemblies: typeof assemblies;
  attendance: typeof attendance;
  qrReaders: typeof qrReaders;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
