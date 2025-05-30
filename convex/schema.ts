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
  
  qrReaders: defineTable({
    name: v.string(), // Name of the QR reader/person
    token: v.string(), // Unique token for the QR reader link
    createdAt: v.number(), // timestamp
    createdBy: v.string(), // user identifier who created it
    isActive: v.boolean(), // whether the reader is active
  }).index("by_token", ["token"])
    .index("by_active", ["isActive"]),

  // AG Configuration for admin settings
  agConfigs: defineTable({
    codeOfConductUrl: v.optional(v.string()), // URL to the code of conduct PDF
    paymentInfo: v.optional(v.string()), // General payment information
    paymentInstructions: v.optional(v.string()), // Detailed payment instructions
    bankDetails: v.optional(v.string()), // Bank account details
    pixKey: v.optional(v.string()), // PIX key for payments
    registrationEnabled: v.boolean(), // Global toggle for AG registrations
    autoApproval: v.boolean(), // Whether to auto-approve registrations
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
    updatedBy: v.string(), // user identifier who updated
  }).index("by_updated_at", ["updatedAt"]),

  // New tables for AG management
  assemblies: defineTable({
    name: v.string(), // Name of the AG
    type: v.string(), // "AG" | "AGE" (in person or online)
    location: v.string(), // City/State for AG, "Online" for AGE
    startDate: v.number(), // timestamp
    endDate: v.number(), // timestamp
    status: v.string(), // "active" | "archived" (deleted assemblies are permanently removed)
    createdAt: v.number(), // timestamp
    createdBy: v.string(), // user identifier who created it
    lastUpdated: v.number(), // timestamp
    lastUpdatedBy: v.string(), // user identifier
    // Registration settings
    registrationOpen: v.boolean(),
    registrationDeadline: v.optional(v.number()), // timestamp
    maxParticipants: v.optional(v.number()),
    description: v.optional(v.string()),
    // Payment settings
    paymentRequired: v.boolean(), // Whether this assembly requires payment (AGEs default false, AGs default true)
  }).index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // Registration modalities (different registration types with pricing and limits)
  registrationModalities: defineTable({
    assemblyId: v.id("assemblies"),
    name: v.string(), // e.g., "Participante", "Estudante", "AGE online"
    description: v.optional(v.string()),
    price: v.number(), // Price in cents (0 for free)
    maxParticipants: v.optional(v.number()), // Limit for this modality
    isActive: v.boolean(), // Whether this modality is accepting registrations
    order: v.number(), // Display order
    createdAt: v.number(),
    createdBy: v.string(),
  }).index("by_assembly", ["assemblyId"])
    .index("by_assembly_and_active", ["assemblyId", "isActive"]),

  agRegistrations: defineTable({
    assemblyId: v.id("assemblies"),
    modalityId: v.optional(v.id("registrationModalities")), // Which modality they registered for
    participantType: v.string(), // "eb" | "cr" | "comite"
    participantId: v.string(), // id of the participant
    participantName: v.string(),
    participantRole: v.optional(v.string()), // for EBs and CRs
    participantStatus: v.optional(v.string()), // for comites: "Pleno" | "Não-pleno"
    registeredAt: v.number(), // timestamp
    registeredBy: v.string(), // user identifier who registered
    status: v.string(), // "pending" | "approved" | "rejected" | "cancelled" | "pending_review"
    // Additional participant data
    escola: v.optional(v.string()),
    regional: v.optional(v.string()),
    cidade: v.optional(v.string()),
    uf: v.optional(v.string()),
    agFiliacao: v.optional(v.string()),
    // Contact info for registration
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
    
    // Detailed personal information from registration form
    emailSolar: v.optional(v.string()),
    dataNascimento: v.optional(v.string()),
    cpf: v.optional(v.string()),
    nomeCracha: v.optional(v.string()),
    celular: v.optional(v.string()),
    comiteLocal: v.optional(v.string()),
    comiteAspirante: v.optional(v.string()),
    autorizacaoCompartilhamento: v.optional(v.boolean()),
    
    // Additional information from registration form
    experienciaAnterior: v.optional(v.string()),
    motivacao: v.optional(v.string()),
    expectativas: v.optional(v.string()),
    dietaRestricoes: v.optional(v.string()),
    alergias: v.optional(v.string()),
    medicamentos: v.optional(v.string()),
    necessidadesEspeciais: v.optional(v.string()),
    restricaoQuarto: v.optional(v.string()),
    pronomes: v.optional(v.string()),
    contatoEmergenciaNome: v.optional(v.string()),
    contatoEmergenciaTelefone: v.optional(v.string()),
    outrasObservacoes: v.optional(v.string()),
    participacaoComites: v.optional(v.array(v.string())),
    interesseVoluntariado: v.optional(v.boolean()),
    
    // Payment information
    isPaymentExempt: v.optional(v.boolean()), // Payment exemption status
    paymentExemptReason: v.optional(v.string()), // Reason for exemption
    
    // Admin review fields
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.string()),
    reviewNotes: v.optional(v.string()),
    // Payment receipt fields
    receiptStorageId: v.optional(v.string()),
    receiptFileName: v.optional(v.string()),
    receiptFileType: v.optional(v.string()),
    receiptFileSize: v.optional(v.number()),
    receiptUploadedAt: v.optional(v.number()),
    receiptUploadedBy: v.optional(v.string()),
  }).index("by_assembly", ["assemblyId"])
    .index("by_participant", ["participantId"])
    .index("by_status", ["status"])
    .index("by_assembly_and_status", ["assemblyId", "status"])
    .index("by_modality", ["modalityId"]),

  agParticipants: defineTable({
    assemblyId: v.id("assemblies"),
    type: v.string(), // "eb" | "cr" | "comite"
    participantId: v.string(), // id of the participant
    name: v.string(),
    role: v.optional(v.string()), // for EBs and CRs
    status: v.optional(v.string()), // for comites: "Pleno" | "Não-pleno"
    createdAt: v.number(), // timestamp
    // Complete CSV data for comites
    escola: v.optional(v.string()),
    regional: v.optional(v.string()),
    cidade: v.optional(v.string()),
    uf: v.optional(v.string()),
    agFiliacao: v.optional(v.string()),
  }).index("by_assembly", ["assemblyId"])
    .index("by_assembly_and_type", ["assemblyId", "type"]),
}); 