import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '~/server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assembly, participants, registrations, modalities, agConfig, archivedBy } = req.body;

    // Start a transaction to ensure data consistency
    const result = await db.$transaction(async (prisma) => {
      // Create archived assembly
      const archivedAssembly = await prisma.archivedAssembly.create({
        data: {
          id: assembly.id,
          name: assembly.name,
          type: assembly.type,
          location: assembly.location,
          startDate: new Date(assembly.startDate),
          endDate: new Date(assembly.endDate),
          originalStatus: assembly.originalStatus,
          createdAt: new Date(assembly.createdAt),
          createdBy: assembly.createdBy,
          lastUpdated: new Date(assembly.lastUpdated),
          lastUpdatedBy: assembly.lastUpdatedBy,
          registrationOpen: assembly.registrationOpen,
          registrationDeadline: assembly.registrationDeadline ? new Date(assembly.registrationDeadline) : null,
          maxParticipants: assembly.maxParticipants,
          description: assembly.description,
          paymentRequired: assembly.paymentRequired,
          archivedBy,
        },
      });

      // Create archived participants
      if (participants.length > 0) {
        await prisma.archivedAGParticipant.createMany({
          data: participants.map((p: any) => ({
            id: p.id,
            assemblyId: archivedAssembly.id,
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
            addedAt: new Date(p.addedAt || p._creationTime),
            addedBy: p.addedBy || 'system',
          })),
        });
      }

      // Create archived modalities
      if (modalities.length > 0) {
        await prisma.archivedRegistrationModality.createMany({
          data: modalities.map((m: any) => ({
            id: m.id,
            assemblyId: archivedAssembly.id,
            name: m.name,
            description: m.description,
            price: m.price,
            maxParticipants: m.maxParticipants,
            isActive: m.isActive,
            displayOrder: m.displayOrder,
            createdAt: new Date(m.createdAt),
            createdBy: m.createdBy,
          })),
        });
      }

      // Create archived registrations
      if (registrations.length > 0) {
        await prisma.archivedAGRegistration.createMany({
          data: registrations.map((r: any) => ({
            id: r.id,
            assemblyId: archivedAssembly.id,
            modalityId: r.modalityId,
            participantType: r.participantType,
            participantId: r.participantId,
            participantName: r.participantName,
            participantRole: r.participantRole,
            participantStatus: r.participantStatus,
            registeredAt: new Date(r.registeredAt),
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
            participacaoComites: r.participacaoComites,
            interesseVoluntariado: r.interesseVoluntariado,
            isPaymentExempt: r.isPaymentExempt,
            paymentExemptReason: r.paymentExemptReason,
            receiptFileName: r.receiptFileName,
            receiptFileType: r.receiptFileType,
            receiptFileSize: r.receiptFileSize,
            receiptFileData: r.receiptFileData,
            receiptUploadedAt: r.receiptUploadedAt ? new Date(r.receiptUploadedAt) : null,
            receiptUploadedBy: r.receiptUploadedBy,
            reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null,
            reviewedBy: r.reviewedBy,
            reviewNotes: r.reviewNotes,
            rejectionReason: r.rejectionReason,
            resubmittedAt: r.resubmittedAt ? new Date(r.resubmittedAt) : null,
            resubmissionNote: r.resubmissionNote,
          })),
        });
      }

      // Create archived AG config snapshot if available
      if (agConfig) {
        await prisma.archivedAGConfig.create({
          data: {
            assemblyId: archivedAssembly.id,
            codeOfConductUrl: agConfig.codeOfConductUrl,
            paymentInfo: agConfig.paymentInfo,
            paymentInstructions: agConfig.paymentInstructions,
            bankDetails: agConfig.bankDetails,
            pixKey: agConfig.pixKey,
            registrationEnabled: agConfig.registrationEnabled,
            autoApproval: agConfig.autoApproval,
            originalCreatedAt: new Date(agConfig.originalCreatedAt),
            originalUpdatedAt: new Date(agConfig.originalUpdatedAt),
            originalUpdatedBy: agConfig.originalUpdatedBy,
          },
        });
      }

      return {
        archivedAssemblyId: archivedAssembly.id,
        archivedParticipants: participants.length,
        archivedRegistrations: registrations.length,
        archivedModalities: modalities.length,
        hasConfigSnapshot: !!agConfig,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Assembly successfully archived to SQL database',
      data: result,
    });

  } catch (error) {
    console.error('Error archiving assembly to SQL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive assembly to SQL database',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 