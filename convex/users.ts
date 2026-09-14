import { query, mutation } from './_generated/server';
import { v } from 'convex/values';
import {
  hashPasscode,
  verifyPasscode,
  isModernHash,
  hashLegacyPasscode,
} from './password';
import {
  createSessionForUser,
  revokeAllSessionsForUser,
} from './authSessions';

// ── Sign up (FR1) — creates user with passcode ──
export const signup = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    institution: v.string(),
    department: v.string(),
    level: v.number(),
    passcode: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
    if (existing) throw new Error('An account with this email already exists.');
    if (args.passcode.length < 4) {
      throw new Error('Passcode must be at least 4 digits.');
    }

    const passcodeHash = await hashPasscode(args.passcode);

    const userId = await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      institution: args.institution,
      department: args.department,
      level: args.level,
      passcodeHash,
      createdAt: Date.now(),
    });

    // Issue an opaque session token; the client stores this, never the userId.
    const { token, expiresAt } = await createSessionForUser(ctx, userId);
    return { userId, token, expiresAt };
  },
});

// ── Login — verify email + passcode ──
// Legacy (pre-PBKDF2) hashes are verified with the old scheme and then
// transparently upgraded to PBKDF2 on successful login.
export const login = mutation({
  args: {
    email: v.string(),
    passcode: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
    if (!user || !user.passcodeHash) {
      throw new Error('No account found with this email.');
    }

    let ok: boolean;
    if (isModernHash(user.passcodeHash)) {
      ok = await verifyPasscode(args.passcode, user.passcodeHash);
    } else {
      ok = hashLegacyPasscode(args.passcode) === user.passcodeHash;
      if (ok) {
        // Upgrade to PBKDF2 so the weak legacy hash leaves the database.
        await ctx.db.patch(user._id, {
          passcodeHash: await hashPasscode(args.passcode),
        });
      }
    }

    if (!ok) throw new Error('Incorrect passcode.');

    const { token, expiresAt } = await createSessionForUser(ctx, user._id);
    return { userId: user._id, token, expiresAt };
  },
});

// ── Change passcode — requires the CURRENT passcode (FR1/NFR7) ──
// Replaces the old resetPasscode, which let anyone take over any account
// knowing only the email address.
export const changePasscode = mutation({
  args: {
    id: v.id('users'),
    currentPasscode: v.string(),
    newPasscode: v.string(),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user || !user.passcodeHash) {
      throw new Error('Account not found.');
    }
    if (args.newPasscode.length < 4) {
      throw new Error('Passcode must be at least 4 digits.');
    }

    const ok = isModernHash(user.passcodeHash)
      ? await verifyPasscode(args.currentPasscode, user.passcodeHash)
      : hashLegacyPasscode(args.currentPasscode) === user.passcodeHash;
    if (!ok) throw new Error('Current passcode is incorrect.');

    await ctx.db.patch(user._id, {
      passcodeHash: await hashPasscode(args.newPasscode),
    });

    // Passcode changed — kill every other session (stolen-device protection).
    await revokeAllSessionsForUser(ctx, user._id, args.sessionToken);
    return user._id;
  },
});

// ── Get user by ID ──
export const getById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

// ── Get current user (by email) ──
export const getCurrentUser = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .unique();
  },
});

// ── Update profile (FR2) ──
export const updateProfile = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    institution: v.optional(v.string()),
    department: v.optional(v.string()),
    level: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    const updates: Record<string, unknown> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.institution !== undefined) updates.institution = fields.institution;
    if (fields.department !== undefined) updates.department = fields.department;
    if (fields.level !== undefined) updates.level = fields.level;
    await ctx.db.patch(id, updates);
  },
});

// ── Delete account and all data (FR3, NFR8) ──
export const deleteAccount = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const courses = await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', args.id))
      .collect();
    for (const course of courses) {
      const sessions = await ctx.db
        .query('sessions')
        .withIndex('by_course', (q) => q.eq('courseId', course._id))
        .collect();
      for (const s of sessions) await ctx.db.delete(s._id);

      const deadlines = await ctx.db
        .query('deadlines')
        .withIndex('by_course', (q) => q.eq('courseId', course._id))
        .collect();
      for (const d of deadlines) await ctx.db.delete(d._id);

      await ctx.db.delete(course._id);
    }

    const semesters = await ctx.db
      .query('semesters')
      .withIndex('by_user', (q) => q.eq('userId', args.id))
      .collect();
    for (const s of semesters) await ctx.db.delete(s._id);

    const queue = await ctx.db
      .query('offlineQueue')
      .withIndex('by_user_synced', (q) => q.eq('userId', args.id))
      .collect();
    for (const q of queue) await ctx.db.delete(q._id);

    // Course-room memberships are per-user too — remove them so no orphaned
    // membership keeps leaking presence into rooms after deletion (NFR8).
    const rooms = await ctx.db
      .query('courseRooms')
      .withIndex('by_user_course', (q) => q.eq('userId', args.id))
      .collect();
    for (const r of rooms) await ctx.db.delete(r._id);

    // Sessions must die with the account.
    await revokeAllSessionsForUser(ctx, args.id);

    await ctx.db.delete(args.id);
  },
});
