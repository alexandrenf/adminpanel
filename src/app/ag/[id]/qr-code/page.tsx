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

// Utility function to format dates without timezone conversion
const formatDateWithoutTimezone = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

export default function QRCodePage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const assemblyId = params?.id as string;
    const registrationId = searchParams?.get('registration');
    
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [attendanceMarked, setAttendanceMarked] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Helper functions
    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "pending_review": return "bg-orange-100 text-orange-800 border-orange-200";
            case "approved": return "bg-green-100 text-green-800 border-green-200";
            case "rejected": return "bg-red-100 text-red-800 border-red-200";
            case "cancelled": return "bg-gray-100 text-gray-800 border-gray-200";
            default: return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "pending": return "Pendente";
            case "pending_review": return "Aguardando Análise";
            case "approved": return "Aprovado";
            case "rejected": return "Rejeitado";
            case "cancelled": return "Cancelado";
            default: return status;
        }
    };

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

    // Fetch registration and assembly data
    const registration = useQuery(
        convexApi.agRegistrations?.getById,
        registrationId ? { id: registrationId as any } : "skip"
    );

    const assembly = useQuery(
        convexApi.assemblies?.getById,
        assemblyId ? { id: assemblyId as any } : "skip"
    );
    
    // Get assembly from registration if the direct assembly query didn't work
    const assemblyFromRegistration = useQuery(
        convexApi.assemblies?.getById,
        registration?.assemblyId ? { id: registration.assemblyId as any } : "skip"
    );
    
    // Use the assembly data from whichever query succeeded
    const finalAssembly = assembly || assemblyFromRegistration;

    const markAttendance = useMutation(convexApi.agRegistrations?.markAttendance);

    // Generate QR code with participant data
    useEffect(() => {
        if (registration && finalAssembly) {
            // Create QR code data with participant information
            const qrData = {
                participantId: registration._id,
                participantName: registration.participantName,
                assemblyId: finalAssembly._id,
                assemblyName: finalAssembly.name
            };
            
            // Convert to JSON string for QR code
            const qrContent = JSON.stringify(qrData);
            
            // Generate QR code from participant data
            import('qrcode').then((QRCodeLib) => {
                QRCodeLib.toDataURL(qrContent, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                }).then(setQrCodeDataUrl).catch(console.error);
            });
        }
    }, [registration, finalAssembly]);

    // Handle attendance marking
    const handleMarkAttendance = async () => {
        if (!registration || !finalAssembly) return;
        
        try {
            await markAttendance({ 
                registrationId: registration._id as any,
                markedAt: Date.now(),
                markedBy: 'system' // You might want to get actual user info here
            });
            setAttendanceMarked(true);
            toast({
                title: "✅ Presença Confirmada",
                description: "Presença marcada com sucesso!",
            });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao marcar presença. Tente novamente.",
                variant: "destructive",
            });
        }
    };

    // Generate and download digital badge
    const downloadBadge = async () => {
        if (!registration || !finalAssembly || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = 800;
        canvas.height = 1200;

        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header gradient
        const headerGradient = ctx.createLinearGradient(0, 0, 0, 200);
        headerGradient.addColorStop(0, '#1e40af');
        headerGradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = headerGradient;
        ctx.fillRect(0, 0, canvas.width, 200);

        // Assembly name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(finalAssembly.name, canvas.width / 2, 60);

        // Assembly dates
        ctx.font = '24px Arial';
        const startDate = formatDateWithoutTimezone(finalAssembly.startDate);
        const endDate = formatDateWithoutTimezone(finalAssembly.endDate);
        ctx.fillText(`${startDate} - ${endDate}`, canvas.width / 2, 100);

        // Assembly location
        ctx.font = '20px Arial';
        ctx.fillText(finalAssembly.location, canvas.width / 2, 140);

        // Participant name
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        const displayName = registration.nomeCracha || registration.participantName;
        ctx.fillText(displayName, canvas.width / 2, 300);

        // Pronouns
        if (registration.pronomes) {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#6b7280';
            ctx.fillText(`(${registration.pronomes})`, canvas.width / 2, 340);
        }

        // Participant type
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = '#3b82f6';
        const participantType = getParticipantTypeLabel(registration.participantType);
        ctx.fillText(participantType, canvas.width / 2, 420);

        // Comitê Local
        if (registration.comiteLocal) {
            ctx.font = '24px Arial';
            ctx.fillStyle = '#6b7280';
            ctx.fillText(registration.comiteLocal, canvas.width / 2, 460);
        }

        // QR Code section
        if (qrCodeDataUrl) {
            const qrImg = new Image();
            qrImg.onload = () => {
                // QR code background
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(200, 520, 400, 400);
                
                // QR code
                ctx.drawImage(qrImg, 250, 570, 300, 300);
                
                // QR code label
                ctx.fillStyle = '#374151';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Código de identificação do participante', canvas.width / 2, 950);

                // Footer
                ctx.fillStyle = '#9ca3af';
                ctx.font = '16px Arial';
                ctx.fillText('IFMSA Brazil', canvas.width / 2, 1100);
                ctx.fillText('International Federation of Medical Students\' Associations', canvas.width / 2, 1130);

                // Download the canvas as image
                const link = document.createElement('a');
                link.download = `Cracha_${registration.participantName.replace(/\s+/g, '_')}_${finalAssembly?.name?.replace(/\s+/g, '_') || 'AG'}.png`;
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
            link.download = `Cracha_${registration.participantName.replace(/\s+/g, '_')}_${finalAssembly?.name?.replace(/\s+/g, '_') || 'AG'}.png`;
            link.href = canvas.toDataURL();
            link.click();

            toast({
                title: "✅ Crachá baixado",
                description: "Crachá salvo com sucesso!",
            });
        }
    };

    // Print badge
    const printBadge = () => {
        window.print();
    };

    // Share badge
    const shareBadge = async () => {
        if (registration && finalAssembly) {
            try {
                const shareUrl = `${window.location.origin}/ag/${finalAssembly._id}/qr-code?registration=${registration._id}`;
                navigator.clipboard.writeText(shareUrl);
                toast({
                    title: "🔗 Link copiado",
                    description: "Link do crachá copiado para a área de transferência.",
                });
            } catch (error) {
                // Fallback to copying URL
                const shareUrl = `${window.location.origin}/ag/${finalAssembly._id}/qr-code?registration=${registration._id}`;
                navigator.clipboard.writeText(shareUrl);
                toast({
                    title: "🔗 Link copiado",
                    description: "Link do crachá copiado para a área de transferência.",
                });
            }
        } 
    };

    if (!registrationId) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-6">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-orange-600">
                            <AlertCircle className="w-6 h-6" />
                            <span>Parâmetro Necessário</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                        <p className="text-orange-600">
                            Esta página requer um parâmetro &quot;registration&quot; com o ID da inscrição.
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            Exemplo: /ag/[assemblyId]/qr-code?registration=abc123
                        </p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    if (!registration || !finalAssembly) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center p-6">
                <Card className="w-full max-w-2xl">
                    <CardContent className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Carregando informações...</p>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
            <div className="container mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-800 to-indigo-600 bg-clip-text text-transparent mb-2">
                        Crachá Eletrônico
                    </h1>
                    <p className="text-gray-600">{finalAssembly.name}</p>
                </div>

                {/* Digital Badge */}
                <Card className="shadow-lg border-0 print:shadow-none print:border">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <div className="text-center">
                            <CardTitle className="text-2xl mb-2">{finalAssembly.name}</CardTitle>
                            <p className="text-blue-100">
                                {formatDateWithoutTimezone(finalAssembly.startDate)} - {formatDateWithoutTimezone(finalAssembly.endDate)}
                            </p>
                            <p className="text-blue-100 text-sm">{finalAssembly.location}</p>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 text-center">
                        <div className="space-y-6">
                            {/* Participant Name */}
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    {registration.nomeCracha || registration.participantName}
                                </h2>
                                {registration.pronomes && (
                                    <p className="text-lg text-gray-600">({registration.pronomes})</p>
                                )}
                            </div>

                            {/* Participant Type */}
                            <div>
                                <Badge className="text-lg px-4 py-2 bg-blue-100 text-blue-800">
                                    {getParticipantTypeLabel(registration.participantType)}
                                </Badge>
                            </div>

                            {/* Comitê Local */}
                            {registration.comiteLocal && (
                                <div>
                                    <p className="text-lg text-gray-700 font-medium">{registration.comiteLocal}</p>
                                </div>
                            )}

                            {/* Status */}
                            <div className="flex items-center justify-center space-x-4">
                                <Badge className={getStatusColor(registration.status)}>
                                    Status Atual: {getStatusLabel(registration.status)}
                                </Badge>
                            </div>

                            {/* QR Code */}
                            {qrCodeDataUrl && (
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <div className="flex flex-col items-center space-y-4">
                                        <img 
                                            src={qrCodeDataUrl} 
                                            alt="QR Code para marcar presença"
                                            className="w-48 h-48"
                                        />
                                        <p className="text-sm text-gray-600">
                                            Código de identificação do participante
                                        </p>
                                    </div>
                                </div>
                            )}

                            

                            {/* Action Buttons */}
                            <div className="flex flex-wrap justify-center gap-4 print:hidden">
                                <Button
                                    onClick={downloadBadge}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar Crachá
                                </Button>
                                <Button
                                    onClick={printBadge}
                                    variant="outline"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                                <Button
                                    onClick={shareBadge}
                                    variant="outline"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Compartilhar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assembly Information */}
                <Card className="shadow-lg border-0 print:hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span>Informações do Evento</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-5 h-5 text-gray-500" />
                                <div>
                                    <p className="font-semibold">Data</p>
                                    <p className="text-sm text-gray-600">
                                        {formatDateWithoutTimezone(finalAssembly.startDate)} - {formatDateWithoutTimezone(finalAssembly.endDate)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <MapPin className="w-5 h-5 text-gray-500" />
                                <div>
                                    <p className="font-semibold">Local</p>
                                    <p className="text-sm text-gray-600">{finalAssembly.location}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Users className="w-5 h-5 text-gray-500" />
                                <div>
                                    <p className="font-semibold">Tipo</p>
                                    <p className="text-sm text-gray-600 capitalize">{finalAssembly.type?.replace('_', ' ')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Hidden canvas for generating downloadable badge */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Print styles */}
            <style jsx>{`
                @media print {
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    .print\\:border {
                        border: 1px solid #e5e7eb !important;
                    }
                    @page {
                        margin: 1in;
                        size: portrait;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </main>
    );
} 