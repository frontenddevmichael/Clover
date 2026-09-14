// Server-issued auth sessions.
// The client authenticates once (signup/login) and receives an opaque random
// token. Only a SHA-256 hash of the token is stored server-side, so a
// database leak does not leak usable session credentials. The client stores
// the token in SecureStore and exchanges it for a userId on every cold start.

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_BYTES = 32; // 256 bits of entropy

function subtle(): SubtleCrypto {
  const s = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (!s) throw new Error('WebCrypto unavailable in this runtime');
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await subtle().digest(
    'SHA-256',
    new TextEncoder().encode(input) as BufferSource
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0')
  ).join('');
}

// ── Create a session for a user; returns the opaque token (shown once) ──
// Plain helper (not a registered function) so callers in users.ts invoke it
// directly within their own transaction — no runMutation hop, no api import.
export async function createSessionForUser(
  ctx: MutationCtx,
  userId: Id<'users'>
): Promise<{ token: string; expiresAt: number }> {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  await ctx.db.insert('authSessions', {
    userId,
    tokenHash: await sha256Hex(token),
    createdAt: now,
    expiresAt,
  });
  return { token, expiresAt };
}

// ── Resolve a token to its user; null when invalid/expired/revoked ──
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!/^[0-9a-f]{64}$/.test(args.token)) return null;
    const tokenHash = await sha256Hex(args.token);
    const session = await ctx.db
      .query('authSessions')
      .withIndex('by_token', (q) => q.eq('tokenHash', tokenHash))
      .unique();
    if (!session) return null;
    if (session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    // Never expose the passcode hash to the client.
    const { passcodeHash: _ignored, ...safeUser } = user;
    return { user: safeUser };
  },
});

// ── Revoke one session (logout) ──
export const revokeSession = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await sha256Hex(args.token);
    const session = await ctx.db
      .query('authSessions')
      .withIndex('by_token', (q) => q.eq('tokenHash', tokenHash))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

// ── Revoke every session for a user (passcode change / account deletion) ──
// Plain helper; see createSessionForUser.
export async function revokeAllSessionsForUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
  exceptToken?: string
): Promise<void> {
  const exceptHash = exceptToken ? await sha256Hex(exceptToken) : null;
  const sessions = await ctx.db
    .query('authSessions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const s of sessions) {
    if (exceptHash && s.tokenHash === exceptHash) continue;
    await ctx.db.delete(s._id);
  }
}
