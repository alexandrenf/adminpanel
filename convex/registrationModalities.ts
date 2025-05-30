import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all modalities for an assembly
export const getByAssembly = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .order("asc")
      .collect();
  },
});

// Get active modalities for an assembly
export const getActiveByAssembly = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly_and_active")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("isActive"), true)
        )
      )
      .order("asc")
      .collect();
  },
});

// Get modality by ID
export const getById = query({
  args: { id: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get modality statistics with current registration count
export const getModalityStats = query({
  args: { modalityId: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    const modality = await ctx.db.get(args.modalityId);
    if (!modality) {
      return null;
    }

    // Count only active registrations (not rejected or cancelled)
    const activeRegistrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_modality")
      .filter((q) => q.eq(q.field("modalityId"), args.modalityId))
      .collect();

    const currentCount = activeRegistrations.filter(r => 
      r.status !== "rejected" && r.status !== "cancelled"
    ).length;

    return {
      ...modality,
      currentRegistrations: currentCount,
      isFull: modality.maxParticipants ? currentCount >= modality.maxParticipants : false,
      isNearFull: modality.maxParticipants ? currentCount >= (modality.maxParticipants * 0.9) : false,
      activeRegistrations: activeRegistrations.filter(r => 
        r.status !== "rejected" && r.status !== "cancelled"
      ),
      byStatus: activeRegistrations.reduce((acc, reg) => {
        acc[reg.status] = (acc[reg.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

// Create a new modality
export const create = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    maxParticipants: v.optional(v.number()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the current max order for this assembly
    const existingModalities = await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();

    const maxOrder = Math.max(0, ...existingModalities.map(m => m.order));

    return await ctx.db.insert("registrationModalities", {
      assemblyId: args.assemblyId,
      name: args.name,
      description: args.description,
      price: args.price,
      maxParticipants: args.maxParticipants,
      isActive: true,
      order: maxOrder + 1,
      createdAt: Date.now(),
      createdBy: args.createdBy,
    });
  },
});

// Update a modality
export const update = mutation({
  args: {
    id: v.id("registrationModalities"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    
    // Filter out undefined values
    const updates = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(updates).length === 0) {
      return id;
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Delete a modality
export const remove = mutation({
  args: { id: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    // Check if any registrations use this modality
    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_modality")
      .filter((q) => q.eq(q.field("modalityId"), args.id))
      .collect();

    if (registrations.length > 0) {
      throw new Error("Cannot delete modality with existing registrations");
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Get modality statistics
export const getStats = query({
  args: { modalityId: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    const modality = await ctx.db.get(args.modalityId);
    if (!modality) {
      throw new Error("Modality not found");
    }

    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_modality")
      .filter((q) => q.eq(q.field("modalityId"), args.modalityId))
      .collect();

    const activeRegistrations = registrations.filter(r => 
      r.status !== "cancelled" && r.status !== "rejected"
    );

    return {
      total: registrations.length,
      active: activeRegistrations.length,
      maxParticipants: modality.maxParticipants,
      isFull: modality.maxParticipants ? activeRegistrations.length >= modality.maxParticipants : false,
      byStatus: registrations.reduce((acc, reg) => {
        acc[reg.status] = (acc[reg.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

// Get all registrations for a specific modality
export const getRegistrations = query({
  args: { modalityId: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_modality")
      .filter((q) => q.eq(q.field("modalityId"), args.modalityId))
      .order("desc")
      .collect();
  },
});

// Check if a modality can accept new registrations
export const canAcceptRegistration = query({
  args: { modalityId: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    const modality = await ctx.db.get(args.modalityId);
    if (!modality || !modality.isActive) {
      return { canAccept: false, reason: "Modality not available" };
    }

    if (!modality.maxParticipants) {
      return { canAccept: true, reason: "No capacity limit" };
    }

    const activeRegistrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_modality")
      .filter((q) => q.eq(q.field("modalityId"), args.modalityId))
      .collect();

    const activeCount = activeRegistrations.filter(r => 
      r.status !== "cancelled" && r.status !== "rejected"
    ).length;

    const canAccept = activeCount < modality.maxParticipants;
    const availableSpots = modality.maxParticipants - activeCount;

    return { 
      canAccept, 
      reason: canAccept ? `${availableSpots} spots available` : "Modality is full",
      currentCount: activeCount,
      maxParticipants: modality.maxParticipants,
      availableSpots: Math.max(0, availableSpots)
    };
  },
}); 