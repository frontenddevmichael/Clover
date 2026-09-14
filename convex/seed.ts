import { mutation } from './_generated/server';
import { v } from 'convex/values';

// Seed demo data for a new user — Nigerian university student
export const seedDemoData = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const userId = args.userId;

    // Check if data already exists
    const existing = await ctx.db
      .query('courses')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    if (existing) return 'already_seeded';

    // Create semester
    const semesterId = await ctx.db.insert('semesters', {
      userId,
      name: '2026/2027 Harmattan',
      startDate: '2026-09-01',
      endDate: '2026-12-20',
      examStart: '2026-12-07',
      examEnd: '2026-12-20',
    });

    // Create courses
    const courses = [
      { code: 'MTH201', title: 'Linear Algebra I', color: '#B0C4B1' },
      { code: 'CSC301', title: 'Data Structures & Algorithms', color: '#8FB3D9' },
      { code: 'PHY102', title: 'General Physics II', color: '#D98080' },
      { code: 'GST112', title: 'Use of English', color: '#C4A882' },
      { code: 'CSC303', title: 'Operating Systems', color: '#A8D8B9' },
    ];

    const courseIds: Record<string, string> = {};
    for (const c of courses) {
      const id = await ctx.db.insert('courses', {
        userId,
        code: c.code,
        title: c.title,
        color: c.color,
        semesterId: semesterId as any,
      });
      courseIds[c.code] = id;
    }

    // Create sessions — weekly timetable
    const sessions = [
      { courseId: courseIds['MTH201'], type: 'lecture' as const, dayOfWeek: 1, startTime: '09:00', endTime: '11:00', location: 'New LT' },
      { courseId: courseIds['MTH201'], type: 'tutorial' as const, dayOfWeek: 3, startTime: '14:00', endTime: '16:00', location: 'Math Block' },
      { courseId: courseIds['CSC301'], type: 'lecture' as const, dayOfWeek: 1, startTime: '14:00', endTime: '16:00', location: 'CS Lab 1' },
      { courseId: courseIds['CSC301'], type: 'lab' as const, dayOfWeek: 3, startTime: '09:00', endTime: '11:00', location: 'CS Lab 2' },
      { courseId: courseIds['PHY102'], type: 'lecture' as const, dayOfWeek: 2, startTime: '10:00', endTime: '12:00', location: 'Physics Lab' },
      { courseId: courseIds['PHY102'], type: 'lab' as const, dayOfWeek: 4, startTime: '14:00', endTime: '16:00', location: 'Physics Lab' },
      { courseId: courseIds['GST112'], type: 'lecture' as const, dayOfWeek: 4, startTime: '10:00', endTime: '12:00', location: 'New LT' },
      { courseId: courseIds['CSC303'], type: 'lecture' as const, dayOfWeek: 2, startTime: '14:00', endTime: '16:00', location: 'Hall 5' },
      { courseId: courseIds['CSC303'], type: 'tutorial' as const, dayOfWeek: 5, startTime: '09:00', endTime: '11:00', location: 'CS Lab 1' },
      { courseId: courseIds['MTH201'], type: 'study' as const, dayOfWeek: 5, startTime: '09:00', endTime: '11:00', location: 'Library' },
    ];

    for (const s of sessions) {
      await ctx.db.insert('sessions', {
        userId,
        courseId: s.courseId as any,
        type: s.type,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        isRecurring: true,
        recurrencePattern: 'weekly',
      });
    }

    // Create deadlines
    const deadlines = [
      { courseId: courseIds['MTH201'], title: 'MTH201 Problem Set 3', type: 'assignment' as const, dueDate: '2026-09-14', dueTime: '23:59' },
      { courseId: courseIds['CSC301'], title: 'CSC301 Programming Assignment', type: 'assignment' as const, dueDate: '2026-09-16', dueTime: '18:00' },
      { courseId: courseIds['PHY102'], title: 'PHY102 Lab Report', type: 'assignment' as const, dueDate: '2026-09-18', dueTime: '12:00' },
      { courseId: courseIds['MTH201'], title: 'MTH201 Continuous Assessment', type: 'ca' as const, dueDate: '2026-09-22', dueTime: '10:00' },
      { courseId: courseIds['GST112'], title: 'GST112 Essay Submission', type: 'assignment' as const, dueDate: '2026-09-20', dueTime: '17:00' },
      { courseId: courseIds['CSC303'], title: 'CSC303 Mid-Semester Test', type: 'ca' as const, dueDate: '2026-09-25', dueTime: '09:00' },
    ];

    for (const d of deadlines) {
      await ctx.db.insert('deadlines', {
        userId,
        courseId: d.courseId as any,
        title: d.title,
        type: d.type,
        dueDate: d.dueDate,
        dueTime: d.dueTime,
        completed: false,
      });
    }

    return 'seeded';
  },
});
