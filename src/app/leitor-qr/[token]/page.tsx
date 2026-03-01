"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { CheckCircle, XCircle, Smartphone, QrCode, Users, AlertCircle, Clock, Building } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../convex/_generated/api";
import { Scanner } from "@yudiel/react-qr-scanner";

type ScannedData = {
    // Badge QR code format
    participantId?: string;
    participantName?: string;
    assemblyId?: string;
    assemblyName?: string;
    registrationId?: string;
    registrationParticipantType?: string;
    registrationParticipantId?: string;
    comiteLocal?: string;
    // Legacy QR code format
    type?: "eb" | "cr" | "comite";
    id?: string;
    name?: string;
    role?: string;
    status?: string;
    uf?: string;
};

export default function QrReaderPage() {
    const params = useParams();
    const token = params?.token as string;
    
    const [isScanning, setIsScanning] = useState(true);
    const [scannedData, setScannedData] = useState<ScannedData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resolvedParticipant, setResolvedParticipant] = useState<any>(null);
    const { toast } = useToast();

    // Get reader info by token
    const readerInfo = useQuery(convexApi.qrReaders.getByToken, { token: token as string });

    // Get session attendance if this is a session-specific reader
    const sessionAttendance = useQuery(
        convexApi.agSessions?.getSessionAttendance,
        readerInfo?.sessionId ? { sessionId: readerInfo.sessionId as any } : "skip"
    );

    // Registration data is needed to resolve badge QR codes in plenária
    const assemblyRegistrations = useQuery(
        convexApi.agRegistrations.getByAssembly,
        readerInfo?.sessionId && readerInfo?.assemblyId
            ? { assemblyId: readerInfo.assemblyId as any }
            : "skip"
    );

    // Get legacy attendance records for backwards compatibility
    const ebsAttendance = useQuery(convexApi.attendance.getByType, { type: "eb" });
    const crsAttendance = useQuery(convexApi.attendance.getByType, { type: "cr" });
    const comitesAttendance = useQuery(convexApi.attendance.getByType, { type: "comite" });

    // Mutations
    const updateLegacyAttendance = useMutation(convexApi.attendance.updateAttendance);
    const markSessionAttendance = useMutation(convexApi.agSessions?.markAttendance);

    // Check if reader exists and is valid
    if (readerInfo === undefined) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </main>
        );
    }

    if (readerInfo === null) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 flex items-center justify-center">
                <Card className="max-w-md mx-auto shadow-xl">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                        <h1 className="text-xl font-bold text-red-800 mb-2">Leitor Inválido</h1>
                        <p className="text-red-600">
                            Este link de leitor QR não é válido ou foi desativado.
                        </p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    const isSessionReader = !!readerInfo.sessionId;
    const sessionData = (readerInfo as any)?.session || null;
    const assemblyData = (readerInfo as any)?.assembly || null;

    const mapPlenaryRegistrationToTarget = (registrationType?: string, registrationParticipantId?: string, fallbackComiteLocal?: string) => {
        if (!registrationType) return null;

        if (registrationType === "eb" || registrationType === "cr") {
            if (!registrationParticipantId) return null;
            return {
                targetType: registrationType,
                targetId: registrationParticipantId,
            };
        }

        if (registrationType === "comite_local" || registrationType === "comite") {
            const comiteId = registrationParticipantId || fallbackComiteLocal;
            if (!comiteId) return null;
            return {
                targetType: "comite",
                targetId: comiteId,
            };
        }

        return null;
    };

    const handleQRCodeScan = (detectedCodes: { rawValue: string }[]) => {
        if (isProcessing || !detectedCodes?.[0]?.rawValue) return;

        setIsProcessing(true);
        try {
            const parsed = JSON.parse(detectedCodes[0].rawValue);
            
            // Handle badge QR codes (new format)
            if (parsed.participantId && parsed.participantName && parsed.assemblyId) {
                if (isSessionReader) {
                    // For session readers, find the participant in session attendance
                    handleBadgeQRCode(parsed);
                } else {
                    toast({
                        title: "QR Code de Crachá Detectado",
                        description: "Este leitor não está configurado para sessões. Use um leitor de sessão específica.",
                        variant: "destructive",
                    });
                    setIsProcessing(false);
                    return;
                }
            }
            // Handle legacy QR codes (old format)
            else if (parsed.type && parsed.id && parsed.name) {
                if (isSessionReader) {
                    toast({
                        title: "QR Code Legado Detectado",
                        description: "Este QR code não é compatível com leitores de sessão. Use um leitor geral.",
                        variant: "destructive",
                    });
                    setIsProcessing(false);
                    return;
                } else {
                    handleLegacyQRCode(parsed);
                }
            }
            else {
                toast({
                    title: "QR Code Inválido",
                    description: "Este QR code não é válido para presença.",
                    variant: "destructive",
                });
                setIsProcessing(false);
                return;
            }

        } catch (error) {
            toast({
                title: "Erro ao ler QR Code",
                description: "QR code inválido ou corrompido.",
                variant: "destructive",
            });
            setIsProcessing(false);
        }
    };

    const handleBadgeQRCode = (qrData: ScannedData) => {
        if (!sessionAttendance || !readerInfo.sessionId) {
            toast({
                title: "Erro de Configuração",
                description: "Dados da sessão não disponíveis.",
                variant: "destructive",
            });
            setIsProcessing(false);
            return;
        }

        // Check if the assembly matches
        if (qrData.assemblyId !== assemblyData?._id) {
            toast({
                title: "Assembleia Incorreta",
                description: "Este QR code é para uma assembleia diferente.",
                variant: "destructive",
            });
            setIsProcessing(false);
            return;
        }

        let participant: any = null;

        if (sessionData?.type === "plenaria") {
            if (assemblyRegistrations === undefined) {
                toast({
                    title: "Carregando dados",
                    description: "Aguarde o carregamento da lista de participantes da assembleia.",
                    variant: "destructive",
                });
                setIsProcessing(false);
                return;
            }

            let target =
                mapPlenaryRegistrationToTarget(
                    qrData.registrationParticipantType,
                    qrData.registrationParticipantId,
                    qrData.comiteLocal
                );

            // Backward compatibility for old badge QR payloads.
            if (!target && qrData.participantId) {
                const registration = assemblyRegistrations?.find((reg: any) => reg._id === qrData.participantId);
                target = mapPlenaryRegistrationToTarget(
                    registration?.participantType,
                    registration?.participantId,
                    registration?.comiteLocal
                );
            }

            if (!target) {
                toast({
                    title: "Participante não elegível",
                    description: "Na plenária, apenas EBs, CRs e Comitês Locais podem marcar presença.",
                    variant: "destructive",
                });
                setIsProcessing(false);
                return;
            }

            const plenaryParticipants = [
                ...sessionAttendance.ebs,
                ...sessionAttendance.crs,
                ...sessionAttendance.comites,
            ];

            participant = plenaryParticipants.find(
                (p: any) => p.participantType === target.targetType && p.participantId === target.targetId
            );
        } else {
            // Sessão específica: presença por inscrição individual.
            const allParticipants = [
                ...sessionAttendance.ebs,
                ...sessionAttendance.crs,
                ...sessionAttendance.comites,
                ...sessionAttendance.participantes,
            ];

            participant = allParticipants.find((p: any) =>
                p.participantId === qrData.participantId ||
                p.participantName === qrData.participantName
            );
        }

        if (!participant) {
            toast({
                title: "Participante não encontrado",
                description: "Este participante não está registrado nesta sessão.",
                variant: "destructive",
            });
            setIsProcessing(false);
            return;
        }

        setScannedData(qrData);
        setResolvedParticipant(participant);
        setIsScanning(false);
        setIsProcessing(false);
    };

    const handleLegacyQRCode = (qrData: ScannedData) => {
        // Legacy QR code handling for general readers
        let memberExists = false;
        if (qrData.type === "eb" && ebsAttendance) {
            memberExists = ebsAttendance.some(record => record.memberId === qrData.id);
        } else if (qrData.type === "cr" && crsAttendance) {
            memberExists = crsAttendance.some(record => record.memberId === qrData.id);
        } else if (qrData.type === "comite" && comitesAttendance) {
            memberExists = comitesAttendance.some(record => record.memberId === qrData.id);
        }

        if (!memberExists) {
            toast({
                title: "Membro não encontrado",
                description: "Este QR code não corresponde a nenhum membro registrado.",
                variant: "destructive",
            });
            setIsProcessing(false);
            return;
        }

        setScannedData(qrData);
        setIsScanning(false);
        setIsProcessing(false);
    };

    const handleMarkAsPresent = async () => {
        if (!scannedData || !readerInfo) return;

        setIsProcessing(true);
        try {
            if (isSessionReader && readerInfo.sessionId && resolvedParticipant) {
                // Mark session attendance
                await markSessionAttendance({
                    sessionId: readerInfo.sessionId as any,
                    participantId: resolvedParticipant.participantId,
                    participantName: resolvedParticipant.participantName || scannedData.participantName || "Unknown",
                    participantType: resolvedParticipant.participantType || "participant",
                    participantRole: resolvedParticipant.participantRole,
                    attendance: "present",
                    markedBy: `qr-reader-${readerInfo.name}`,
                });

                toast({
                    title: "✅ Presença marcada",
                    description: `${resolvedParticipant.participantName} foi marcado como presente na ${sessionData?.name}!`,
                });
            } else if (!isSessionReader && scannedData.type && scannedData.id && scannedData.name) {
                // Mark legacy attendance
                await updateLegacyAttendance({
                    type: scannedData.type,
                    memberId: scannedData.id,
                    name: scannedData.name,
                    role: scannedData.role,
                    status: "present",
                    attendance: "present",
                    lastUpdatedBy: `qr-reader-${readerInfo.name}`,
                });

                toast({
                    title: "✅ Presença marcada",
                    description: `${scannedData.name} foi marcado como presente!`,
                });
            }

            // Reset for next scan
            setScannedData(null);
            setResolvedParticipant(null);
            setIsScanning(true);
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao marcar presença. Tente novamente.",
                variant: "destructive",
            });
        }
        setIsProcessing(false);
    };

    const handleCancelScan = () => {
        setScannedData(null);
        setResolvedParticipant(null);
        setIsScanning(true);
    };

    const getSessionTypeIcon = (type: string) => {
        switch (type) {
            case "plenaria": return <Users className="w-5 h-5 text-purple-600" />;
            case "sessao": return <Building className="w-5 h-5 text-blue-600" />;
            case "avulsa": return <Clock className="w-5 h-5 text-gray-600" />;
            default: return <QrCode className="w-5 h-5 text-gray-600" />;
        }
    };

    const getSessionTypeLabel = (type: string) => {
        switch (type) {
            case "plenaria": return "Plenária";
            case "sessao": return "Sessão";
            case "avulsa": return "Avulsa";
            default: return "Geral";
        }
    };

    const getMemberIcon = (type: string) => {
        switch (type) {
            case "eb":
                return <Users className="w-5 h-5 text-blue-600" />;
            case "cr":
                return <Users className="w-5 h-5 text-purple-600" />;
            case "comite":
                return <Users className="w-5 h-5 text-green-600" />;
            default:
                return <QrCode className="w-5 h-5 text-gray-600" />;
        }
    };

    const getMemberTypeLabel = (type: string) => {
        switch (type) {
            case "eb":
                return "Diretoria Executiva";
            case "cr":
                return "Coordenador Regional";
            case "comite":
                return "Comitê Local";
            default:
                return "Participante";
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-20">
                <div className="w-full h-full" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
            </div>

            <div className="relative z-10 container mx-auto px-6 py-12">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Header */}
                    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardHeader className="text-center">
                            <CardTitle className="flex items-center justify-center space-x-3">
                                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                                    <Smartphone className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">
                                        Leitor QR - {readerInfo.name}
                                    </h1>
                                    {isSessionReader && sessionData && (
                                        <div className="flex items-center justify-center space-x-2 mt-2">
                                            {getSessionTypeIcon(sessionData.type)}
                                            <p className="text-lg text-gray-700">
                                                {sessionData.name}
                                            </p>
                                            <Badge variant="outline" className="text-xs">
                                                {getSessionTypeLabel(sessionData.type)}
                                            </Badge>
                                        </div>
                                    )}
                                    {!isSessionReader && (
                                        <p className="text-gray-600">Leitor Geral</p>
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    {/* Scanner or Confirmation */}
                    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-8">
                            {isScanning ? (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <QrCode className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                            Escaneie o QR Code
                                        </h2>
                                        <p className="text-gray-600">
                                            {isSessionReader ? 
                                                "Aponte a câmera para o QR code do crachá do participante" :
                                                "Aponte a câmera para o QR code de presença"
                                            }
                                        </p>
                                    </div>
                                    
                                    <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-sm mx-auto">
                                        <Scanner
                                            onScan={handleQRCodeScan}
                                            formats={['qr_code']}
                                            components={{
                                                finder: true,
                                            }}
                                            styles={{
                                                container: { width: '100%', height: '100%' },
                                                video: { width: '100%', height: '100%', objectFit: 'cover' }
                                            }}
                                        />
                                    </div>

                                    {isProcessing && (
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                            <p className="text-gray-600">Processando QR code...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-green-600" />
                                        </div>
                                        
                                        {isSessionReader && resolvedParticipant ? (
                                            <div>
                                                <div className="flex items-center justify-center space-x-3 mb-4">
                                                    <Users className="w-5 h-5 text-blue-600" />
                                                    <div>
                                                        <h3 className="font-bold text-green-800 text-lg">
                                                            {resolvedParticipant.participantName}
                                                        </h3>
                                                        <p className="text-green-700 text-sm">
                                                            {resolvedParticipant.participantRole || "Participante"}
                                                        </p>
                                                        {resolvedParticipant.comiteLocal && (
                                                            <p className="text-green-600 text-xs">
                                                                {resolvedParticipant.comiteLocal}
                                                            </p>
                                                        )}
                                                        <Badge 
                                                            variant={resolvedParticipant.attendance === "present" ? "default" : "outline"} 
                                                            className="text-green-600 border-green-200 mt-1"
                                                        >
                                                            {resolvedParticipant.attendance === "present" ? "Já presente" : "Ausente"}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-green-700 font-medium">
                                                    Marcar presença em: {sessionData?.name}?
                                                </p>
                                            </div>
                                        ) : scannedData && (
                                            <div>
                                                <div className="flex items-center justify-center space-x-3 mb-4">
                                                    {getMemberIcon(scannedData.type || "")}
                                                    <div>
                                                        <h3 className="font-bold text-green-800 text-lg">
                                                            {scannedData.name || scannedData.participantName}
                                                        </h3>
                                                        <p className="text-green-700 text-sm">
                                                            {getMemberTypeLabel(scannedData.type || "")}
                                                        </p>
                                                        {scannedData.role && (
                                                            <p className="text-green-600 text-xs">{scannedData.role}</p>
                                                        )}
                                                        {scannedData.status && (
                                                            <Badge variant="outline" className="text-green-600 border-green-200 mt-1">
                                                                {scannedData.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-green-700 font-medium">
                                                    Deseja marcar esta pessoa como presente?
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex space-x-4">
                                        <Button
                                            onClick={handleCancelScan}
                                            variant="outline"
                                            className="flex-1"
                                            disabled={isProcessing}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" />
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleMarkAsPresent}
                                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                            disabled={isProcessing}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Marcando...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Marcar Presente
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <h3 className="font-semibold text-gray-900 mb-3">
                                {isSessionReader ? "Instruções para Sessão" : "Instruções Gerais"}
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                {isSessionReader ? (
                                    <>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Este leitor marca presença na sessão específica: <strong>{sessionData?.name}</strong></span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Escaneie apenas QR codes de crachás de participantes</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Somente participantes registrados nesta sessão podem ter presença marcada</span>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Este é um leitor geral para presença na assembleia</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Escaneie QR codes de presença tradicionais</span>
                                        </li>
                                        <li className="flex items-center space-x-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                            <span>Para sessões específicas, use leitores de sessão</span>
                                        </li>
                                    </>
                                )}
                                <li className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    <span>Mantenha boa iluminação para melhor leitura</span>
                                </li>
                                <li className="flex items-center space-x-2">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                    <span>Aguarde a confirmação antes de escanear o próximo código</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 
