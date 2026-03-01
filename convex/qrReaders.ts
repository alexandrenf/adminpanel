import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nanoid } from "nanoid";

// Get all active QR readers
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("qrReaders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();
  },
});

// Get QR readers for a specific session
export const getBySession = query({
  args: { sessionId: v.id("agSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("qrReaders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get QR readers for a specific assembly (legacy/general readers)
export const getByAssembly = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("qrReaders")
      .withIndex("by_assembly", (q) => q.eq("assemblyId", args.assemblyId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Get QR reader by token
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const reader = await ctx.db
      .query("qrReaders")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!reader) return null;

    // If it's a session-specific reader, also return session info
    if (reader.sessionId) {
      const session = await ctx.db.get(reader.sessionId);
      const assembly = reader.assemblyId ? await ctx.db.get(reader.assemblyId) : null;
      
      return {
        ...reader,
        session,
        assembly,
      };
    }

    return reader;
  },
});

// Create a new QR reader (legacy/general)
export const create = mutation({
  args: {
    name: v.string(),
    createdBy: v.string(),
  },
  handler: async () => {
    // General readers are intentionally disabled to avoid readers without session binding.
    throw new Error(
      "A criação de leitores gerais foi desativada. Use 'Novo Leitor QR' em uma sessão ativa."
    );
  },
});

// Create a session-specific QR reader
export const createForSession = mutation({
  args: {
    name: v.string(),
    sessionId: v.id("agSessions"),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Get session info to populate sessionType and assemblyId
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const token = nanoid(16); // Generate a unique 16-character token
    
    const id = await ctx.db.insert("qrReaders", {
      name: args.name,
      token,
      sessionId: args.sessionId,
      sessionType: session.type,
      assemblyId: session.assemblyId,
      createdAt: Date.now(),
      createdBy: args.createdBy,
      isActive: true,
    });

    return { id, token };
  },
});

// Delete a QR reader (actually delete from database)
export const remove = mutation({
  args: {
    id: v.id("qrReaders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Clear all QR readers (actually delete from database)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const readers = await ctx.db
      .query("qrReaders")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const reader of readers) {
      await ctx.db.delete(reader._id);
    }

    return readers.length;
  },
});

// Clear QR readers for a specific session
export const clearForSession = mutation({
  args: { sessionId: v.id("agSessions") },
  handler: async (ctx, args) => {
    const readers = await ctx.db
      .query("qrReaders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    for (const reader of readers) {
      await ctx.db.delete(reader._id);
    }

    return readers.length;
  },
}); 
