import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new session (plenária, sessão, or avulsa)
export const createSession = mutation({
  args: {
    assemblyId: v.optional(v.id("assemblies")),
    name: v.string(),
    type: v.string(), // "plenaria" | "sessao" | "avulsa"
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("agSessions", {
      assemblyId: args.assemblyId,
      name: args.name,
      type: args.type,
      status: "active",
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });

    // Initialize attendance records only for plenaria and sessao
    if (args.type !== "avulsa" && args.assemblyId) {
      await initializeSessionAttendance(
        ctx,
        sessionId,
        args.assemblyId,
        args.type,
        args.createdBy
      );
    }

    return sessionId;
  },
});

// Initialize attendance records for a session
const initializeSessionAttendance = async (
  ctx: any,
  sessionId: string,
  assemblyId: string,
  sessionType: string,
  createdBy: string
) => {
  const attendanceRecords = [];

  if (sessionType === "plenaria") {
    // For plenaria, get participants from agParticipants (CSV data)
    const participants = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly", (q: any) => q.eq("assemblyId", assemblyId))
      .collect();

    for (const participant of participants) {
      if (participant.type === "eb" || participant.type === "cr") {
        // Individual attendance for EBs and CRs
        attendanceRecords.push({
          sessionId: sessionId as any,
          assemblyId: assemblyId as any,
          participantId: participant.participantId,
          participantType: participant.type,
          participantName: participant.name,
          participantRole: participant.role,
          attendance: "not-counting",
          markedAt: Date.now(),
          markedBy: createdBy,
          lastUpdated: Date.now(),
          lastUpdatedBy: createdBy,
        });
      } else if (participant.type === "comite") {
        // Individual attendance for each comité in plenária
        attendanceRecords.push({
          sessionId: sessionId as any,
          assemblyId: assemblyId as any,
          participantId: participant.participantId,
          participantType: "comite",
          participantName: participant.participantId,
          comiteLocal: participant.participantId,
          attendance: "not-counting",
          markedAt: Date.now(),
          markedBy: createdBy,
          lastUpdated: Date.now(),
          lastUpdatedBy: createdBy,
        });
      }
    }
  } else if (sessionType === "sessao") {
    // For sessão, get from agRegistrations (people who registered for this assembly)
    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly_and_status", (q: any) => 
        q.eq("assemblyId", assemblyId).eq("status", "approved")
      )
      .collect();

    for (const registration of registrations) {
      // Individual attendance for all participants in sessões
      attendanceRecords.push({
        sessionId: sessionId as any,
        assemblyId: assemblyId as any,
        participantId: registration._id,
        participantType: "individual",
        participantName: registration.participantName,
        participantRole: registration.participantRole,
        comiteLocal: registration.comiteLocal,
        attendance: "not-counting",
        markedAt: Date.now(),
        markedBy: createdBy,
        lastUpdated: Date.now(),
        lastUpdatedBy: createdBy,
      });
    }
  }

  // Batch insert attendance records
  for (const record of attendanceRecords) {
    await ctx.db.insert("agSessionAttendance", record);
  }
};

// Get active sessions for an assembly
export const getActiveSessions = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agSessions")
      .withIndex("by_assembly_and_status", (q: any) => 
        q.eq("assemblyId", args.assemblyId).eq("status", "active")
      )
      .collect();
  },
});

// Get all sessions for an assembly (including archived)
export const getAllSessions = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agSessions")
      .withIndex("by_assembly", (q: any) => q.eq("assemblyId", args.assemblyId))
      .order("desc")
      .collect();
  },
});

// Get session details with attendance stats
export const getSessionWithStats = query({
  args: { sessionId: v.id("agSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const attendanceRecords = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .collect();

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.attendance === "present").length,
      absent: attendanceRecords.filter(r => r.attendance === "absent").length,
    };

    return {
      ...session,
      attendanceStats: stats,
      attendanceRecords,
    };
  },
});

// Mark attendance for a session participant
export const markAttendance = mutation({
  args: {
    sessionId: v.id("agSessions"),
    participantId: v.string(),
    participantType: v.string(),
    participantName: v.string(),
    participantRole: v.optional(v.string()),
    attendance: v.string(), // "present" | "absent" | "excluded" | "not-counting"
    markedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Find existing attendance record
    const existingRecord = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("participantId"), args.participantId),
          q.eq(q.field("participantType"), args.participantType)
        )
      )
      .first();

    const now = Date.now();

    if (existingRecord) {
      // Update existing record
      await ctx.db.patch(existingRecord._id, {
        attendance: args.attendance,
        lastUpdated: now,
        lastUpdatedBy: args.markedBy,
      });
      return existingRecord._id;
    } else {
      // Get session to get assemblyId
      const session = await ctx.db.get(args.sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Create new attendance record
      const newRecord = await ctx.db.insert("agSessionAttendance", {
        sessionId: args.sessionId,
        assemblyId: session.assemblyId, // Can be undefined for avulsa sessions
        participantId: args.participantId,
        participantType: args.participantType,
        participantName: args.participantName,
        participantRole: args.participantRole,
        attendance: args.attendance,
        markedAt: now,
        markedBy: args.markedBy,
        lastUpdated: now,
        lastUpdatedBy: args.markedBy,
      });

      return newRecord;
    }
  },
});

// Archive a session (finalize it)
export const archiveSession = mutation({
  args: {
    sessionId: v.id("agSessions"),
    archivedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "archived",
      archivedAt: Date.now(),
      archivedBy: args.archivedBy,
    });

    return { success: true };
  },
});

// Reopen an archived session
export const reopenSession = mutation({
  args: {
    sessionId: v.id("agSessions"),
    reopenedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "active",
      archivedAt: undefined,
      archivedBy: undefined,
    });

    return { success: true };
  },
});

// Delete a session permanently
export const deleteSession = mutation({
  args: {
    sessionId: v.id("agSessions"),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete all attendance records for this session
    const attendanceRecords = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    // Delete the session
    await ctx.db.delete(args.sessionId);

    return { success: true, message: "Session and all attendance records deleted" };
  },
});

// Get attendance records for a session organized by type
export const getSessionAttendance = query({
  args: { sessionId: v.id("agSessions") },
  handler: async (ctx, args) => {
    const attendanceRecords = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .collect();

    // Group by participant type
    const organized = {
      ebs: attendanceRecords.filter(r => r.participantType === "eb").sort((a, b) => a.participantName.localeCompare(b.participantName)),
      crs: attendanceRecords.filter(r => r.participantType === "cr").sort((a, b) => a.participantName.localeCompare(b.participantName)),
      comites: attendanceRecords.filter(r => r.participantType === "comite").sort((a, b) => a.participantName.localeCompare(b.participantName)),
      participantes: attendanceRecords.filter(r => r.participantType === "individual").sort((a, b) => a.participantName.localeCompare(b.participantName)),
    };

    return organized;
  },
});

// Get a single session with attendance records
export const getSession = query({
  args: { sessionId: v.id("agSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    // Get attendance records for this session
    const attendanceRecords = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .collect();

    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.attendance === "present").length,
      absent: attendanceRecords.filter(r => r.attendance === "absent").length,
    };

    return {
      ...session,
      attendanceStats: stats,
      attendanceRecords,
    };
  },
});

// Mark self-attendance for a participant
export const markSelfAttendance = mutation({
  args: {
    sessionId: v.id("agSessions"),
    participantId: v.string(),
    participantName: v.string(),
    participantType: v.string(), // "individual" | "user" - "individual" for registered participants, "user" for direct users
  },
  handler: async (ctx, args) => {
    // Get session first
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, error: "Sessão não encontrada." };
    }

    // Check if session is active
    if (session.status !== "active") {
      return { success: false, error: "Esta sessão não está mais ativa." };
    }

    // Check if participant has already marked attendance
    const existingRecord = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session", (q: any) => q.eq("sessionId", args.sessionId))
      .filter((q: any) => q.eq(q.field("participantId"), args.participantId))
      .first();

    if (existingRecord) {
      // Update to present if not already present
      if (existingRecord.attendance !== "present") {
        await ctx.db.patch(existingRecord._id, {
          attendance: "present",
          lastUpdated: Date.now(),
          lastUpdatedBy: args.participantId,
        });
      }
      return { success: true };
    }

    // Create new attendance record for self-marked attendance
    const now = Date.now();
    await ctx.db.insert("agSessionAttendance", {
      sessionId: args.sessionId,
      assemblyId: session.assemblyId, // Can be undefined for avulsa sessions
      participantId: args.participantId,
      participantType: args.participantType, // Now using consistent types directly
      participantName: args.participantName,
      attendance: "present",
      markedAt: now,
      markedBy: args.participantId, // Self-marked
      lastUpdated: now,
      lastUpdatedBy: args.participantId,
    });

    return { success: true };
  },
});

// Get user's attendance across all sessions for an assembly
export const getUserAttendanceStats = query({
  args: { 
    assemblyId: v.id("assemblies"),
    userId: v.string(), // NextAuth user ID
  },
  handler: async (ctx, args) => {
    // First, find the user's registration(s) for this assembly
    // This will give us the registration ID used in attendance records
    const userRegistrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly_and_registeredBy", (q: any) => 
        q.eq("assemblyId", args.assemblyId).eq("registeredBy", args.userId)
      )
      .collect();

    // Get all sessions for this assembly
    const sessions = await ctx.db
      .query("agSessions")
      .withIndex("by_assembly", (q: any) => q.eq("assemblyId", args.assemblyId))
      .collect();

    // Get all attendance records for all sessions in a single query
    const allAttendanceRecords = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_assembly", (q: any) => q.eq("assemblyId", args.assemblyId))
      .collect();

    // Create a map of session ID to attendance records for quick lookup
    const attendanceBySession = new Map();
    for (const record of allAttendanceRecords) {
      if (!attendanceBySession.has(record.sessionId)) {
        attendanceBySession.set(record.sessionId, []);
      }
      attendanceBySession.get(record.sessionId).push(record);
    }

    const attendanceData = [];
    let totalSessions = 0;
    let attendedSessions = 0;

    // Get registration IDs for quick lookup
    const registrationIds = new Set(userRegistrations.map(r => r._id.toString()));

    for (const session of sessions) {
      const sessionRecords = attendanceBySession.get(session._id) || [];
      
      // First, try to find a record matching any of the user's registrations
      let attendanceRecord = sessionRecords.find((record: { participantId: string; participantType: string }) => 
        registrationIds.has(record.participantId)
      );

      // If no registration-based record is found, look for a user-based record
      if (!attendanceRecord) {
        attendanceRecord = sessionRecords.find((record: { participantId: string; participantType: string }) => 
          record.participantType === "user" && record.participantId === args.userId
        );
      }

      if (attendanceRecord) {
        totalSessions++;
        const isPresent = attendanceRecord.attendance === "present";
        if (isPresent) attendedSessions++;

        attendanceData.push({
          sessionId: session._id,
          sessionName: session.name,
          sessionType: session.type,
          sessionStatus: session.status,
          attendance: attendanceRecord.attendance,
          markedAt: attendanceRecord.markedAt,
        });
      }
    }

    const attendancePercentage = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

    return {
      sessions: attendanceData,
      stats: {
        totalSessions,
        attendedSessions,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
      },
    };
  },
}); 