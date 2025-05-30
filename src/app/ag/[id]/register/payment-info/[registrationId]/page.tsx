"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "../../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../components/ui/card";
import { Badge } from "../../../../../../components/ui/badge";
import { Checkbox } from "../../../../../../components/ui/checkbox";
import { Label } from "../../../../../../components/ui/label";
import { 
    CreditCard, 
    ArrowRight, 
    CheckCircle, 
    Calendar, 
    Users, 
    MapPin,
    AlertTriangle,
    Info,
    Copy,
    ExternalLink
} from "lucide-react";
import { useQuery } from "convex/react";
import { useToast } from "~/components/ui/use-toast";
import { api as convexApi } from "../../../../../../../convex/_generated/api";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";
import PrecisaLogin from "~/app/_components/PrecisaLogin";

export default function PaymentInfoPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    
    const assemblyId = params.id as string;
    const registrationId = params.registrationId as string;
    
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);
    const [isExempt, setIsExempt] = useState(false);
    
    // Fetch assembly data
    const assembly = useQuery(convexApi.assemblies?.getById, { id: assemblyId as any });
    
    // Get AG configuration for payment info
    const agConfig = useQuery(convexApi.agConfig?.get);

    // Copy to clipboard function
    const copyToClipboard = useCallback(async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast({
                title: "✅ Copiado!",
                description: `${label} copiado para a área de transferência.`,
            });
        } catch (error) {
            toast({
                title: "❌ Erro",
                description: "Erro ao copiar para a área de transferência.",
                variant: "destructive",
            });
        }
    }, [toast]);

    const handleContinue = useCallback(() => {
        if (isExempt) {
            // If exempt, go directly to success/confirmation page
            router.push(`/ag/${assemblyId}/register/success/${registrationId}`);
        } else {
            // Otherwise, go to payment page
            router.push(`/ag/${assemblyId}/register/payment/${registrationId}`);
        }
    }, [isExempt, assemblyId, registrationId, router]);

    // Check if user has IFMSA email
    useEffect(() => {
        const checkEmail = async () => {
            if (session) {
                const result = await isIfmsaEmailSession(session);
                setIsIfmsaEmail(result);
            } else {
                setIsIfmsaEmail(false);
            }
        };
        checkEmail();
    }, [session]);

    if (!session) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}></div>
                </div>
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="relative z-10 flex-grow flex items-center justify-center">
                    <PrecisaLogin />
                </div>
            </main>
        );
    }

    if (!assembly) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="container mx-auto px-6 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-4">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                                    Informações de Pagamento
                                </h1>
                                <p className="text-gray-600">Finalize sua inscrição - {assembly.name}</p>
                            </div>
                        </div>
                        
                        {/* Assembly Info */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-center space-x-6 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        <span>
                                            {new Date(assembly.startDate).toLocaleDateString('pt-BR')} - {" "}
                                            {new Date(assembly.endDate).toLocaleDateString('pt-BR')}
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
                    </div>

                    {/* Registration Success Status */}
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-3">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                                <div>
                                    <h3 className="font-semibold text-green-900">Inscrição Realizada com Sucesso!</h3>
                                    <p className="text-sm text-green-700">
                                        Sua inscrição foi registrada e está sendo analisada pela administração.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Information */}
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center">
                                <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                                Informações de Pagamento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Payment Exemption Checkbox */}
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <Checkbox
                                            id="isExempt"
                                            checked={isExempt}
                                            onCheckedChange={(checked) => setIsExempt(checked === true)}
                                        />
                                        <div className="flex-1">
                                            <Label htmlFor="isExempt" className="text-base font-medium">
                                                Eu sou isento de pagamento
                                            </Label>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Marque esta opção se você possui isenção de pagamento para esta assembleia.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Details - Only show if not exempt */}
                                {!isExempt && (
                                    <div className="space-y-6">
                                        {/* General Payment Info */}
                                        {agConfig?.paymentInfo && (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-semibold">Informações Gerais</h3>
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-gray-700 whitespace-pre-wrap">{agConfig.paymentInfo}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* PIX Payment */}
                                        {agConfig?.pixKey && (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-semibold">Pagamento via PIX</h3>
                                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <Label className="text-sm font-medium text-blue-900">Chave PIX:</Label>
                                                            <p className="text-blue-800 font-mono">{agConfig.pixKey}</p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => copyToClipboard(agConfig.pixKey!, "Chave PIX")}
                                                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                                        >
                                                            <Copy className="w-4 h-4 mr-1" />
                                                            Copiar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bank Details */}
                                        {agConfig?.bankDetails && (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-semibold">Dados Bancários</h3>
                                                <div className="p-4 bg-gray-50 rounded-lg">
                                                    <p className="text-gray-700 whitespace-pre-wrap">{agConfig.bankDetails}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Payment Instructions */}
                                        {agConfig?.paymentInstructions && (
                                            <div className="space-y-3">
                                                <h3 className="text-lg font-semibold">Instruções de Pagamento</h3>
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                    <p className="text-amber-800 whitespace-pre-wrap">{agConfig.paymentInstructions}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Important Notice */}
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-start space-x-3">
                                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-medium text-red-900">Importante:</h4>
                                                    <p className="text-sm text-red-700 mt-1">
                                                        Após realizar o pagamento, você será redirecionado para enviar o comprovante. 
                                                        Sua inscrição só será confirmada após a análise do comprovante pela administração.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* If exempt, show confirmation message */}
                                {isExempt && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-start space-x-3">
                                            <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-medium text-green-900">Isenção de Pagamento</h4>
                                                <p className="text-sm text-green-700 mt-1">
                                                    Você marcou que possui isenção de pagamento. Sua inscrição será enviada 
                                                    diretamente para análise da administração.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 my-6"></div>

                                {/* Continue Button */}
                                <div className="flex justify-end">
                                    <Button 
                                        onClick={handleContinue}
                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                        size="lg"
                                    >
                                        {isExempt ? (
                                            <>
                                                Finalizar Inscrição
                                                <CheckCircle className="w-4 h-4 ml-2" />
                                            </>
                                        ) : (
                                            <>
                                                Ir para Pagamento
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Help Section */}
                    <Card className="bg-gray-50 border-gray-200">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold text-gray-900">Precisa de Ajuda?</h3>
                                <p className="text-sm text-gray-600">
                                    Se você tiver dúvidas sobre o pagamento ou sua inscrição, 
                                    entre em contato com a administração da IFMSA Brazil.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
} 