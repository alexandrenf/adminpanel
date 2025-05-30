import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get AG configuration (there should only be one)
export const get = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();
    
    return config;
  },
});

// Create or update AG configuration
export const upsert = mutation({
  args: {
    codeOfConductUrl: v.optional(v.string()),
    paymentInfo: v.optional(v.string()),
    paymentInstructions: v.optional(v.string()),
    bankDetails: v.optional(v.string()),
    pixKey: v.optional(v.string()),
    registrationEnabled: v.boolean(),
    autoApproval: v.boolean(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if config already exists
    const existingConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();

    if (existingConfig) {
      // Update existing config
      await ctx.db.patch(existingConfig._id, {
        codeOfConductUrl: args.codeOfConductUrl,
        paymentInfo: args.paymentInfo,
        paymentInstructions: args.paymentInstructions,
        bankDetails: args.bankDetails,
        pixKey: args.pixKey,
        registrationEnabled: args.registrationEnabled,
        autoApproval: args.autoApproval,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
      
      return existingConfig._id;
    } else {
      // Create new config
      return await ctx.db.insert("agConfigs", {
        codeOfConductUrl: args.codeOfConductUrl,
        paymentInfo: args.paymentInfo,
        paymentInstructions: args.paymentInstructions,
        bankDetails: args.bankDetails,
        pixKey: args.pixKey,
        registrationEnabled: args.registrationEnabled,
        autoApproval: args.autoApproval,
        createdAt: now,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
    }
  },
});

// Toggle registration globally
export const toggleRegistration = mutation({
  args: {
    enabled: v.boolean(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const existingConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        registrationEnabled: args.enabled,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
      
      return existingConfig._id;
    } else {
      // Create new config with default values
      return await ctx.db.insert("agConfigs", {
        registrationEnabled: args.enabled,
        autoApproval: false,
        createdAt: now,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
    }
  },
});

// Toggle auto-approval
export const toggleAutoApproval = mutation({
  args: {
    enabled: v.boolean(),
    updatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const existingConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, {
        autoApproval: args.enabled,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
      
      return existingConfig._id;
    } else {
      // Create new config with default values
      return await ctx.db.insert("agConfigs", {
        registrationEnabled: true,
        autoApproval: args.enabled,
        createdAt: now,
        updatedAt: now,
        updatedBy: args.updatedBy,
      });
    }
  },
}); 