/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiAssistant from "../aiAssistant.js";
import type * as authSessions from "../authSessions.js";
import type * as conversations from "../conversations.js";
import type * as courses from "../courses.js";
import type * as deadlines from "../deadlines.js";
import type * as focusSessions from "../focusSessions.js";
import type * as notifications from "../notifications.js";
import type * as offlineQueue from "../offlineQueue.js";
import type * as password from "../password.js";
import type * as seed from "../seed.js";
import type * as semesters from "../semesters.js";
import type * as sessions from "../sessions.js";
import type * as social from "../social.js";
import type * as users from "../users.js";
import type * as workload from "../workload.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiAssistant: typeof aiAssistant;
  authSessions: typeof authSessions;
  conversations: typeof conversations;
  courses: typeof courses;
  deadlines: typeof deadlines;
  focusSessions: typeof focusSessions;
  notifications: typeof notifications;
  offlineQueue: typeof offlineQueue;
  password: typeof password;
  seed: typeof seed;
  semesters: typeof semesters;
  sessions: typeof sessions;
  social: typeof social;
  users: typeof users;
  workload: typeof workload;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
