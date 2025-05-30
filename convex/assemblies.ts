import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Get all assemblies
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("assemblies")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

// Get active assemblies only
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("assemblies")
      .withIndex("by_status")
      .filter((q) => q.eq(q.field("status"), "active"))
      .order("desc")
      .collect();
  },
});

// Get assembly by ID
export const getById = query({
  args: { id: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create new assembly
export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(), // "AG" | "AGE"
    location: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    createdBy: v.string(),
    registrationOpen: v.optional(v.boolean()),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    description: v.optional(v.string()),
    paymentRequired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Set default payment requirement based on type
    const paymentRequired = args.paymentRequired ?? (args.type === "AG");
    
    return await ctx.db.insert("assemblies", {
      name: args.name,
      type: args.type,
      location: args.location,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "active",
      createdAt: now,
      createdBy: args.createdBy,
      lastUpdated: now,
      lastUpdatedBy: args.createdBy,
      registrationOpen: args.registrationOpen ?? true,
      registrationDeadline: args.registrationDeadline,
      maxParticipants: args.maxParticipants,
      description: args.description,
      paymentRequired,
    });
  },
});

// Update assembly
export const update = mutation({
  args: {
    id: v.id("assemblies"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    location: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    lastUpdatedBy: v.string(),
    registrationOpen: v.optional(v.boolean()),
    registrationDeadline: v.optional(v.number()),
    maxParticipants: v.optional(v.number()),
    description: v.optional(v.string()),
    paymentRequired: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.id);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    const updates: any = {
      lastUpdated: Date.now(),
      lastUpdatedBy: args.lastUpdatedBy,
    };

    // Add all optional fields that were provided
    if (args.name !== undefined) updates.name = args.name;
    if (args.type !== undefined) updates.type = args.type;
    if (args.location !== undefined) updates.location = args.location;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;
    if (args.registrationOpen !== undefined) updates.registrationOpen = args.registrationOpen;
    if (args.registrationDeadline !== undefined) updates.registrationDeadline = args.registrationDeadline;
    if (args.maxParticipants !== undefined) updates.maxParticipants = args.maxParticipants;
    if (args.description !== undefined) updates.description = args.description;
    if (args.paymentRequired !== undefined) updates.paymentRequired = args.paymentRequired;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Archive assembly
export const archive = mutation({
  args: {
    id: v.id("assemblies"),
    lastUpdatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.id);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    if (assembly.status !== "active") {
      throw new Error("Only active assemblies can be archived");
    }

    await ctx.db.patch(args.id, {
      status: "archived",
      lastUpdated: Date.now(),
      lastUpdatedBy: args.lastUpdatedBy,
      registrationOpen: false, // Close registration when archiving
    });

    return args.id;
  },
});

// Delete assembly (only if archived) with cascading deletion
export const remove = mutation({
  args: {
    id: v.id("assemblies"),
    lastUpdatedBy: v.string(),
    confirmationText: v.string(),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.id);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    if (assembly.status !== "archived") {
      throw new Error("Only archived assemblies can be deleted");
    }

    // Verify confirmation text
    if (args.confirmationText !== assembly.name) {
      throw new Error("Confirmation text does not match assembly name");
    }

    // CASCADING DELETE: Remove all related data permanently
    
    // 1. Delete all AG registrations for this assembly
    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }

    // 2. Delete all AG participants for this assembly
    const participants = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // 3. Finally, delete the assembly itself
    await ctx.db.delete(args.id);

    // Return deletion summary
    return {
      assemblyId: args.id,
      deletedRegistrations: registrations.length,
      deletedParticipants: participants.length,
      message: `Assembly "${assembly.name}" and all related data have been permanently deleted.`
    };
  },
});

// Bulk insert participants for a new AG
export const bulkInsertParticipants = mutation({
  args: {
    assemblyId: v.id("assemblies"),
    participants: v.array(v.object({
      type: v.string(),
      participantId: v.string(),
      name: v.string(),
      role: v.optional(v.string()),
      status: v.optional(v.string()),
      escola: v.optional(v.string()),
      regional: v.optional(v.string()),
      cidade: v.optional(v.string()),
      uf: v.optional(v.string()),
      agFiliacao: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const insertPromises = args.participants.map(participant =>
      ctx.db.insert("agParticipants", {
        assemblyId: args.assemblyId,
        type: participant.type,
        participantId: participant.participantId,
        name: participant.name,
        role: participant.role,
        status: participant.status,
        createdAt: now,
        escola: participant.escola,
        regional: participant.regional,
        cidade: participant.cidade,
        uf: participant.uf,
        agFiliacao: participant.agFiliacao,
      })
    );

    const results = await Promise.all(insertPromises);
    return results.length;
  },
});

// Get participants for an assembly
export const getParticipants = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();
  },
});

// Get participants by type for an assembly
export const getParticipantsByType = query({
  args: { 
    assemblyId: v.id("assemblies"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly_and_type")
      .filter((q) => 
        q.and(
          q.eq(q.field("assemblyId"), args.assemblyId),
          q.eq(q.field("type"), args.type)
        )
      )
      .collect();
  },
});

// Get registration statistics for an assembly
export const getRegistrationStats = query({
  args: { assemblyId: v.id("assemblies") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();

    const participants = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();

    const modalities = await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.assemblyId))
      .collect();

    const assembly = await ctx.db.get(args.assemblyId);

    const activeRegistrations = registrations.filter(r => 
      r.status !== "cancelled" && r.status !== "rejected"
    );

    const stats = {
      totalParticipants: participants.length,
      totalRegistrations: registrations.length,
      activeRegistrations: activeRegistrations.length,
      registrationsByType: {} as Record<string, number>,
      registrationsByStatus: {} as Record<string, number>,
      participantsByType: {} as Record<string, number>,
      modalityStats: [] as Array<{
        modalityId: string;
        name: string;
        price: number;
        maxParticipants?: number;
        currentRegistrations: number;
        isFull: boolean;
        isNearFull: boolean; // 90% capacity
      }>,
      assemblyCapacity: {
        maxParticipants: assembly?.maxParticipants,
        currentRegistrations: activeRegistrations.length,
        isFull: assembly?.maxParticipants ? activeRegistrations.length >= assembly.maxParticipants : false,
        isNearFull: assembly?.maxParticipants ? activeRegistrations.length >= (assembly.maxParticipants * 0.9) : false,
      },
    };

    // Count registrations by type and status
    registrations.forEach(reg => {
      stats.registrationsByType[reg.participantType] = (stats.registrationsByType[reg.participantType] || 0) + 1;
      stats.registrationsByStatus[reg.status] = (stats.registrationsByStatus[reg.status] || 0) + 1;
    });

    // Count participants by type
    participants.forEach(participant => {
      stats.participantsByType[participant.type] = (stats.participantsByType[participant.type] || 0) + 1;
    });

    // Calculate modality statistics
    for (const modality of modalities) {
      const modalityRegistrations = registrations.filter(r => 
        r.modalityId === modality._id && r.status !== "cancelled" && r.status !== "rejected"
      );

      const currentCount = modalityRegistrations.length;
      const isFull = modality.maxParticipants ? currentCount >= modality.maxParticipants : false;
      const isNearFull = modality.maxParticipants ? currentCount >= (modality.maxParticipants * 0.9) : false;

      stats.modalityStats.push({
        modalityId: modality._id,
        name: modality.name,
        price: modality.price,
        maxParticipants: modality.maxParticipants,
        currentRegistrations: currentCount,
        isFull,
        isNearFull,
      });
    }

    return stats;
  },
});

// Update payment required field for existing assemblies
export const updatePaymentRequired = mutation({
  args: {
    id: v.id("assemblies"),
    lastUpdatedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.id);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    // Set paymentRequired based on type (AG = true, AGE = false)
    const paymentRequired = assembly.type === "AG";

    await ctx.db.patch(args.id, {
      paymentRequired,
      lastUpdated: Date.now(),
      lastUpdatedBy: args.lastUpdatedBy,
    });

    return args.id;
  },
});

// Delete assembly and all related data
export const deleteWithRelatedData = mutation({
  args: {
    id: v.id("assemblies"),
    deletedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.id);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    // Delete all registrations for this assembly
    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    // Delete payment receipts from file storage
    const registrationsWithReceipts = registrations.filter(r => r.receiptStorageId);
    for (const registration of registrationsWithReceipts) {
      try {
        // Delete the file from storage
        await ctx.storage.delete(registration.receiptStorageId as any);
      } catch (error) {
        // Continue even if file deletion fails (file might not exist)
        console.warn(`Failed to delete receipt file ${registration.receiptStorageId}:`, error);
      }
    }

    // Delete all registrations
    for (const registration of registrations) {
      await ctx.db.delete(registration._id);
    }

    // Delete all modalities for this assembly
    const modalities = await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    for (const modality of modalities) {
      await ctx.db.delete(modality._id);
    }

    // Delete all participants for this assembly (if any)
    const participants = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    for (const participant of participants) {
      await ctx.db.delete(participant._id);
    }

    // Finally, delete the assembly itself
    await ctx.db.delete(args.id);

    return {
      deletedAssembly: args.id,
      deletedRegistrations: registrations.length,
      deletedModalities: modalities.length,
      deletedParticipants: participants.length,
      deletedFiles: registrationsWithReceipts.length,
    };
  },
});

// Archive assembly to SQL database and remove from Convex
export const archiveToSQL = mutation({
  args: {
    id: v.id("assemblies"),
    archivedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const assembly = await ctx.db.get(args.id);
    if (!assembly) {
      throw new Error("Assembly not found");
    }

    // Get current AG config for snapshot
    const agConfig = await ctx.db
      .query("agConfigs")
      .withIndex("by_updated_at")
      .order("desc")
      .first();

    // Get all related data
    const participants = await ctx.db
      .query("agParticipants")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    const registrations = await ctx.db
      .query("agRegistrations")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    const modalities = await ctx.db
      .query("registrationModalities")
      .withIndex("by_assembly")
      .filter((q) => q.eq(q.field("assemblyId"), args.id))
      .collect();

    // Call external API to archive data to SQL
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/archive-ag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assembly: {
            id: assembly._id,
            name: assembly.name,
            type: assembly.type,
            location: assembly.location,
            startDate: assembly.startDate,
            endDate: assembly.endDate,
            originalStatus: assembly.status,
            createdAt: assembly.createdAt,
            createdBy: assembly.createdBy,
            lastUpdated: assembly.lastUpdated,
            lastUpdatedBy: assembly.lastUpdatedBy,
            registrationOpen: assembly.registrationOpen,
            registrationDeadline: assembly.registrationDeadline,
            maxParticipants: assembly.maxParticipants,
            description: assembly.description,
            paymentRequired: assembly.paymentRequired,
          },
          participants: participants.map(p => ({
            id: p._id,
            assemblyId: p.assemblyId,
            type: p.type,
            participantId: p.participantId,
            name: p.name,
            role: p.role,
            status: p.status,
            escola: p.escola,
            regional: p.regional,
            cidade: p.cidade,
            uf: p.uf,
            agFiliacao: p.agFiliacao,
            addedAt: p.addedAt,
            addedBy: p.addedBy,
          })),
          registrations: await Promise.all(registrations.map(async (r) => {
            let receiptFileData = null;
            
            // Download receipt file if it exists
            if (r.receiptStorageId) {
              try {
                const fileUrl = await ctx.storage.getUrl(r.receiptStorageId);
                if (fileUrl) {
                  const fileResponse = await fetch(fileUrl);
                  if (fileResponse.ok) {
                    const buffer = await fileResponse.arrayBuffer();
                    receiptFileData = Buffer.from(buffer).toString('base64');
                  }
                }
              } catch (error) {
                console.warn(`Failed to download receipt file ${r.receiptStorageId}:`, error);
              }
            }

            return {
              id: r._id,
              assemblyId: r.assemblyId,
              modalityId: r.modalityId,
              participantType: r.participantType,
              participantId: r.participantId,
              participantName: r.participantName,
              participantRole: r.participantRole,
              participantStatus: r.participantStatus,
              registeredAt: r.registeredAt,
              registeredBy: r.registeredBy,
              status: r.status,
              escola: r.escola,
              regional: r.regional,
              cidade: r.cidade,
              uf: r.uf,
              agFiliacao: r.agFiliacao,
              email: r.email,
              phone: r.phone,
              specialNeeds: r.specialNeeds,
              emailSolar: r.emailSolar,
              dataNascimento: r.dataNascimento,
              cpf: r.cpf,
              nomeCracha: r.nomeCracha,
              celular: r.celular,
              comiteLocal: r.comiteLocal,
              comiteAspirante: r.comiteAspirante,
              autorizacaoCompartilhamento: r.autorizacaoCompartilhamento,
              experienciaAnterior: r.experienciaAnterior,
              motivacao: r.motivacao,
              expectativas: r.expectativas,
              dietaRestricoes: r.dietaRestricoes,
              alergias: r.alergias,
              medicamentos: r.medicamentos,
              necessidadesEspeciais: r.necessidadesEspeciais,
              restricaoQuarto: r.restricaoQuarto,
              pronomes: r.pronomes,
              contatoEmergenciaNome: r.contatoEmergenciaNome,
              contatoEmergenciaTelefone: r.contatoEmergenciaTelefone,
              outrasObservacoes: r.outrasObservacoes,
              participacaoComites: r.participacaoComites ? JSON.stringify(r.participacaoComites) : null,
              interesseVoluntariado: r.interesseVoluntariado,
              isPaymentExempt: r.isPaymentExempt,
              paymentExemptReason: r.paymentExemptReason,
              receiptFileName: r.receiptFileName,
              receiptFileType: r.receiptFileType,
              receiptFileSize: r.receiptFileSize,
              receiptFileData,
              receiptUploadedAt: r.receiptUploadedAt,
              receiptUploadedBy: r.receiptUploadedBy,
              reviewedAt: r.reviewedAt,
              reviewedBy: r.reviewedBy,
              reviewNotes: r.reviewNotes,
              rejectionReason: r.rejectionReason,
              resubmittedAt: r.resubmittedAt,
              resubmissionNote: r.resubmissionNote,
            };
          })),
          modalities: modalities.map(m => ({
            id: m._id,
            assemblyId: m.assemblyId,
            name: m.name,
            description: m.description,
            price: m.price,
            maxParticipants: m.maxParticipants,
            isActive: m.isActive,
            displayOrder: m.order,
            createdAt: m.createdAt,
            createdBy: m.createdBy,
          })),
          agConfig: agConfig ? {
            codeOfConductUrl: agConfig.codeOfConductUrl,
            paymentInfo: agConfig.paymentInfo,
            paymentInstructions: agConfig.paymentInstructions,
            bankDetails: agConfig.bankDetails,
            pixKey: agConfig.pixKey,
            registrationEnabled: agConfig.registrationEnabled,
            autoApproval: agConfig.autoApproval,
            originalCreatedAt: agConfig.createdAt,
            originalUpdatedAt: agConfig.updatedAt,
            originalUpdatedBy: agConfig.updatedBy,
          } : null,
          archivedBy: args.archivedBy,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to archive to SQL: ${errorText}`);
      }

      // Archive was successful, now delete from Convex
      // Delete payment receipts from file storage
      const registrationsWithReceipts = registrations.filter(r => r.receiptStorageId);
      for (const registration of registrationsWithReceipts) {
        try {
          await ctx.storage.delete(registration.receiptStorageId as any);
        } catch (error) {
          console.warn(`Failed to delete receipt file ${registration.receiptStorageId}:`, error);
        }
      }

      // Delete all registrations
      for (const registration of registrations) {
        await ctx.db.delete(registration._id);
      }

      // Delete all modalities
      for (const modality of modalities) {
        await ctx.db.delete(modality._id);
      }

      // Delete all participants
      for (const participant of participants) {
        await ctx.db.delete(participant._id);
      }

      // Finally, delete the assembly
      await ctx.db.delete(args.id);

      return {
        message: "Assembly successfully archived to SQL database",
        archivedAssembly: assembly.name,
        archivedParticipants: participants.length,
        archivedRegistrations: registrations.length,
        archivedModalities: modalities.length,
        deletedFiles: registrationsWithReceipts.length,
      };

    } catch (error) {
      console.error("Error archiving assembly to SQL:", error);
      throw new Error(`Failed to archive assembly: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
}); 