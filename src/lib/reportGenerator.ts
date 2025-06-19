import * as XLSX from 'xlsx';

type AttendanceState = "present" | "absent" | "not-counting" | "excluded";

interface ReportData {
    ebs: any[];
    crs: any[];
    comitesPlenos: any[];
    comitesNaoPlenos: any[];
}

interface SessionData {
    name?: string;
    type?: string;
    attendanceRecords?: any[] | {
        ebs?: any[];
        crs?: any[];
        comites?: any[];
        participantes?: any[];
    };
}

interface AGParticipant {
    participantId: string;
    status: string;
}

export const generateAGReport = (
    reportData: ReportData,
    sessionData?: SessionData,
    sessionType?: "avulsa" | "plenaria" | "sessao",
    agComitesParticipants?: AGParticipant[]
) => {
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Helper function to create worksheet from data
    const createWorksheet = (data: any[], title: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, title);
    };

    // Determine data source based on session type
    const isSessionMode = sessionType === "plenaria" || sessionType === "sessao";
    
    let finalReportData = {
        ebs: [] as any[],
        crs: [] as any[],
        comitesPlenos: [] as any[],
        comitesNaoPlenos: [] as any[]
    };

    if (isSessionMode && sessionData?.attendanceRecords) {
        // Use session attendance data for plenaria/sessao
        const sessionAttendance = sessionData.attendanceRecords;
        
        let ebs: any[] = [];
        let crs: any[] = [];
        let comites: any[] = [];
        let individuals: any[] = [];

        // Check if it's the object format (ebs, crs, comites, participantes) or flat array
        if (Array.isArray(sessionAttendance)) {
            // Flat array format - group by participant type
            console.log("Excel Report Debug (Session Mode - Array Format):", {
                sessionType: sessionType,
                sessionName: sessionData.name,
                sessionAttendanceCount: sessionAttendance.length,
                sampleRecords: sessionAttendance.slice(0, 3)
            });

            ebs = sessionAttendance.filter((r: any) => r.participantType === "eb");
            crs = sessionAttendance.filter((r: any) => r.participantType === "cr");
            comites = sessionAttendance.filter((r: any) => r.participantType === "comite" || r.participantType === "comite_local");
            individuals = sessionAttendance.filter((r: any) => r.participantType === "individual");
        } else {
            // Object format with separate arrays
            console.log("Excel Report Debug (Session Mode - Object Format):", {
                sessionType: sessionType,
                sessionName: sessionData.name,
                hasEbs: !!(sessionAttendance as any).ebs,
                hasCrs: !!(sessionAttendance as any).crs,
                hasComites: !!(sessionAttendance as any).comites,
                hasParticipantes: !!(sessionAttendance as any).participantes
            });

            ebs = (sessionAttendance as any).ebs || [];
            crs = (sessionAttendance as any).crs || [];
            comites = (sessionAttendance as any).comites || [];
            individuals = (sessionAttendance as any).participantes || [];
        }
        
        // Process EBs
        finalReportData.ebs = ebs.map((record: any) => ({
            'Tipo': 'EB',
            'Nome': record.participantName || record.name || 'N/A',
            'Cargo': record.participantRole || record.role || 'N/A',
            'Status': record.attendance === "present" ? "Presente" : 
                     record.attendance === "absent" ? "Ausente" : 
                     record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
        }));
        
        // Process CRs
        finalReportData.crs = crs.map((record: any) => ({
            'Tipo': 'CR',
            'Nome': record.participantName || record.name || 'N/A',
            'Cargo': record.participantRole || record.role || 'N/A',
            'Status': record.attendance === "present" ? "Presente" : 
                     record.attendance === "absent" ? "Ausente" : 
                     record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
        }));
        
        // Process Comitês - handle status separation properly
        if (sessionType === "plenaria" && agComitesParticipants) {
            // For plenárias, use agComitesParticipants to get proper committee status
            const comiteStatusMap = new Map();
            agComitesParticipants.forEach((comite: any) => {
                comiteStatusMap.set(comite.participantId, comite.status);
            });

            comites.forEach((record: any) => {
                // Get the proper status from agComitesParticipants
                const properStatus = comiteStatusMap.get(record.participantId) || "Não-pleno";
                
                const comiteData = {
                    'Tipo': properStatus === "Pleno" ? 'Comitê Pleno' : 'Comitê Não-Pleno',
                    'Nome': record.participantName || record.name || 'N/A',
                    'Escola': record.participantSchool || record.escola || 'N/A',
                    'Regional': record.participantRegion || record.regional || 'N/A',
                    'Localização': record.participantLocation || `${record.cidade || 'N/A'}, ${record.uf || 'N/A'}`,
                    'Status': record.attendance === "present" ? "Presente" : 
                             record.attendance === "absent" ? "Ausente" : 
                             record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
                };

                if (properStatus === "Pleno") {
                    finalReportData.comitesPlenos.push(comiteData);
                } else {
                    finalReportData.comitesNaoPlenos.push(comiteData);
                }
            });
        } else {
            // Fallback for non-plenária sessions or when agComitesParticipants is not available
            comites.forEach((record: any) => {
                const comiteData = {
                    'Tipo': record.participantStatus === "Pleno" ? 'Comitê Pleno' : 'Comitê Não-Pleno',
                    'Nome': record.participantName || record.name || 'N/A',
                    'Escola': record.participantSchool || record.escola || 'N/A',
                    'Regional': record.participantRegion || record.regional || 'N/A',
                    'Localização': record.participantLocation || `${record.cidade || 'N/A'}, ${record.uf || 'N/A'}`,
                    'Status': record.attendance === "present" ? "Presente" : 
                             record.attendance === "absent" ? "Ausente" : 
                             record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado"
                };

                if (record.participantStatus === "Pleno" || record.status === "Pleno") {
                    finalReportData.comitesPlenos.push(comiteData);
                } else {
                    finalReportData.comitesNaoPlenos.push(comiteData);
                }
            });
        }

        // Handle individual participants for sessions
        if (sessionType === "sessao") {
            if (individuals.length > 0) {
                const individualParticipants = individuals.map((record: any) => ({
                    'Nome': record.participantName || 'N/A',
                    'Cargo/Função': record.participantRole || 'Participante',
                    'Comitê/Instituição': record.comiteLocal || '-',
                    'ID': record.participantId || '-',
                    'Status': record.attendance === "present" ? "Presente" : 
                             record.attendance === "absent" ? "Ausente" : 
                             record.attendance === "excluded" ? "Excluído do quórum" : "Não contabilizado",
                    'Última Atualização': new Date(record.lastUpdated || record.markedAt).toLocaleString('pt-BR')
                }));

                // For sessions, create a single comprehensive worksheet
                createWorksheet(individualParticipants, 'Participantes da Sessão');
                
                // Generate Excel file
                const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                return {
                    buffer: excelBuffer,
                    filename: `relatorio-presenca-sessao${sessionData?.name ? `-${sessionData.name.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}-${new Date().toISOString().split('T')[0]}.xlsx`,
                    stats: {
                        present: individuals.filter((p: any) => p.attendance === "present").length,
                        total: individuals.length,
                        type: 'sessao',
                        sessionName: sessionData?.name
                    }
                };
            }
        }
    } else {
        // Use provided report data for avulsa mode
        console.log("Excel Report Debug (Avulsa Mode):", {
            sessionType: sessionType || "avulsa",
            reportData
        });

        finalReportData = reportData;
    }

    // Create worksheets for standard reports (plenaria and avulsa)
    createWorksheet(finalReportData.ebs, 'Diretoria Executiva');
    createWorksheet(finalReportData.crs, 'Coordenadores Regionais');
    createWorksheet(finalReportData.comitesPlenos, 'Comitês Plenos');
    createWorksheet(finalReportData.comitesNaoPlenos, 'Comitês Não-Plenos');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Calculate stats
    const totalCount = finalReportData.ebs.length + finalReportData.crs.length + 
                      finalReportData.comitesPlenos.length + finalReportData.comitesNaoPlenos.length;
    
    const sessionTypeLabel = isSessionMode ? 
        `${sessionType === "plenaria" ? "Plenária" : "Sessão"} "${sessionData?.name}"` : 
        "Chamada Avulsa";
    
    return {
        buffer: excelBuffer,
        filename: `relatorio-presenca-ag${sessionData?.name ? `-${sessionData.name.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}-${new Date().toISOString().split('T')[0]}.xlsx`,
        stats: {
            ebs: finalReportData.ebs.length,
            crs: finalReportData.crs.length,
            comitesPlenos: finalReportData.comitesPlenos.length,
            comitesNaoPlenos: finalReportData.comitesNaoPlenos.length,
            total: totalCount,
            type: sessionTypeLabel
        }
    };
};

export const downloadReport = (buffer: ArrayBuffer, filename: string) => {
    const dataBlob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Create download link
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}; 