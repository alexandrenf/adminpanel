import Link from "next/link";
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Shield, LogIn } from "lucide-react";

const PrecisaLoginCL: React.FC = () => {
    return (
        <div className="container mx-auto flex flex-col items-center justify-center px-6 py-12">
            <Card className="w-full max-w-2xl mx-auto bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-black/20 rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/30 pointer-events-none"></div>
                
                <CardHeader className="relative z-10 text-center py-12 px-8">
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
                        Portal de Administrador
                    </CardTitle>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Sistema exclusivo para administradores da IFMSA Brazil
                    </p>
                </CardHeader>

                <CardContent className="relative z-10 px-8 pb-12">
                    <div className="max-w-2xl mx-auto">
                        {/* Authentication info */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-8 border border-blue-100">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Shield className="w-6 h-6 text-blue-600" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-2">Acesso Restrito</h3>
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                        Faça login com sua conta Google para acessar o sistema
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action button */}
                        <div className="text-center">
                            <Link href="/api/auth/signin" passHref legacyBehavior>
                                <Button 
                                    asChild 
                                    size="lg" 
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                >
                                    <a className="flex items-center space-x-3">
                                        <LogIn className="w-5 h-5" />
                                        <span>Entrar com Google</span>
                                    </a>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PrecisaLoginCL; 