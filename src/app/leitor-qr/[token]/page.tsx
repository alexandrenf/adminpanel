"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { CheckCircle, XCircle, Smartphone, QrCode, Users, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../convex/_generated/api";
import { Scanner } from "@yudiel/react-qr-scanner";

type ScannedMember = {
    type: "eb" | "cr" | "comite";
    id: string;
    name: string;
    role?: string;
    status?: string;
    uf?: string;
};

export default function QrReaderPage() {
    const { token } = useParams();
    const [isScanning, setIsScanning] = useState(true);
    const [scannedData, setScannedData] = useState<ScannedMember | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    // Get reader info by token
    const readerInfo = useQuery(convexApi.qrReaders.getByToken, { token: token as string });

    // Get attendance records to validate scanned QR codes
    const ebsAttendance = useQuery(convexApi.attendance.getByType, { type: "eb" });
    const crsAttendance = useQuery(convexApi.attendance.getByType, { type: "cr" });
    const comitesAttendance = useQuery(convexApi.attendance.getByType, { type: "comite" });

    // Mutation to update attendance
    const updateAttendance = useMutation(convexApi.attendance.updateAttendance);

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

    const handleQRCodeScan = (detectedCodes: { rawValue: string }[]) => {
        if (isProcessing || !detectedCodes?.[0]?.rawValue) return;

        setIsProcessing(true);
        try {
            const parsed = JSON.parse(detectedCodes[0].rawValue);
            
            // Validate QR code structure
            if (!parsed.type || !parsed.id || !parsed.name) {
                toast({
                    title: "QR Code Inválido",
                    description: "Este QR code não é válido para presença.",
                    variant: "destructive",
                });
                setIsProcessing(false);
                return;
            }

            // Check if member exists in database
            let memberExists = false;
            if (parsed.type === "eb" && ebsAttendance) {
                memberExists = ebsAttendance.some(record => record.memberId === parsed.id);
            } else if (parsed.type === "cr" && crsAttendance) {
                memberExists = crsAttendance.some(record => record.memberId === parsed.id);
            } else if (parsed.type === "comite" && comitesAttendance) {
                memberExists = comitesAttendance.some(record => record.memberId === parsed.id);
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

            setScannedData(parsed);
            setIsScanning(false);
        } catch (error) {
            toast({
                title: "Erro ao ler QR Code",
                description: "QR code inválido ou corrompido.",
                variant: "destructive",
            });
        }
        setIsProcessing(false);
    };

    const handleMarkAsPresent = async () => {
        if (!scannedData || !readerInfo) return;

        setIsProcessing(true);
        try {
            await updateAttendance({
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

            // Reset for next scan
            setScannedData(null);
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
        setIsScanning(true);
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
                return "Desconhecido";
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
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                        Bem-vindo, {readerInfo.name}!
                                    </h1>
                                    <p className="text-gray-600 text-sm mt-1">
                                        Leitor de QR Code para presença
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                    </Card>

                    {/* Scanner or Confirmation */}
                    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-6">
                            {isScanning ? (
                                <div className="text-center space-y-4">
                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                                        <QrCode className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                                        <h3 className="font-semibold text-blue-800 mb-2">Aponte a câmera para o QR Code</h3>
                                        <p className="text-blue-700 text-sm">
                                            Posicione o QR code dentro da área de escaneamento
                                        </p>
                                    </div>

                                    <div className="bg-black rounded-lg overflow-hidden shadow-lg" style={{ width: "100%", height: "400px" }}>
                                        <Scanner
                                            onScan={handleQRCodeScan}
                                            onError={(error: unknown) => {
                                                console.error("QR Scanner error:", error);
                                            }}
                                            constraints={{
                                                facingMode: "environment"
                                            }}
                                        />
                                    </div>

                                    {isProcessing && (
                                        <div className="flex items-center justify-center space-x-2 py-4">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span className="text-blue-600">Processando...</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                scannedData && (
                                    <div className="text-center space-y-6">
                                        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                                            <div className="flex items-center justify-center space-x-3 mb-4">
                                                {getMemberIcon(scannedData.type)}
                                                <div>
                                                    <h3 className="font-bold text-green-800 text-lg">{scannedData.name}</h3>
                                                    <p className="text-green-700 text-sm">{getMemberTypeLabel(scannedData.type)}</p>
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

                                        <div className="flex space-x-3 justify-center">
                                            <Button
                                                onClick={handleMarkAsPresent}
                                                disabled={isProcessing}
                                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                            >
                                                {isProcessing ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                )}
                                                Marcar Presente
                                            </Button>
                                            <Button
                                                onClick={handleCancelScan}
                                                variant="outline"
                                                disabled={isProcessing}
                                                className="hover:bg-gray-50"
                                            >
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )
                            )}
                        </CardContent>
                    </Card>

                    {/* Instructions */}
                    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                        <CardContent className="p-6">
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-100">
                                <h3 className="text-lg font-semibold text-amber-800 mb-2">Instruções</h3>
                                <ul className="text-amber-700 text-sm space-y-1">
                                    <li>• Aponte a câmera para o QR code do participante</li>
                                    <li>• Aguarde a leitura automática</li>
                                    <li>• Confirme se deseja marcar como presente</li>
                                    <li>• O sistema marcará automaticamente a presença</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 