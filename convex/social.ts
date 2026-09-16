import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ── Course rooms (FR21) ──
// A "course room" is a shared space per course code + institution.
// Members can see aggregate free-time overlap and shared deadlines.

export const joinRoom = mutation({
  args: {
    userId: v.id('users'),
    courseCode: v.string(),
    institution: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user is already in this room
    const existing = await ctx.db
      .query('courseRooms')
      .withIndex('by_user_course', (q) =>
        q
          .eq('userId', args.userId)
          .eq('courseCode', args.courseCode)
      )
      .unique();

    if (existing) return existing._id;

    return ctx.db.insert('courseRooms', {
      userId: args.userId,
      courseCode: args.courseCode,
      institution: args.institution,
      shareFreeTime: false, // opt-in, off by default (FR24)
      joinedAt: Date.now(),
    });
  },
});

// ── Leave a course room ──
export const leaveRoom = mutation({
  args: {
    userId: v.id('users'),
    courseCode: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query('courseRooms')
      .withIndex('by_user_course', (q) =>
        q
          .eq('userId', args.userId)
          .eq('courseCode', args.courseCode)
      )
      .unique();
    if (room) await ctx.db.delete(room._id);
  },
});

// ── Toggle free-time sharing (FR22, FR24) ──
export const toggleSharing = mutation({
  args: {
    userId: v.id('users'),
    courseCode: v.string(),
    share: v.boolean(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query('courseRooms')
      .withIndex('by_user_course', (q) =>
        q
          .eq('userId', args.userId)
          .eq('courseCode', args.courseCode)
      )
      .unique();
    if (room) {
      await ctx.db.patch(room._id, { shareFreeTime: args.share });
      return;
    }
    // No membership yet — opting into sharing implies joining the room.
    // (The switch would otherwise be a dead control for never-joined courses.)
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found.');
    await ctx.db.insert('courseRooms', {
      userId: args.userId,
      courseCode: args.courseCode,
      institution: user.institution,
      shareFreeTime: args.share,
      joinedAt: Date.now(),
    });
  },
});

// ── Get course room members (FR21–23, NFR6) ──
// Scoped to one institution (a room is course code + institution).
// Members who have NOT opted in to sharing appear anonymized — their name
// and department are never exposed (NFR6).
export const getRoomMembers = query({
  args: {
    courseCode: v.string(),
    institution: v.string(),
  },
  handler: async (ctx, args) => {
    const rooms = await ctx.db
      .query('courseRooms')
      .withIndex('by_course', (q) =>
        q.eq('courseCode', args.courseCode)
      )
      .collect();

    const members = await Promise.all(
      rooms
        .filter((room) => room.institution === args.institution)
        .map(async (room) => {
          const user = await ctx.db.get(room.userId);
          return {
            userId: room.shareFreeTime ? room.userId : ('anon_' + room._id) as string,
            name: room.shareFreeTime ? user?.name ?? 'Anonymous' : 'Anonymous',
            department: room.shareFreeTime ? user?.department ?? '' : '',
            shareFreeTime: room.shareFreeTime,
          };
        })
    );

    return members;
  },
});

// ── Get aggregate free-time overlap (FR23) ──
// Only returns anonymized data from members who opted in.
// Scoped to one institution.
export const getFreeTimeOverlap = query({
  args: {
    courseCode: v.string(),
    institution: v.string(),
    dayOfWeek: v.number(),
  },
  handler: async (ctx, args) => {
    const rooms = (await ctx.db
      .query('courseRooms')
      .withIndex('by_course', (q) =>
        q.eq('courseCode', args.courseCode)
      )
      .collect()).filter((room) => room.institution === args.institution);

    // Only include members who opted in (FR22, FR24)
    const sharingMembers = rooms.filter((r) => r.shareFreeTime);
    if (sharingMembers.length === 0) return { overlapSlots: [], memberCount: 0 };

    // Get sessions for each sharing member on this day
    const memberSessions: Array<{
      userId: string;
      busySlots: Array<{ start: string; end: string }>;
    }> = [];

    for (const member of sharingMembers) {
      const sessions = await ctx.db
        .query('sessions')
        .withIndex('by_user_day', (q) =>
          q
            .eq('userId', member.userId)
            .eq('dayOfWeek', args.dayOfWeek)
        )
        .collect();

      memberSessions.push({
        userId: member.userId, // anonymized in response
        busySlots: sessions.map((s) => ({
          start: s.startTime,
          end: s.endTime,
        })),
      });
    }

    // Calculate free-time overlap (hours when all sharing members are free)
    // Divide day into 30-min slots from 8:00 to 20:00
    const overlapSlots: Array<{
      start: string;
      end: string;
      freeCount: number;
    }> = [];

    for (let hour = 8; hour < 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const slotStart = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        const slotEndMin = min + 30;
        const slotEnd = `${String(hour + Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`;

        let freeCount = 0;
        for (const member of memberSessions) {
          const isBusy = member.busySlots.some(
            (busy) => busy.start < slotEnd && busy.end > slotStart
          );
          if (!isBusy) freeCount++;
        }

        if (freeCount > 0) {
          overlapSlots.push({ start: slotStart, end: slotEnd, freeCount });
        }
      }
    }

    return {
      overlapSlots,
      memberCount: sharingMembers.length,
    };
  },
});

// ── Get all rooms a user has joined ──
export const getUserRooms = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('courseRooms')
      .withIndex('by_user_course', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// ── Get shared deadlines for a course room (FR23) ──
// Aggregated only from room members of the given institution, so deadlines
// never leak across campuses.
export const getSharedDeadlines = query({
  args: {
    courseCode: v.string(),
    institution: v.string(),
  },
  handler: async (ctx, args) => {
    // Room members of this course + institution
    const rooms = (await ctx.db
      .query('courseRooms')
      .withIndex('by_course', (q) =>
        q.eq('courseCode', args.courseCode)
      )
      .collect()).filter((room) => room.institution === args.institution);
    const memberIds = new Set(rooms.map((room) => room.userId));

    // Their courses with this code
    const memberCourses = await Promise.all(
      Array.from(memberIds).map((userId) =>
        ctx.db
          .query('courses')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .collect()
      )
    );
    const matchingCourses = memberCourses
      .flat()
      .filter((c) => c.code === args.courseCode);

    const deadlines: Array<{
      title: string;
      type: string;
      dueDate: string;
      dueTime?: string;
    }> = [];

    for (const course of matchingCourses) {
      const courseDeadlines = await ctx.db
        .query('deadlines')
        .withIndex('by_course', (q) => q.eq('courseId', course._id))
        .collect();

      for (const d of courseDeadlines) {
        if (!d.completed) {
          deadlines.push({
            title: d.title,
            type: d.type,
            dueDate: d.dueDate,
            dueTime: d.dueTime,
          });
        }
      }
    }

    // Deduplicate by title + dueDate
    const seen = new Set<string>();
    return deadlines.filter((d) => {
      const key = `${d.title}_${d.dueDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },
});
