import type { NextApiRequest, NextApiResponse } from 'next';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { assemblyId } = req.body;

    if (!assemblyId) {
      return res.status(400).json({ error: 'Assembly ID is required' });
    }

    // Initialize Convex client
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Fetch assembly data
    const assemblyData = await convex.query(api.assemblies.getAssemblyDataForReport, {
      id: assemblyId,
    });

    if (!assemblyData.assembly) {
      return res.status(404).json({ error: 'Assembly not found' });
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Assembly Info Sheet
    const assemblyInfo = [
      ['Campo', 'Valor'],
      ['Nome', assemblyData.assembly.name],
      ['Tipo', assemblyData.assembly.type],
      ['Local', assemblyData.assembly.location],
      ['Data de Início', new Date(assemblyData.assembly.startDate).toLocaleDateString('pt-BR')],
      ['Data de Fim', new Date(assemblyData.assembly.endDate).toLocaleDateString('pt-BR')],
      ['Status', assemblyData.assembly.status],
      ['Inscrições Abertas', assemblyData.assembly.registrationOpen ? 'Sim' : 'Não'],
      ['Máx. Participantes', assemblyData.assembly.maxParticipants || 'Ilimitado'],
      ['Descrição', assemblyData.assembly.description || ''],
      ['Criada em', new Date(assemblyData.assembly.createdAt).toLocaleDateString('pt-BR')],
      ['Última atualização', new Date(assemblyData.assembly.lastUpdated).toLocaleDateString('pt-BR')]
    ];
    const assemblyWs = XLSX.utils.aoa_to_sheet(assemblyInfo);
    XLSX.utils.book_append_sheet(workbook, assemblyWs, 'Informações da AG');

    // Participants Sheet
    if (assemblyData.participants.length > 0) {
      const participantsData = [
        ['ID', 'Tipo', 'Nome', 'Função', 'Status', 'Escola', 'Regional', 'Cidade', 'UF', 'AG Filiação', 'Criado em'],
        ...assemblyData.participants.map(p => [
          p.participantId, p.type, p.name, p.role || '', p.status || '', 
          p.escola || '', p.regional || '', p.cidade || '', p.uf || '', p.agFiliacao || '',
          new Date(p.createdAt).toLocaleDateString('pt-BR')
        ])
      ];
      const participantsWs = XLSX.utils.aoa_to_sheet(participantsData);
      XLSX.utils.book_append_sheet(workbook, participantsWs, 'Participantes');
    }

    // Registrations Sheet
    if (assemblyData.registrations.length > 0) {
      const registrationsData = [
        ['ID', 'Nome', 'Tipo', 'Email', 'Status', 'Data de Inscrição', 'Modalidade', 'Escola', 'Regional', 'Cidade', 'UF', 'Celular', 'CPF', 'Data Nascimento', 'Isento Pagamento', 'Tem Comprovante', 'Arquivo Comprovante'],
        ...assemblyData.registrations.map(r => [
          r.participantId, r.participantName, r.participantType, r.email, r.status,
          new Date(r.registeredAt).toLocaleDateString('pt-BR'), 
          r.modalityId, r.escola || '', r.regional || '', r.cidade || '', r.uf || '',
          r.celular || '', r.cpf || '', r.dataNascimento || '',
          r.isPaymentExempt ? 'Sim' : 'Não',
          r.receiptStorageId ? 'Sim' : 'Não',
          r.receiptFileName || ''
        ])
      ];
      const registrationsWs = XLSX.utils.aoa_to_sheet(registrationsData);
      XLSX.utils.book_append_sheet(workbook, registrationsWs, 'Inscrições');
    }

    // Modalities Sheet
    if (assemblyData.modalities.length > 0) {
      const modalitiesData = [
        ['ID', 'Nome', 'Descrição', 'Preço (centavos)', 'Preço (R$)', 'Máx. Participantes', 'Ativo', 'Ordem'],
        ...assemblyData.modalities.map(m => [
          m._id, m.name, m.description || '', m.price, `R$ ${(m.price / 100).toFixed(2)}`,
          m.maxParticipants || 'Ilimitado', m.isActive ? 'Sim' : 'Não', m.order
        ])
      ];
      const modalitiesWs = XLSX.utils.aoa_to_sheet(modalitiesData);
      XLSX.utils.book_append_sheet(workbook, modalitiesWs, 'Modalidades');
    }

    // AG Config Sheet (if available)
    if (assemblyData.agConfig) {
      const configData = [
        ['Campo', 'Valor'],
        ['URL Código de Conduta', assemblyData.agConfig.codeOfConductUrl || ''],
        ['Informações de Pagamento', assemblyData.agConfig.paymentInfo || ''],
        ['Instruções de Pagamento', assemblyData.agConfig.paymentInstructions || ''],
        ['Detalhes Bancários', assemblyData.agConfig.bankDetails || ''],
        ['Chave PIX', assemblyData.agConfig.pixKey || ''],
        ['Inscrições Habilitadas', assemblyData.agConfig.registrationEnabled ? 'Sim' : 'Não'],
        ['Aprovação Automática', assemblyData.agConfig.autoApproval ? 'Sim' : 'Não'],
        ['Atualizado em', new Date(assemblyData.agConfig.updatedAt).toLocaleDateString('pt-BR')]
      ];
      const configWs = XLSX.utils.aoa_to_sheet(configData);
      XLSX.utils.book_append_sheet(workbook, configWs, 'Configurações');
    }

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Create ZIP file
    const zip = new JSZip();
    
    // Add Excel file to ZIP
    const excelFileName = `relatorio_${assemblyData.assembly.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    zip.file(excelFileName, excelBuffer);

    // Add payment receipts folder
    const receiptsFolder = zip.folder('comprovantes_pagamento');
    
    // Add actual receipt files
    const registrationsWithReceipts = assemblyData.registrations.filter(r => r.receiptStorageId);
    
    if (registrationsWithReceipts.length > 0) {
      // Download and add each receipt file to the ZIP
      for (const registration of registrationsWithReceipts) {
        try {
          // Get file URL from Convex
          const fileUrl = await convex.query(api.files.getFileUrl, {
            storageId: registration.receiptStorageId!
          });

          if (fileUrl) {
            // Download file
            const fileResponse = await fetch(fileUrl);
            if (fileResponse.ok) {
              const buffer = await fileResponse.arrayBuffer();
              const fileName = registration.receiptFileName || `comprovante_${registration.participantId}.pdf`;
              receiptsFolder?.file(fileName, buffer);
            }
          }
        } catch (error) {
          console.warn(`Failed to download receipt file for ${registration.participantName}:`, error);
        }
      }
    }

    // Add summary file
    receiptsFolder?.file('README.txt', 
      `Comprovantes de Pagamento - ${assemblyData.assembly.name}\n\n` +
      `Total de inscrições: ${assemblyData.registrations.length}\n` +
      `Inscrições com comprovante: ${registrationsWithReceipts.length}\n` +
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`
    );

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // Set response headers for file download
    const fileName = `relatorio_completo_${assemblyData.assembly.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', zipBuffer.length);

    // Send the ZIP file
    res.send(zipBuffer);

  } catch (error) {
    console.error('Error generating AG report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 