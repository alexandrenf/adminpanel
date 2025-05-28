"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@mui/material";
import { LogOut, Settings, Users } from "lucide-react";

const Navbar = () => {
    const { data: session } = useSession();
    const pathname = usePathname();

    if (!session) {
        return null;
    }

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="text-xl font-bold text-gray-800">
                                Admin Panel
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            <Link
                                href="/"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    pathname === "/"
                                        ? "border-blue-500 text-gray-900"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                }`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                href="/registros"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    pathname === "/registros"
                                        ? "border-blue-500 text-gray-900"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                }`}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Comitês Locais
                            </Link>
                            <Link
                                href="/settings"
                                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                                    pathname === "/settings"
                                        ? "border-blue-500 text-gray-900"
                                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                }`}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Configurações
                            </Link>
                        </div>
                    </div>
                    <div className="flex items-center">
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => signOut()}
                            className="flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </Button>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
