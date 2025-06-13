import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Helper function to check if current time is past deadline (BSB timezone)
// This correctly handles BSB timezone (UTC-3) regardless of server location
function isDeadlinePassed(deadline: number): boolean {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  
  // BSB timezone is UTC-3
  // We want to allow registration until 23:59:59.999 BSB time of the deadline day
  
  // Get the deadline date in UTC and extract date components
  const year = deadlineDate.getUTCFullYear();
  const month = deadlineDate.getUTCMonth();
  const day = deadlineDate.getUTCDate();
  
  // Create end of day in BSB timezone (23:59:59.999)
  // Since BSB is UTC-3, we need to create the end of day at UTC+3 hours
  const endOfDayBSB = new Date();
  endOfDayBSB.setUTCFullYear(year, month, day);
  endOfDayBSB.setUTCHours(23 + 3, 59, 59, 999); // Add 3 hours to convert BSB to UTC
  
  return now > endOfDayBSB;
}

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

// Get user's registration for a specific assembly
export const getUserRegistrationForAssembly = query({
  args: { 
    userId: v.string(),
    assemblyId: v.optional(v.id("assemblies")),
  },
  handler: async (ctx, args) => {
    if (!args.assemblyId) {
      return null;
    }

    return await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("registeredBy"), args.userId)
        )
      )
      .first();
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

    if (assembly.registrationDeadline && isDeadlinePassed(assembly.registrationDeadline)) {
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
      selectedEBId: v.optional(v.string()),
      selectedCRId: v.optional(v.string()),
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

    if (assembly.registrationDeadline && isDeadlinePassed(assembly.registrationDeadline)) {
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
          q.eq(q.field("registeredBy"), args.userId)
        )
      )
      .first();

    // If user already has a registration, we'll update it instead of creating a new one
    let isUpdatingExisting = false;
    if (existingRegistration) {
      isUpdatingExisting = true;
      console.log(`Updating existing registration ${existingRegistration._id} for user ${args.userId}`);
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

    // Determine the participantId based on the role for eligibility check
    let participantIdToCheck = args.userId; // Default to user ID
    
    if (args.personalInfo.role === 'eb' && args.personalInfo.selectedEBId) {
      participantIdToCheck = args.personalInfo.selectedEBId;
    } else if (args.personalInfo.role === 'cr' && args.personalInfo.selectedCRId) {
      participantIdToCheck = args.personalInfo.selectedCRId;
    } else if (args.personalInfo.role === 'comite_local' && args.personalInfo.comiteLocal) {
      participantIdToCheck = args.personalInfo.comiteLocal;
    }

    // Enhanced debugging
    console.log(`Eligibility check: role=${args.personalInfo.role}, participantIdToCheck=${participantIdToCheck}, assemblyId=${args.assemblyId}`);
    console.log(`EB selection: selectedEBId=${args.personalInfo.selectedEBId}, type: ${typeof args.personalInfo.selectedEBId}`);
    console.log(`CR selection: selectedCRId=${args.personalInfo.selectedCRId}, type: ${typeof args.personalInfo.selectedCRId}`);
    console.log(`Comite Local: comiteLocal=${args.personalInfo.comiteLocal}, type: ${typeof args.personalInfo.comiteLocal}`);
    console.log(`Full personalInfo object:`, JSON.stringify(args.personalInfo, null, 2));

    // Check if participant exists in the assembly's participant list
    // But allow fallback for some participant types that might not be in agParticipants
    const participant = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("participantId"), participantIdToCheck)
        )
      )
      .first();

    console.log(`Participant found in assembly: ${!!participant}`);

    // Enhanced eligibility check with better error handling
    if (!participant) {
      // For EB roles, they must be in agParticipants table for this specific assembly
      if (args.personalInfo.role === 'eb') {
        if (!args.personalInfo.selectedEBId || args.personalInfo.selectedEBId.trim() === '') {
          console.error(`EB registration failed: selectedEBId is empty or invalid. Received: "${args.personalInfo.selectedEBId}" (type: ${typeof args.personalInfo.selectedEBId})`);
          throw new Error("Please select a specific Executive Board position to register. Make sure you have selected a position from the dropdown.");
        }
        console.error(`EB registration failed: Selected EB position "${args.personalInfo.selectedEBId}" not found in assembly ${args.assemblyId}`);
        throw new Error(`Selected Executive Board position is not eligible for this assembly. Please contact support if you believe this is an error.`);
      }
      
      // For CR roles, check if they exist in global list and allow registration
      if (args.personalInfo.role === 'cr') {
        if (!args.personalInfo.selectedCRId) {
          throw new Error("Please select a specific Regional Coordinator position to register");
        }
        
        // Check if this CR exists in the global participant list
        const crExists = await ctx.db
          .query("agParticipants")
          .filter((q) => 
            q.and(
              q.eq(q.field("participantId"), args.personalInfo.selectedCRId),
              q.eq(q.field("type"), "cr")
            )
          )
          .first();
        
        console.log(`CR exists in global list: ${!!crExists}`);
        
        if (!crExists) {
          throw new Error("Selected Regional Coordinator position is not recognized in the system. Please contact support if you believe this is an error.");
        }
        
        // For CR, we allow registration even if not specifically in this assembly's participant list
        // This provides flexibility for CRs that might participate in multiple assemblies
      }
      
      // For comite_local, check if the comite exists in the global list
      else if (args.personalInfo.role === 'comite_local' && args.personalInfo.comiteLocal) {
        // Check if this comite local exists in the global participant list
        // Note: The type in agParticipants is "comite", not "comite_local"
        const comiteExists = await ctx.db
          .query("agParticipants")
          .filter((q) => 
            q.and(
              q.eq(q.field("participantId"), args.personalInfo.comiteLocal),
              q.eq(q.field("type"), "comite")
            )
          )
          .first();
        
        console.log(`Comite Local exists in global list: ${!!comiteExists}`);
        
        if (!comiteExists) {
          throw new Error("Selected Comitê Local is not recognized in the system. Please contact support to add your local committee.");
        }
        
        // For comite_local, we allow registration even if not specifically in this assembly's participant list
        // This provides flexibility for comitês locais that might participate in multiple assemblies
      } else if (args.personalInfo.role === 'comite_local' && !args.personalInfo.comiteLocal) {
        throw new Error("Please select your Comitê Local to register");
      } 
      
      // For SupCo, allow registration without requiring them to be in agParticipants
      // SupCo members don't need to select a specific position like EB or CR
      else if (args.personalInfo.role === 'supco') {
        console.log(`SupCo registration allowed for user: ${args.userId}`);
        // SupCo can register directly without additional checks
      }
      
      // For other participant types that don't require specific selections, allow registration
      else if (['comite_aspirante', 'observador_externo', 'alumni'].includes(args.personalInfo.role)) {
        console.log(`${args.personalInfo.role} registration allowed for user: ${args.userId}`);
        // These participant types can register directly without additional checks
      } 
      
      else {
        // For any other unknown participant types, provide an error
        const participantTypeLabel = {
          'comite_aspirante': 'Comitê Aspirante',
          'supco': 'Conselho Supervisor',
          'observador_externo': 'Observador Externo',
          'alumni': 'Alumni'
        }[args.personalInfo.role] || args.personalInfo.role;
        
        console.error(`Eligibility check failed for participant type: ${args.personalInfo.role}, participantIdToCheck: ${participantIdToCheck}, assemblyId: ${args.assemblyId}`);
        throw new Error(`${participantTypeLabel} registration is not currently available for this assembly. Please contact support if you believe this is an error.`);
      }
    }

    // Determine the participantId based on the role
    let participantId = args.userId; // Default to user ID
    let participantName = args.personalInfo.nome; // Default to provided name
    
    if (args.personalInfo.role === 'eb' && args.personalInfo.selectedEBId) {
      participantId = args.personalInfo.selectedEBId;
    } else if (args.personalInfo.role === 'cr' && args.personalInfo.selectedCRId) {
      participantId = args.personalInfo.selectedCRId;
    } else if (args.personalInfo.role === 'comite_local' && args.personalInfo.comiteLocal) {
      participantId = args.personalInfo.comiteLocal;
    }

    // Prepare registration data
    const registrationData = {
      assemblyId: args.assemblyId,
      modalityId: args.modalityId,
      participantType: args.personalInfo.role,
      participantId: participantId,
      participantName: participantName,
      participantRole: args.personalInfo.role,
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
    };

    let registrationId;
    
    if (isUpdatingExisting && existingRegistration) {
      // Update existing registration
      registrationId = existingRegistration._id;
      await ctx.db.patch(registrationId, {
        ...registrationData,
        // If registration was previously rejected/cancelled, reset it to the new status
        // But preserve review data if it was approved before
        ...(existingRegistration.status === "approved" && !agConfig?.autoApproval ? {
          // Keep existing review data for previously approved registrations unless auto-approving
        } : {}),
      });
    } else {
      // Create new registration
      registrationId = await ctx.db.insert("agRegistrations", {
        ...registrationData,
        registeredAt: Date.now(),
      });
    }

    // Return registration ID and additional info for auto-approved registrations
    return {
      registrationId,
      isUpdated: isUpdatingExisting,
      isAutoApproved: !!agConfig?.autoApproval,
      assemblyData: agConfig?.autoApproval ? {
        name: assembly.name,
        location: assembly.location,
        startDate: assembly.startDate,
        endDate: assembly.endDate,
        type: assembly.type,
      } : undefined,
      modalityData: agConfig?.autoApproval && args.modalityId ? 
        await ctx.db.get(args.modalityId) : undefined,
      participantData: agConfig?.autoApproval ? {
        name: args.personalInfo.nome,
        email: args.personalInfo.email,
      } : undefined,
    };
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
          q.eq(q.field("registeredBy"), args.userId)
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
      selectedEBId: v.optional(v.string()),
      selectedCRId: v.optional(v.string()),
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

    if (assembly.registrationDeadline && isDeadlinePassed(assembly.registrationDeadline)) {
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
      participantId: args.updatedPersonalInfo.selectedEBId || args.updatedPersonalInfo.selectedCRId || args.updatedPersonalInfo.comiteLocal || "",
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

    // Return registration ID and additional info for auto-approved resubmissions
    return {
      registrationId: args.registrationId,
      isAutoApproved: !!agConfig?.autoApproval,
      assemblyData: agConfig?.autoApproval ? {
        name: assembly.name,
        location: assembly.location,
        startDate: assembly.startDate,
        endDate: assembly.endDate,
        type: assembly.type,
      } : undefined,
      modalityData: agConfig?.autoApproval && registration.modalityId ? 
        await ctx.db.get(registration.modalityId) : undefined,
      participantData: agConfig?.autoApproval ? {
        name: args.updatedPersonalInfo.nome,
        email: args.updatedPersonalInfo.email,
      } : undefined,
    };
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

// Mark attendance for a registration
export const markAttendance = mutation({
  args: {
    registrationId: v.id("agRegistrations"),
    markedAt: v.number(),
    markedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db.get(args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status !== "approved") {
      throw new Error("Only approved registrations can have attendance marked");
    }

    // Update registration with attendance information
    await ctx.db.patch(args.registrationId, {
      attendanceMarked: true,
      attendanceMarkedAt: args.markedAt,
      attendanceMarkedBy: args.markedBy,
    });

    return {
      registrationId: args.registrationId,
      participantName: registration.participantName,
      message: "Attendance marked successfully"
    };
  },
}); 