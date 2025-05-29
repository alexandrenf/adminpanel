import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  attendance: defineTable({
    type: v.string(), // "eb" | "cr" | "comite"
    memberId: v.string(), // id of the member or comite
    name: v.string(),
    role: v.optional(v.string()), // for EBs and CRs
    status: v.optional(v.string()), // for comites: "Pleno" | "Não-pleno"
    attendance: v.string(), // "present" | "absent" | "not-counting" | "excluded"
    lastUpdated: v.number(), // timestamp
    lastUpdatedBy: v.string(), // user identifier
    // Additional fields for complete CSV data
    escola: v.optional(v.string()),
    regional: v.optional(v.string()),
    cidade: v.optional(v.string()),
    uf: v.optional(v.string()),
    agFiliacao: v.optional(v.string()),
  }).index("by_type", ["type"]),
}); 