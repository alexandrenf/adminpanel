"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@mui/material";
import { LogOut, Users, Settings, Menu as MenuIcon, X as XIcon } from "lucide-react";

const Navbar: React.FC = () => {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!session) {
        return null;
    }

    const navLinks = [
        { href: "/comites-locais", label: "Comitês Locais", icon: Users },
        { href: "/noticias", label: "Notícias" },
        { href: "/eb", label: "EBs" },
        { href: "/documentos", label: "Documentos" },
        { href: "/historico", label: "Histórico" },
        { href: "/cr", label: "CRs" },
        { href: "/times", label: "Times" },
        { href: "/config", label: "Configurações", icon: Settings },
    ];

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50" ref={navRef}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
                            Admin Panel
                        </Link>
                    </div>

                    <div className="hidden md:flex md:ml-6 md:space-x-4 lg:space-x-6">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${isActive
                                            ? "border-blue-500 text-gray-900"
                                            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                                        }`}
                                >
                                    {link.icon && <link.icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />}
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="hidden md:flex items-center ml-auto pl-4">
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center gap-2 text-sm"
                            size="small"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair
                        </Button>
                    </div>

                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleMenu}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            aria-expanded={menuOpen}
                        >
                            <span className="sr-only">Open main menu</span>
                            {menuOpen ? (
                                <XIcon className="block h-6 w-6" aria-hidden="true" />
                            ) : (
                                <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <div className={`${menuOpen ? "block" : "hidden"} md:hidden border-t border-gray-200 bg-white`}>
                <div className="pt-2 pb-3 space-y-1">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.label}
                                href={link.href}
                                onClick={() => setMenuOpen(false)}
                                className={`flex items-center py-2 px-4 text-base font-medium rounded-md transition-colors ${isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                            >
                                {link.icon && <link.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />}
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
                <div className="pt-4 pb-3 border-t border-gray-200">
                    <div className="px-4">
                         <Button
                            variant="outlined"
                            color="primary"
                            fullWidth
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center justify-center gap-2 text-sm"
                            size="medium"
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
