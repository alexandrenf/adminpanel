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

// Mutation to completely empty the attendance table
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all records
    const allRecords = await ctx.db.query("attendance").collect();
    
    // Delete all records
    for (const record of allRecords) {
      await ctx.db.delete(record._id);
    }
    
    return allRecords.length;
  },
});

// Mutation to bulk insert attendance records
export const bulkInsert = mutation({
  args: {
    records: v.array(v.object({
      type: v.string(),
      memberId: v.string(),
      name: v.string(),
      role: v.optional(v.string()),
      status: v.optional(v.string()),
      attendance: v.string(),
      lastUpdatedBy: v.string(),
      // Additional fields for complete CSV data
      escola: v.optional(v.string()),
      regional: v.optional(v.string()),
      cidade: v.optional(v.string()),
      uf: v.optional(v.string()),
      agFiliacao: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const insertedIds = [];
    
    for (const record of args.records) {
      const id = await ctx.db.insert("attendance", {
        ...record,
        lastUpdated: Date.now(),
      });
      insertedIds.push(id);
    }
    
    return insertedIds;
  },
});

// Mutation to reset attendance status only (not delete records)
export const resetAttendanceOnly = mutation({
  args: { lastUpdatedBy: v.string() },
  handler: async (ctx, args) => {
    // Get all records
    const allRecords = await ctx.db.query("attendance").collect();
    
    // Update all records to "not-counting"
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