import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all registrations for an assembly
export const getByAssembly = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();
  },
});

// Get registration by ID
export const getById = query({
  args: { id: v.id("agRegistrations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get registrations by participant
export const getByParticipant = query({
  args: { participantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_participant")
      .filter((q) => q.eq(q.field("participantId"), args.participantId))
      .collect();
  },
});

// Check if participant is already registered for an assembly
export const isRegistered = query({
  args: { 
    assemblyId: v.id("assemblies"),
    participantId: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.participantId)
        )
      )
      .first();

    return registration !== null;
  },
});

// Register participant for assembly
export const register = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    participantType: v.string(),
    participantId: v.string(),
    participantName: v.string(),
    participantRole: v.optional(v.string()),
    participantStatus: v.optional(v.string()),
    registeredBy: v.string(),
    escola: v.optional(v.string()),
    regional: v.optional(v.string()),
    cidade: v.optional(v.string()),
    uf: v.optional(v.string()),
    agFiliacao: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    specialNeeds: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check global AG config for registration enabled
    const agConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();
    
    if (agConfig && !agConfig.registrationEnabled) {
      throw new Error("Registrations are currently disabled globally");
    }

    // Check if assembly exists and registration is open
    const assembly = await ctx.db.get(args.assemblyId);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    if (!assembly.registrationOpen) {
      throw new Error("Registration is closed for this assembly");
    }

    if (assembly.registrationDeadline && Date.now() > assembly.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Check if participant is already registered
    const existingRegistration = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.participantId)
        )
      )
      .first();

    if (existingRegistration) {
      throw new Error("Participant is already registered for this assembly");
    }

    // Check max participants limit
    if (assembly.maxParticipants) {
      const currentRegistrations = await ctx.db
        .query("agRegistrations")
        .withIndex("by_assembly")
        .filter((q) => 
          q.and(
            q.eq(q.field("assemblyId"), args.assemblyId),
            q.eq(q.field("status"), "registered")
          )
        )
        .collect();

      if (currentRegistrations.length >= assembly.maxParticipants) {
        throw new Error("Maximum number of participants reached");
      }
    }

    // Check if participant exists in the assembly's participant list
    const participant = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.participantId)
        )
      )
      .first();

    if (!participant) {
      throw new Error("Participant is not eligible for this assembly");
    }

    // Create registration
    return await ctx.db.insert("agRegistrations", {
      assemblyId: args.assemblyId,
      participantType: args.participantType,
      participantId: args.participantId,
      participantName: args.participantName,
      participantRole: args.participantRole,
      participantStatus: args.participantStatus,
      registeredAt: Date.now(),
      registeredBy: args.registeredBy,
      status: "registered",
      escola: args.escola,
      regional: args.regional,
      cidade: args.cidade,
      uf: args.uf,
      agFiliacao: args.agFiliacao,
      email: args.email,
      phone: args.phone,
      specialNeeds: args.specialNeeds,
    });
  },
});

// Cancel registration
export const cancel = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    participantId: v.string(),
    cancelledBy: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.participantId)
        )
      )
      .first();

    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Registration is already cancelled");
    }

    await ctx.db.patch(registration._id, {
      status: "cancelled",
    });

    return registration._id;
  },
});

// Confirm registration (admin action)
export const confirm = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    participantId: v.string(),
    confirmedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.participantId)
        )
      )
      .first();

    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Cannot confirm a cancelled registration");
    }

    await ctx.db.patch(registration._id, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: args.confirmedBy,
    });

    return registration._id;
  },
});

// Approve registration (admin action)
export const approve = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    approvedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Cannot approve a cancelled registration");
    }

    await ctx.db.patch(args.registrationId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: args.approvedBy,
      reviewNotes: args.notes,
    });

    return args.registrationId;
  },
});

// Reject registration (admin action)
export const reject = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    rejectedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Cannot reject a cancelled registration");
    }

    await ctx.db.patch(args.registrationId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy: args.rejectedBy,
      reviewNotes: args.notes,
    });

    return args.registrationId;
  },
});

// Get registrations by status for an assembly
export const getByAssemblyAndStatus = query({
  args: { 
    assemblyId: v.id("assemblies"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly_and_status")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("status"), args.status)
        )
      )
      .collect();
  },
});

// Get pending registrations for admin review
export const getPendingRegistrations = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "pending_review")
          )
        )
      )
      .order("desc")
      .collect();
  },
});

// Get all registrations for admin dashboard
export const getAllForAdmin = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .order("desc")
      .collect();
  },
});

// Bulk approve multiple registrations
export const bulkApprove = mutation({
  args: {
    registrationIds: v.array(v.id("agRegistrations")),
    approvedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const approvedIds = [];

    for (const registrationId of args.registrationIds) {
      const registration = await ctx.db.get(registrationId);
      if (registration && registration.status !== "cancelled") {
        await ctx.db.patch(registrationId, {
          status: "approved",
          reviewedAt: now,
          reviewedBy: args.approvedBy,
          reviewNotes: args.notes,
        });
        approvedIds.push(registrationId);
      }
    }

    return approvedIds;
  },
});

// Bulk reject multiple registrations
export const bulkReject = mutation({
  args: {
    registrationIds: v.array(v.id("agRegistrations")),
    rejectedBy: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const rejectedIds = [];

    for (const registrationId of args.registrationIds) {
      const registration = await ctx.db.get(registrationId);
      if (registration && registration.status !== "cancelled") {
        await ctx.db.patch(registrationId, {
          status: "rejected",
          reviewedAt: now,
          reviewedBy: args.rejectedBy,
          reviewNotes: args.notes,
        });
        rejectedIds.push(registrationId);
      }
    }

    return rejectedIds;
  },
});

// Get registration statistics
export const getStats = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();

    const stats = {
      total: registrations.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      confirmed: 0,
      registered: 0,
      cancelled: 0,
    };

    registrations.forEach(reg => {
      stats.byStatus[reg.status] = (stats.byStatus[reg.status] || 0) + 1;
      stats.byType[reg.participantType] = (stats.byType[reg.participantType] || 0) + 1;
    });

    stats.confirmed = stats.byStatus["confirmed"] || 0;
    stats.registered = stats.byStatus["registered"] || 0;
    stats.cancelled = stats.byStatus["cancelled"] || 0;

    return stats;
  },
});

// Create registration from form data
export const createFromForm = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    modalityId: v.optional(v.id("registrationModalities")),
    userId: v.string(),
    personalInfo: v.object({
      nome: v.string(),
      email: v.string(),
      emailSolar: v.string(),
      dataNascimento: v.string(),
      cpf: v.string(),
      nomeCracha: v.string(),
      celular: v.string(),
      uf: v.string(),
      cidade: v.string(),
      role: v.string(),
      comiteLocal: v.optional(v.string()),
      comiteAspirante: v.optional(v.string()),
      autorizacaoCompartilhamento: v.boolean(),
    }),
    additionalInfo: v.object({
      experienciaAnterior: v.string(),
      motivacao: v.string(),
      expectativas: v.string(),
      dietaRestricoes: v.string(),
      alergias: v.string(),
      medicamentos: v.string(),
      necessidadesEspeciais: v.string(),
      restricaoQuarto: v.string(),
      pronomes: v.string(),
      contatoEmergenciaNome: v.string(),
      contatoEmergenciaTelefone: v.string(),
      outrasObservacoes: v.string(),
      participacaoComites: v.array(v.string()),
      interesseVoluntariado: v.boolean(),
    }),
    paymentInfo: v.optional(v.object({
      isPaymentExempt: v.boolean(),
      paymentExemptReason: v.optional(v.string()),
    })),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // Check global AG config for registration enabled
    const agConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();
    
    if (agConfig && !agConfig.registrationEnabled) {
      throw new Error("Registrations are currently disabled globally");
    }

    // Check if assembly exists and registration is open
    const assembly = await ctx.db.get(args.assemblyId);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    if (!assembly.registrationOpen) {
      throw new Error("Registration is closed for this assembly");
    }

    if (assembly.registrationDeadline && Date.now() > assembly.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Check if modality is valid and can accept registrations
    if (args.modalityId) {
      const modality = await ctx.db.get(args.modalityId);
      if (!modality || !modality.isActive) {
        throw new Error("Selected registration modality is not available");
      }

      if (modality.assemblyId !== args.assemblyId) {
        throw new Error("Modality does not belong to this assembly");
      }

      // Check modality capacity
      if (modality.maxParticipants) {
        const modalityRegistrations = await ctx.db
          .query("agRegistrations")
          .withIndex("by_modality")
          .filter((q) => q.eq(q.field("modalityId"), args.modalityId))
          .collect();

        const activeModalityRegistrations = modalityRegistrations.filter(r => 
          r.status !== "cancelled" && r.status !== "rejected"
        );

        if (activeModalityRegistrations.length >= modality.maxParticipants) {
          throw new Error("This registration modality is full");
        }
      }
    }

    // Check if user is already registered
    const existingRegistration = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.userId)
        )
      )
      .first();

    if (existingRegistration) {
      throw new Error("User is already registered for this assembly");
    }

    // Check overall assembly max participants limit
    if (assembly.maxParticipants) {
      const currentRegistrations = await ctx.db
        .query("agRegistrations")
        .withIndex("by_assembly")
        .filter((q) => 
          q.and(
            q.eq(q.field("assemblyId"), args.assemblyId),
            q.neq(q.field("status"), "cancelled"),
            q.neq(q.field("status"), "rejected")
          )
        )
        .collect();

      if (currentRegistrations.length >= assembly.maxParticipants) {
        throw new Error("Assembly has reached maximum number of participants");
      }
    }

    // Create registration with all detailed information
    return await ctx.db.insert("agRegistrations", {
      assemblyId: args.assemblyId,
      modalityId: args.modalityId,
      participantType: args.personalInfo.role,
      participantId: args.userId,
      participantName: args.personalInfo.nome,
      participantRole: args.personalInfo.role,
      registeredAt: Date.now(),
      registeredBy: args.userId,
      status: agConfig?.autoApproval ? "approved" : args.status, // Auto-approve if enabled
      
      // If auto-approved, set review details
      ...(agConfig?.autoApproval && {
        reviewedAt: Date.now(),
        reviewedBy: "system",
        reviewNotes: "Auto-approved by system",
      }),
      
      // Basic contact info (legacy fields)
      escola: args.personalInfo.comiteLocal || args.personalInfo.comiteAspirante,
      cidade: args.personalInfo.cidade,
      uf: args.personalInfo.uf,
      email: args.personalInfo.email,
      phone: args.personalInfo.celular,
      specialNeeds: args.additionalInfo.necessidadesEspeciais,
      
      // Detailed personal information
      emailSolar: args.personalInfo.emailSolar,
      dataNascimento: args.personalInfo.dataNascimento,
      cpf: args.personalInfo.cpf,
      nomeCracha: args.personalInfo.nomeCracha,
      celular: args.personalInfo.celular,
      comiteLocal: args.personalInfo.comiteLocal,
      comiteAspirante: args.personalInfo.comiteAspirante,
      autorizacaoCompartilhamento: args.personalInfo.autorizacaoCompartilhamento,
      
      // Additional information
      experienciaAnterior: args.additionalInfo.experienciaAnterior,
      motivacao: args.additionalInfo.motivacao,
      expectativas: args.additionalInfo.expectativas,
      dietaRestricoes: args.additionalInfo.dietaRestricoes,
      alergias: args.additionalInfo.alergias,
      medicamentos: args.additionalInfo.medicamentos,
      necessidadesEspeciais: args.additionalInfo.necessidadesEspeciais,
      restricaoQuarto: args.additionalInfo.restricaoQuarto,
      pronomes: args.additionalInfo.pronomes,
      contatoEmergenciaNome: args.additionalInfo.contatoEmergenciaNome,
      contatoEmergenciaTelefone: args.additionalInfo.contatoEmergenciaTelefone,
      outrasObservacoes: args.additionalInfo.outrasObservacoes,
      participacaoComites: args.additionalInfo.participacaoComites,
      interesseVoluntariado: args.additionalInfo.interesseVoluntariado,
      
      // Payment information
      isPaymentExempt: args.paymentInfo?.isPaymentExempt,
      paymentExemptReason: args.paymentInfo?.paymentExemptReason,
    });
  },
});

// Update registration with payment receipt
export const updatePaymentReceipt = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    receiptStorageId: v.string(),
    receiptFileName: v.string(),
    receiptFileType: v.string(),
    receiptFileSize: v.number(),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Cannot update a cancelled registration");
    }

    await ctx.db.patch(args.registrationId, {
      status: "pending_review", // Status changes to pending review after receipt upload
      receiptStorageId: args.receiptStorageId,
      receiptFileName: args.receiptFileName,
      receiptFileType: args.receiptFileType,
      receiptFileSize: args.receiptFileSize,
      receiptUploadedAt: Date.now(),
      receiptUploadedBy: args.uploadedBy,
    });

    return args.registrationId;
  },
});

// Get user registration status for an assembly
export const getUserRegistrationStatus = query({
  args: { 
    assemblyId: v.id("assemblies"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), args.userId)
        )
      )
      .first();

    if (!registration) {
      return null;
    }

    return {
      registrationId: registration._id,
      status: registration.status,
      registeredAt: registration.registeredAt,
      hasReceipt: !!registration.receiptStorageId,
      rejectionReason: registration.status === "rejected" ? registration.reviewNotes : undefined,
    };
  },
});

// Update registration with payment exemption status
export const updatePaymentExemption = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    isPaymentExempt: v.boolean(),
    paymentExemptReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Cannot update a cancelled registration");
    }

    // Determine the new status based on exemption
    let newStatus = registration.status;
    if (args.isPaymentExempt) {
      // If exempt, set to pending_review for admin review
      newStatus = "pending_review";
    } else {
      // If not exempt and currently in pending_review but no receipt, go back to pending
      if (registration.status === "pending_review" && !registration.receiptStorageId) {
        newStatus = "pending";
      }
    }

    await ctx.db.patch(args.registrationId, {
      isPaymentExempt: args.isPaymentExempt,
      paymentExemptReason: args.paymentExemptReason,
      status: newStatus,
    });

    return args.registrationId;
  },
});

// Change registration modality
export const changeModality = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    newModalityId: v.id("registrationModalities"),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Cannot change modality for a cancelled registration");
    }

    // Check if new modality is valid and can accept registrations
    const newModality = await ctx.db.get(args.newModalityId);
    if (!newModality || !newModality.isActive) {
      throw new Error("Selected registration modality is not available");
    }

    if (newModality.assemblyId !== registration.assemblyId) {
      throw new Error("Modality does not belong to this assembly");
    }

    // Check new modality capacity (excluding current registration)
    if (newModality.maxParticipants) {
      const modalityRegistrations = await ctx.db
        .query("agRegistrations")
        .withIndex("by_modality")
        .filter((q) => q.eq(q.field("modalityId"), args.newModalityId))
        .collect();

      const activeModalityRegistrations = modalityRegistrations.filter(r => 
        r.status !== "cancelled" && r.status !== "rejected" && r._id !== args.registrationId
      );

      if (activeModalityRegistrations.length >= newModality.maxParticipants) {
        throw new Error("The selected registration modality is full");
      }
    }

    await ctx.db.patch(args.registrationId, {
      modalityId: args.newModalityId,
    });

    return args.registrationId;
  },
});

// Resubmit rejected registration
export const resubmit = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    updatedPersonalInfo: v.object({
      nome: v.string(),
      email: v.string(),
      emailSolar: v.string(),
      dataNascimento: v.string(),
      cpf: v.string(),
      nomeCracha: v.string(),
      celular: v.string(),
      uf: v.string(),
      cidade: v.string(),
      role: v.string(),
      comiteLocal: v.optional(v.string()),
      comiteAspirante: v.optional(v.string()),
      autorizacaoCompartilhamento: v.boolean(),
    }),
    updatedAdditionalInfo: v.object({
      experienciaAnterior: v.string(),
      motivacao: v.string(),
      expectativas: v.string(),
      dietaRestricoes: v.string(),
      alergias: v.string(),
      medicamentos: v.string(),
      necessidadesEspeciais: v.string(),
      restricaoQuarto: v.string(),
      pronomes: v.string(),
      contatoEmergenciaNome: v.string(),
      contatoEmergenciaTelefone: v.string(),
      outrasObservacoes: v.string(),
      participacaoComites: v.array(v.string()),
      interesseVoluntariado: v.boolean(),
    }),
    resubmissionNote: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== "rejected") {
      throw new Error("Only rejected registrations can be resubmitted");
    }

    // Check if assembly is still open for registration
    const assembly = await ctx.db.get(registration.assemblyId);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    if (!assembly.registrationOpen) {
      throw new Error("Registration is closed for this assembly");
    }

    if (assembly.registrationDeadline && Date.now() > assembly.registrationDeadline) {
      throw new Error("Registration deadline has passed");
    }

    // Check global AG config for registration enabled
    const agConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();
    
    if (agConfig && !agConfig.registrationEnabled) {
      throw new Error("Registrations are currently disabled globally");
    }

    // Update registration with new information and reset to pending
    await ctx.db.patch(args.registrationId, {
      // Update personal info
      participantName: args.updatedPersonalInfo.nome,
      email: args.updatedPersonalInfo.email,
      emailSolar: args.updatedPersonalInfo.emailSolar,
      dataNascimento: args.updatedPersonalInfo.dataNascimento,
      cpf: args.updatedPersonalInfo.cpf,
      nomeCracha: args.updatedPersonalInfo.nomeCracha,
      celular: args.updatedPersonalInfo.celular,
      uf: args.updatedPersonalInfo.uf,
      cidade: args.updatedPersonalInfo.cidade,
      participantType: args.updatedPersonalInfo.role,
      participantRole: args.updatedPersonalInfo.role,
      comiteLocal: args.updatedPersonalInfo.comiteLocal,
      comiteAspirante: args.updatedPersonalInfo.comiteAspirante,
      autorizacaoCompartilhamento: args.updatedPersonalInfo.autorizacaoCompartilhamento,
      
      // Update additional info
      experienciaAnterior: args.updatedAdditionalInfo.experienciaAnterior,
      motivacao: args.updatedAdditionalInfo.motivacao,
      expectativas: args.updatedAdditionalInfo.expectativas,
      dietaRestricoes: args.updatedAdditionalInfo.dietaRestricoes,
      alergias: args.updatedAdditionalInfo.alergias,
      medicamentos: args.updatedAdditionalInfo.medicamentos,
      necessidadesEspeciais: args.updatedAdditionalInfo.necessidadesEspeciais,
      restricaoQuarto: args.updatedAdditionalInfo.restricaoQuarto,
      pronomes: args.updatedAdditionalInfo.pronomes,
      contatoEmergenciaNome: args.updatedAdditionalInfo.contatoEmergenciaNome,
      contatoEmergenciaTelefone: args.updatedAdditionalInfo.contatoEmergenciaTelefone,
      outrasObservacoes: args.updatedAdditionalInfo.outrasObservacoes,
      participacaoComites: args.updatedAdditionalInfo.participacaoComites,
      interesseVoluntariado: args.updatedAdditionalInfo.interesseVoluntariado,
      
      // Reset status and add resubmission info
      status: agConfig?.autoApproval ? "approved" : "pending",
      resubmittedAt: Date.now(),
      resubmissionNote: args.resubmissionNote,
      
      // Clear previous rejection data
      reviewedAt: agConfig?.autoApproval ? Date.now() : undefined,
      reviewedBy: agConfig?.autoApproval ? "system" : undefined,
      reviewNotes: agConfig?.autoApproval ? "Auto-approved on resubmission" : undefined,
    });

    return args.registrationId;
  },
});

// Delete registration completely from database
export const deleteRegistration = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    // Delete payment receipt file if it exists
    if (registration.receiptStorageId) {
      try {
        await ctx.storage.delete(registration.receiptStorageId as any);
      } catch (error) {
        // Continue even if file deletion fails (file might not exist)
        console.warn(`Failed to delete receipt file ${registration.receiptStorageId}:`, error);
      }
    }

    // Delete the registration record
    await ctx.db.delete(args.registrationId);

    return {
      deletedRegistration: args.registrationId,
      participantName: registration.participantName,
      message: `Registration for ${registration.participantName} has been permanently deleted.`
    };
  },
});

// Bulk delete multiple registrations
export const bulkDelete = mutation({
  args: {
    registrationIds: v.array(v.id("agRegistrations")),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const deletedRegistrations = [];
    let deletedFiles = 0;

    for (const registrationId of args.registrationIds) {
      const registration = await ctx.db.get(registrationId);
      if (registration) {
        // Delete payment receipt file if it exists
        if (registration.receiptStorageId) {
          try {
            await ctx.storage.delete(registration.receiptStorageId as any);
            deletedFiles++;
          } catch (error) {
            console.warn(`Failed to delete receipt file ${registration.receiptStorageId}:`, error);
          }
        }

        // Delete the registration record
        await ctx.db.delete(registrationId);
        deletedRegistrations.push({
          id: registrationId,
          name: registration.participantName
        });
      }
    }

    return {
      deletedRegistrations: deletedRegistrations.length,
      deletedFiles,
      deletedItems: deletedRegistrations,
      message: `${deletedRegistrations.length} registrations have been permanently deleted.`
    };
  },
}); 