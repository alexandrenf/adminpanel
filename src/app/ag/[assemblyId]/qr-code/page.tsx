"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { CheckCircle, XCircle, Users, QrCode, Calendar, MapPin, UserCheck, Clock, AlertCircle, Download, Printer, Share2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../convex/_generated/api";
import QRCodeLib from 'qrcode';

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function AGQrCodePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const badgeRef = useRef<HTMLDivElement>(null);
    
    const assemblyId = params?.assemblyId as string;
    const registrationId = searchParams?.get('registration') as string;
    
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [attendanceMarked, setAttendanceMarked] = useState(false);

    // Fetch assembly and registration data
    const assembly = useQuery(convexApi.assemblies?.getById, assemblyId ? { id: assemblyId as any } : "skip");
    const registration = useQuery(convexApi.agRegistrations?.getById, registrationId ? { id: registrationId as any } : "skip");
    
    // Fetch comitês locais to get the name
    const comitesLocais = useQuery(convexApi.assemblies?.getComitesLocais) || [];
    
    // Fetch EBs and CRs to get specific role names
    const ebs = useQuery(convexApi.assemblies?.getEBs) || [];
    const crs = useQuery(convexApi.assemblies?.getCRs) || [];

    // Generate QR code when data is available
    useEffect(() => {
        if (registration && assembly && !qrCodeDataUrl) {
            generateQrCode();
        }
    }, [registration, assembly, qrCodeDataUrl]);

    const generateQrCode = async () => {
        if (!registration || !assembly) return;

        setIsGeneratingQr(true);
        try {
            const qrData = JSON.stringify({
                type: "ag_registration",
                registrationId: registration._id,
                assemblyId: assembly._id,
                participantName: registration.participantName,
                participantType: registration.participantType,
                assemblyName: assembly.name,
                timestamp: Date.now()
            });

            const qrCodeDataURL = await QRCodeLib.toDataURL(qrData, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#1e40af',
                    light: '#ffffff'
                }
            });

            setQrCodeDataUrl(qrCodeDataURL);
        } catch (error) {
            console.error("Error generating QR code:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao gerar QR code. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsGeneratingQr(false);
        }
    };

    const markAttendance = () => {
        setAttendanceMarked(true);
        toast({
            title: "✅ Presença confirmada!",
            description: "Sua presença foi registrada com sucesso.",
        });
    };

    // Get participant type label with specific roles
    const getDetailedParticipantTypeLabel = () => {
        if (!registration) return "N/A";
        
        const baseType = getParticipantTypeLabel(registration.participantType);
        
        // For EB, look up the specific role from the EBs data
        if (registration.participantType?.toLowerCase() === "eb" && registration.participantId) {
            const ebData = ebs.find((eb: any) => eb.participantId === registration.participantId);
            if (ebData) {
                return ebData.name; // Return just the role name for the badge
            }
        } 
        // For CR, look up the specific role from the CRs data
        else if (registration.participantType?.toLowerCase() === "cr" && registration.participantId) {
            const crData = crs.find((cr: any) => cr.participantId === registration.participantId);
            if (crData) {
                return crData.name; // Return just the role name for the badge
            }
        }
        
        return baseType;
    };

    // Get participant type label
    const getParticipantTypeLabel = (type: string) => {
        switch (type?.toLowerCase()) {
            case "eb": return "Executive Board";
            case "cr": return "Coordenador Regional";
            case "comite_local": return "Comitê Local";
            case "comite_aspirante": return "Comitê Aspirante";
            case "supco": return "Conselho Supervisor";
            case "observador_externo": return "Observador Externo";
            case "alumni": return "Alumni";
            default: return type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "N/A";
        }
    };

    // Get comitê local name
    const getComiteLocalName = () => {
        if (!registration?.comiteLocal) return null;
        
        const comite = comitesLocais.find((c: any) => c.participantId === registration.comiteLocal);
        return comite?.name || registration.comiteLocal;
    };

    // Download badge as image
    const downloadBadge = async () => {
        if (!badgeRef.current || !registration) return;

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size (standard badge size)
            canvas.width = 800;
            canvas.height = 1200;

            // Fill background with gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#f8fafc');
            gradient.addColorStop(1, '#e2e8f0');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add IFMSA Brazil header
            ctx.fillStyle = '#1e40af';
            ctx.fillRect(0, 0, canvas.width, 120);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('IFMSA Brazil', canvas.width / 2, 70);

            // Add assembly name
            ctx.fillStyle = '#1e40af';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(assembly?.name || '', canvas.width / 2, 180);

            // Add participant name
            ctx.fillStyle = '#1f2937';
            ctx.font = 'bold 48px Arial';
            const nameLines = wrapText(ctx, registration.nomeCracha || registration.participantName, canvas.width - 80, 48);
            let yPosition = 280;
            nameLines.forEach(line => {
                ctx.fillText(line, canvas.width / 2, yPosition);
                yPosition += 60;
            });

            // Add pronouns if available
            if (registration.pronomes) {
                ctx.fillStyle = '#6b7280';
                ctx.font = '24px Arial';
                ctx.fillText(`(${registration.pronomes})`, canvas.width / 2, yPosition + 20);
                yPosition += 60;
            }

            // Add role/position
            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(getDetailedParticipantTypeLabel(), canvas.width / 2, yPosition + 40);
            yPosition += 80;

            // Add comitê local if available
            const comiteLocalName = getComiteLocalName();
            if (comiteLocalName) {
                ctx.fillStyle = '#059669';
                ctx.font = '20px Arial';
                const comiteLines = wrapText(ctx, comiteLocalName, canvas.width - 80, 20);
                comiteLines.forEach(line => {
                    ctx.fillText(line, canvas.width / 2, yPosition);
                    yPosition += 30;
                });
                yPosition += 40;
            }

            // Add QR code if available
            if (qrCodeDataUrl) {
                const qrImg = new Image();
                qrImg.onload = () => {
                    // Draw QR code
                    const qrSize = 200;
                    const qrX = (canvas.width - qrSize) / 2;
                    const qrY = yPosition + 40;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
                    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

                    // Add QR code label
                    ctx.fillStyle = '#4b5563';
                    ctx.font = '16px Arial';
                    ctx.fillText('Código para Presença', canvas.width / 2, qrY + qrSize + 40);

                    // Download the canvas as image
                    const link = document.createElement('a');
                    link.download = `Cracha_${registration.participantName.replace(/\s+/g, '_')}_${assembly?.name?.replace(/\s+/g, '_') || 'AG'}.png`;
                    link.href = canvas.toDataURL();
                    link.click();

                    toast({
                        title: "✅ Crachá baixado",
                        description: "Crachá salvo com sucesso!",
                    });
                };
                qrImg.src = qrCodeDataUrl;
            } else {
                // Download without QR code
                const link = document.createElement('a');
                link.download = `Cracha_${registration.participantName.replace(/\s+/g, '_')}_${assembly?.name?.replace(/\s+/g, '_') || 'AG'}.png`;
                link.href = canvas.toDataURL();
                link.click();

                toast({
                    title: "✅ Crachá baixado",
                    description: "Crachá salvo com sucesso!",
                });
            }

        } catch (error) {
            console.error("Error downloading badge:", error);
            toast({
                title: "❌ Erro",
                description: "Erro ao baixar crachá. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    // Helper function to wrap text
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number) => {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i] || '';
            const width = ctx.measureText(currentLine + ' ' + word).width;
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        return lines;
    };

    // Print badge
    const printBadge = () => {
        window.print();
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved": return "bg-green-100 text-green-800 border-green-200";
            case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "pending_review": return "bg-orange-100 text-orange-800 border-orange-200";
            case "rejected": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "approved": return "Aprovado";
            case "pending": return "Pendente";
            case "pending_review": return "Aguardando Análise";
            case "rejected": return "Rejeitado";
            default: return status;
        }
    };

    if (!assemblyId) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-red-800 mb-2">Erro</h1>
                        <p className="text-red-600">ID da assembleia não encontrado na URL.</p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    if (!registrationId) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h1 className="text-xl font-bold text-orange-800 mb-2">Parâmetro Obrigatório</h1>
                        <p className="text-orange-600">
                            Esta página requer um parâmetro &quot;registration&quot; com o ID da inscrição.
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            Exemplo: /ag/{assemblyId}/qr-code?registration=abc123
                        </p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    if (!assembly || !registration) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando dados...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Crachá Eletrônico
                                </h1>
                                <p className="text-gray-600">
                                    {assembly.name}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Assembly Info */}
                    <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-center space-x-6 text-sm">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span>
                                        {formatDateWithoutTimezone(assembly.startDate)} - {" "}
                                        {formatDateWithoutTimezone(assembly.endDate)}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    <span>{assembly.location}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <span>{assembly.type === "AG" ? "Presencial" : "Online"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Digital Badge */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-center">Seu Crachá Digital</h2>
                            
                            <div 
                                ref={badgeRef}
                                className="bg-white border-2 border-gray-200 rounded-lg shadow-xl mx-auto p-6 w-80 min-h-[500px] print:shadow-none print:border-black print:border-2"
                                style={{ aspectRatio: '2/3' }}
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg -mx-6 -mt-6 mb-6">
                                    <div className="text-center">
                                        <h3 className="font-bold text-lg">IFMSA Brazil</h3>
                                        <p className="text-sm opacity-90">{assembly.name}</p>
                                    </div>
                                </div>

                                {/* Participant Info */}
                                <div className="text-center space-y-4">
                                    {/* Name */}
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800 leading-tight">
                                            {registration.nomeCracha || registration.participantName}
                                        </h2>
                                        {registration.pronomes && (
                                            <p className="text-gray-600 text-sm mt-1">({registration.pronomes})</p>
                                        )}
                                    </div>

                                    {/* Role/Position */}
                                    <div>
                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-sm px-3 py-1">
                                            {getDetailedParticipantTypeLabel()}
                                        </Badge>
                                    </div>

                                    {/* Comitê Local */}
                                    {getComiteLocalName() && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                            <p className="text-green-800 font-semibold text-sm">
                                                {getComiteLocalName()}
                                            </p>
                                        </div>
                                    )}

                                    {/* Event Details */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
                                        <div className="flex items-center justify-center space-x-1">
                                            <Calendar className="w-3 h-3 text-gray-500" />
                                            <span className="text-gray-600">
                                                {formatDateWithoutTimezone(assembly.startDate)} - {formatDateWithoutTimezone(assembly.endDate)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-center space-x-1">
                                            <MapPin className="w-3 h-3 text-gray-500" />
                                            <span className="text-gray-600">{assembly.location}</span>
                                        </div>
                                    </div>

                                    {/* QR Code */}
                                    {registration.status === "approved" && (
                                        <div className="pt-4">
                                            {isGeneratingQr ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                                </div>
                                            ) : qrCodeDataUrl ? (
                                                <div className="space-y-2">
                                                    <div className="flex justify-center">
                                                        <div className="bg-white p-2 border border-gray-200 rounded">
                                                            <img 
                                                                src={qrCodeDataUrl} 
                                                                alt="QR Code para presença" 
                                                                className="w-24 h-24"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-gray-500">Código para Presença</p>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4">
                                                    <QrCode className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                                    <p className="text-xs text-gray-500">QR Code não disponível</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Controls and Info */}
                        <div className="space-y-6">
                            {/* Status Card */}
                            <Card className="shadow-lg border-0">
                                <CardHeader>
                                    <CardTitle className="text-xl flex items-center space-x-2">
                                        <Users className="w-5 h-5 text-green-600" />
                                        <span>Status da Inscrição</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Status:</span>
                                        <Badge className={getStatusColor(registration.status)}>
                                            {getStatusLabel(registration.status)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Data de Inscrição:</span>
                                        <span className="text-sm">
                                            {new Date(registration.registeredAt).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            {registration.status === "approved" ? (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center space-x-2">
                                            <Download className="w-5 h-5" />
                                            <span>Ações</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Button 
                                            onClick={downloadBadge} 
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar Crachá (PNG)
                                        </Button>
                                        
                                        <Button 
                                            onClick={printBadge} 
                                            variant="outline" 
                                            className="w-full"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Imprimir Crachá
                                        </Button>
                                        
                                        <Button 
                                            onClick={() => {
                                                navigator.share?.({
                                                    title: `Crachá - ${registration.participantName}`,
                                                    text: `Crachá eletrônico para ${assembly.name}`,
                                                    url: window.location.href
                                                }).catch(() => {
                                                    navigator.clipboard.writeText(window.location.href);
                                                    toast({
                                                        title: "Link copiado",
                                                        description: "Link do crachá copiado para a área de transferência",
                                                    });
                                                });
                                            }}
                                            variant="outline" 
                                            className="w-full"
                                        >
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Compartilhar
                                        </Button>

                                        {!attendanceMarked ? (
                                            <Button
                                                onClick={markAttendance}
                                                className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                                <UserCheck className="w-4 h-4 mr-2" />
                                                Marcar Presença
                                            </Button>
                                        ) : (
                                            <Button
                                                disabled
                                                className="w-full bg-green-600"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Presença Marcada
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="shadow-lg border-0 bg-orange-50 border-orange-200">
                                    <CardContent className="p-8 text-center">
                                        <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-orange-800 mb-2">
                                            Inscrição Não Aprovada
                                        </h3>
                                        <p className="text-orange-700">
                                            Seu crachá digital e QR code estarão disponíveis após a aprovação da sua inscrição.
                                        </p>
                                        <Badge className={`${getStatusColor(registration.status)} mt-3`}>
                                            Status Atual: {getStatusLabel(registration.status)}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Instructions */}
                            <Card className="shadow-lg border-0 bg-amber-50 border-amber-200">
                                <CardContent className="p-6">
                                    <h3 className="text-lg font-semibold text-amber-800 mb-3">Como usar:</h3>
                                    <ul className="text-amber-700 space-y-2 text-sm">
                                        <li>• <strong>Digital:</strong> Mostre o crachá na tela do seu dispositivo</li>
                                        <li>• <strong>Impresso:</strong> Use a função imprimir para gerar uma versão física</li>
                                        <li>• <strong>QR Code:</strong> Permite verificação rápida da sua presença</li>
                                        <li>• <strong>Compartilhar:</strong> Envie o link para outros organizadores</li>
                                        <li>• <strong>Presença:</strong> O QR code será escaneado no evento para confirmar participação</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:border-black { border-color: black !important; }
                    .print\\:border-2 { border-width: 2px !important; }
                }
            `}</style>
        </main>
    );
} 