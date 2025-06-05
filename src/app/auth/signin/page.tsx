"use client";

import { getProviders, signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { LogIn, Shield, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Provider = {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
};

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const error = searchParams?.get("error");
  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    fetchProviders();
  }, []);

  useEffect(() => {
    // Check if user is already signed in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push(callbackUrl);
      }
    };
    checkSession();
  }, [router, callbackUrl]);

  const handleSignIn = async (providerId: string) => {
    setIsLoading(true);
    try {
      await signIn(providerId, { callbackUrl });
    } catch (error) {
      console.error("Sign in error:", error);
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "OAuthSignin":
        return "Erro ao iniciar o processo de autenticação.";
      case "OAuthCallback":
        return "Erro durante o callback do OAuth.";
      case "OAuthCreateAccount":
        return "Erro ao criar conta OAuth.";
      case "EmailCreateAccount":
        return "Erro ao criar conta com email.";
      case "Callback":
        return "Erro durante o callback de autenticação.";
      case "OAuthAccountNotLinked":
        return "Esta conta já está vinculada a outro provedor.";
      case "EmailSignin":
        return "Erro ao enviar email de login.";
      case "CredentialsSignin":
        return "Credenciais inválidas.";
      case "SessionRequired":
        return "Você precisa estar logado para acessar esta página.";
      default:
        return "Ocorreu um erro durante a autenticação.";
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
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header with Logo */}
        <header className="pt-8 pb-4">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <Image
                  src="/logo.svg"
                  alt="IFMSA Brazil Logo"
                  width={280}
                  height={112}
                  className="h-20 w-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex-grow flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 rounded-3xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/30 pointer-events-none"></div>
              
              <CardHeader className="relative z-10 text-center pb-6 pt-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <LogIn className="w-6 h-6 text-white" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                  Entrar na Plataforma
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  Faça login para acessar o sistema administrativo
                </p>
              </CardHeader>

              <CardContent className="relative z-10 px-8 pb-8">
                {/* Error Alert */}
                {error && (
                  <Alert className="mb-6 border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      {getErrorMessage(error)}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Info Alert */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border border-blue-100">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm">Acesso Administrativo</h3>
                      <p className="text-gray-700 text-xs leading-relaxed">
                        Para ter acesso completo às funções administrativas, faça login com uma conta Google{" "}
                        <span className="font-semibold text-blue-700">@ifmsabrazil.org</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sign in buttons */}
                <div className="space-y-4">
                  {providers && Object.values(providers).map((provider) => (
                    <Button
                      key={provider.name}
                      onClick={() => handleSignIn(provider.id)}
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <div className="flex items-center justify-center space-x-3">
                        {provider.name === "Google" && (
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        )}
                        <span>
                          {isLoading ? "Entrando..." : `Entrar com ${provider.name}`}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>

                {/* Back to home link */}
                <div className="text-center mt-6">
                  <Link 
                    href="/" 
                    className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Voltar ao início
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
} 