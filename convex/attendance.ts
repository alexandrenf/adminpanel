import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Query to get all attendance records
export const getAll = query({
  handler: async (ctx) => {
    return await ctx.db.query("attendance").collect();
  },
});

// Query to get attendance by type
export const getByType = query({
  args: { type: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendance")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();
  },
});

// Mutation to update attendance
export const updateAttendance = mutation({
  args: {
    type: v.string(),
    memberId: v.string(),
    name: v.string(),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    attendance: v.string(),
    lastUpdatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .filter((q) => q.eq(q.field("memberId"), args.memberId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        attendance: args.attendance,
        lastUpdated: Date.now(),
        lastUpdatedBy: args.lastUpdatedBy,
      });
    } else {
      return await ctx.db.insert("attendance", {
        ...args,
        lastUpdated: Date.now(),
      });
    }
  },
});

// Mutation to reset all attendance
export const resetAll = mutation({
  args: { lastUpdatedBy: v.string() },
  handler: async (ctx, args) => {
    const allRecords = await ctx.db.query("attendance").collect();
    for (const record of allRecords) {
      await ctx.db.patch(record._id, {
        attendance: "not-counting",
        lastUpdated: Date.now(),
        lastUpdatedBy: args.lastUpdatedBy,
      });
    }
    return allRecords.length;
  },
}); 