import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ── Users (FR1, FR2) ──
  users: defineTable({
    email: v.string(),
    name: v.string(),
    institution: v.string(),
    department: v.string(),
    level: v.number(),
    passcodeHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_institution', ['institution']),

  // ── Courses (FR4) ──
  courses: defineTable({
    userId: v.id('users'),
    code: v.string(), // e.g. "MTH201"
    title: v.string(), // e.g. "Linear Algebra I"
    color: v.string(), // hex from course tag palette
    semesterId: v.optional(v.id('semesters')),
  })
    .index('by_user', ['userId'])
    .index('by_user_semester', ['userId', 'semesterId']),

  // ── Sessions (FR5, FR6) ──
  sessions: defineTable({
    userId: v.id('users'),
    courseId: v.id('courses'),
    type: v.union(
      v.literal('lecture'),
      v.literal('lab'),
      v.literal('tutorial'),
      v.literal('study'),
      v.literal('revision')
    ),
    dayOfWeek: v.number(), // 0=Sun..6=Sat — null for one-off
    startTime: v.string(), // "HH:MM" 24h
    endTime: v.string(),
    location: v.optional(v.string()), // room / venue, shown on schedule cards
    isRecurring: v.boolean(),
    date: v.optional(v.string()), // "YYYY-MM-DD" for one-off sessions
    recurrencePattern: v.optional(
      v.union(v.literal('weekly'), v.literal('biweekly'), v.literal('custom'))
    ),
  })
    .index('by_user', ['userId'])
    .index('by_course', ['courseId'])
    .index('by_user_day', ['userId', 'dayOfWeek']),

  // ── Deadlines (FR10) ──
  deadlines: defineTable({
    userId: v.id('users'),
    courseId: v.id('courses'),
    title: v.string(),
    type: v.union(
      v.literal('assignment'),
      v.literal('ca'),
      v.literal('exam')
    ),
    dueDate: v.string(), // "YYYY-MM-DD"
    dueTime: v.optional(v.string()), // "HH:MM"
    completed: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_date', ['userId', 'dueDate'])
    .index('by_course', ['courseId']),

  // ── Semesters (FR14) ──
  semesters: defineTable({
    userId: v.id('users'),
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    examStart: v.optional(v.string()),
    examEnd: v.optional(v.string()),
  }).index('by_user', ['userId']),

  // ── Offline write queue (FR28–29) ──
  offlineQueue: defineTable({
    userId: v.id('users'),
    collection: v.string(),
    documentId: v.optional(v.string()),
    operation: v.union(
      v.literal('insert'),
      v.literal('patch'),
      v.literal('delete')
    ),
    data: v.any(),
    createdAt: v.number(),
    synced: v.boolean(),
  }).index('by_user_synced', ['userId', 'synced']),

  // ── Course rooms (FR21–24) ──
  courseRooms: defineTable({
    userId: v.id('users'),
    courseCode: v.string(),
    institution: v.string(),
    shareFreeTime: v.boolean(),
    joinedAt: v.number(),
  })
    .index('by_user_course', ['userId', 'courseCode'])
    .index('by_course', ['courseCode']),

  // ── Auth sessions ──
  // The client stores only an opaque random token (SecureStore); the raw value
  // is never sent over the wire again — the server stores a SHA-256 hash of it
  // and resolves it to a user. Tokens expire and are revocable.
  authSessions: defineTable({
    userId: v.id('users'),
    tokenHash: v.string(), // sha256(token), hex
    createdAt: v.number(),
    expiresAt: v.number(), // epoch ms
  })
    .index('by_token', ['tokenHash'])
    .index('by_user', ['userId']),
});
