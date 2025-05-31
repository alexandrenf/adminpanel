import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new session (plenária, sessão, or avulsa)
export const createSession = mutation({
  args: {
    assemblyId: v.id("assemblies"),
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

    // Create attendance records based on session type
    if (args.type === "plenaria" || args.type === "sessao") {
      await initializeSessionAttendance(ctx, sessionId, args.assemblyId, args.type, args.createdBy);
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
  // Get all approved registrations for this assembly
  const registrations = await ctx.db
    .query("agRegistrations")
    .withIndex("by_assembly_and_status", (q: any) => 
      q.eq("assemblyId", assemblyId).eq("status", "approved")
    )
    .collect();

  const attendanceRecords = [];
  const processedComites = new Set<string>();

  for (const registration of registrations) {
    if (registration.participantType === "eb" || registration.participantType === "cr") {
      // Individual attendance for EBs and CRs
      attendanceRecords.push({
        sessionId: sessionId as any,
        assemblyId: assemblyId as any,
        participantId: registration._id,
        participantType: registration.participantType,
        participantName: registration.participantName,
        participantRole: registration.participantRole,
        attendance: "absent",
        markedAt: Date.now(),
        markedBy: createdBy,
        lastUpdated: Date.now(),
        lastUpdatedBy: createdBy,
      });
    } else if (
      (registration.participantType === "comite_local" || registration.participantType === "comite") &&
      registration.comiteLocal &&
      !processedComites.has(registration.comiteLocal) &&
      sessionType === "plenaria"
    ) {
      // Group attendance for Comitês Locais in plenárias only
      processedComites.add(registration.comiteLocal);
      attendanceRecords.push({
        sessionId: sessionId as any,
        assemblyId: assemblyId as any,
        participantId: registration.comiteLocal, // Use comité name as ID for group
        participantType: "comite_local",
        participantName: registration.comiteLocal,
        comiteLocal: registration.comiteLocal,
        attendance: "absent",
        markedAt: Date.now(),
        markedBy: createdBy,
        lastUpdated: Date.now(),
        lastUpdatedBy: createdBy,
      });
    } else if (sessionType === "sessao") {
      // Individual attendance for all participants in sessões
      attendanceRecords.push({
        sessionId: sessionId as any,
        assemblyId: assemblyId as any,
        participantId: registration._id,
        participantType: "individual",
        participantName: registration.participantName,
        participantRole: registration.participantRole,
        comiteLocal: registration.comiteLocal,
        attendance: "absent",
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

// Mark attendance for a participant
export const markAttendance = mutation({
  args: {
    sessionId: v.id("agSessions"),
    participantId: v.string(),
    attendance: v.string(), // "present" | "absent"
    markedBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the attendance record
    const attendanceRecord = await ctx.db
      .query("agSessionAttendance")
      .withIndex("by_session_and_participant", (q: any) => 
        q.eq("sessionId", args.sessionId).eq("participantId", args.participantId)
      )
      .first();

    if (!attendanceRecord) {
      throw new Error("Attendance record not found");
    }

    // Update the attendance
    await ctx.db.patch(attendanceRecord._id, {
      attendance: args.attendance,
      lastUpdated: Date.now(),
      lastUpdatedBy: args.markedBy,
    });

    return { success: true };
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
      comites: attendanceRecords.filter(r => r.participantType === "comite_local").sort((a, b) => a.participantName.localeCompare(b.participantName)),
      participantes: attendanceRecords.filter(r => r.participantType === "individual").sort((a, b) => a.participantName.localeCompare(b.participantName)),
    };

    return organized;
  },
});

// Get user's attendance across all sessions for an assembly
export const getUserAttendanceStats = query({
  args: { 
    assemblyId: v.id("assemblies"),
    userId: v.string(), // Registration ID or participant identifier
  },
  handler: async (ctx, args) => {
    // Get all sessions for this assembly
    const sessions = await ctx.db
      .query("agSessions")
      .withIndex("by_assembly", (q: any) => q.eq("assemblyId", args.assemblyId))
      .collect();

    const attendanceData = [];
    let totalSessions = 0;
    let attendedSessions = 0;

    for (const session of sessions) {
      const attendanceRecord = await ctx.db
        .query("agSessionAttendance")
        .withIndex("by_session_and_participant", (q: any) => 
          q.eq("sessionId", session._id).eq("participantId", args.userId)
        )
        .first();

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