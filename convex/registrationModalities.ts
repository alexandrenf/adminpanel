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

// Initialize default modalities for an assembly
export const initializeDefaultModalities = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    assemblyType: v.string(), // "AG" | "AGE"
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.assemblyId);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    // Check if modalities already exist
    const existing = await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();

    if (existing.length > 0) {
      return existing.map(m => m._id);
    }

    const modalityIds = [];

    if (args.assemblyType === "AGE") {
      // AGE only has one modality: "AGE online" (free)
      const modalityId = await ctx.db.insert("registrationModalities", {
        assemblyId: args.assemblyId,
        name: "AGE online",
        description: "Participação online na Assembleia Geral Extraordinária",
        price: 0,
        maxParticipants: undefined, // No limit for AGE
        isActive: true,
        order: 1,
        createdAt: Date.now(),
        createdBy: args.createdBy,
      });
      modalityIds.push(modalityId);
    } else {
      // AG has multiple default modalities
      const defaultModalities = [
        {
          name: "Participante",
          description: "Participação presencial na Assembleia Geral",
          price: 15000, // R$ 150.00 in cents
          maxParticipants: 100,
        },
        {
          name: "Estudante",
          description: "Participação presencial com desconto estudantil",
          price: 10000, // R$ 100.00 in cents
          maxParticipants: 50,
        },
        {
          name: "Convidado",
          description: "Participação presencial para convidados especiais",
          price: 0, // Free
          maxParticipants: 20,
        },
      ];

      for (let i = 0; i < defaultModalities.length; i++) {
        const modality = defaultModalities[i];
        if (!modality) continue;
        
        const modalityId = await ctx.db.insert("registrationModalities", {
          assemblyId: args.assemblyId,
          name: modality.name,
          description: modality.description,
          price: modality.price,
          maxParticipants: modality.maxParticipants,
          isActive: true,
          order: i + 1,
          createdAt: Date.now(),
          createdBy: args.createdBy,
        });
        modalityIds.push(modalityId);
      }
    }

    return modalityIds;
  },
});

// Check if a modality can accept new registrations
export const canAcceptRegistration = query({
  args: { modalityId: v.id("registrationModalities") },
  handler: async (ctx, args) => {
    const modality = await ctx.db.get(args.modalityId);
    if (!modality || !modality.isActive) {
      return false;
    }

    if (!modality.maxParticipants) {
      return true; // No limit
    }

    const activeRegistrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_modality")
      .filter((q) => q.eq(q.field("modalityId"), args.modalityId))
      .collect();

    const activeCount = activeRegistrations.filter(r => 
      r.status !== "cancelled" && r.status !== "rejected"
    ).length;

    return activeCount < modality.maxParticipants;
  },
}); 