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
    // Get all records
    const allRecords = await ctx.db.query("attendance").collect();
    
    // Delete all records using the database API
    for (const record of allRecords) {
      try {
        // Delete the document from the database
        await ctx.db.delete(record._id);
      } catch (error) {
        console.error(`Failed to delete record ${record._id}:`, error);
      }
    }
    
    // Verify deletion by checking if any records remain
    const remainingRecords = await ctx.db.query("attendance").collect();
    if (remainingRecords.length > 0) {
      console.error(`Failed to delete all records. ${remainingRecords.length} records remain.`);
    }
    
    return allRecords.length;
  },
}); 