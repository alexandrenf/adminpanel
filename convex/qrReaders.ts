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

// Get QR reader by token
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("qrReaders")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// Create a new QR reader
export const create = mutation({
  args: {
    name: v.string(),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const token = nanoid(16); // Generate a unique 16-character token
    
    const id = await ctx.db.insert("qrReaders", {
      name: args.name,
      token,
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