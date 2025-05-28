"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import NavigationLoading from "./NavigationLoading";
import UrlEditor from "./UrlEditor";

const Navbar: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [showUrlEditor, setShowUrlEditor] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const navLinks = [
        { href: "/noticias", label: "Notícias" },
        { href: "/eb", label: "EBs" },
        { href: "/documentos", label: "Documentos" },
        { href: "/historico", label: "Histórico" },
        { href: "/cr", label: "CRs" },
        { href: "/times", label: "Times" },
        { href: "/config", label: "Configurações" },
    ];

    return (
        <nav className="w-full bg-blue-900 text-white py-4 relative">
            {isNavigating && <NavigationLoading />}
            <div className="container mx-auto flex justify-between items-center px-4">
                <h1 className="text-xl font-bold">
                    <Link 
                        href="/" 
                        className="hover:underline"
                        onClick={() => setIsNavigating(true)}
                    >
                        IFMSA Brazil Admin
                    </Link>
                </h1>
                <div className="block md:hidden">
                    <button className="mobile-menu-button" onClick={toggleMenu}>
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M4 6h16M4 12h16m-7 6h7"
                            />
                        </svg>
                    </button>
                </div>
                <ul className="hidden md:flex items-center space-x-4">
                    {navLinks.map((link) => (
                        <li key={link.href}>
                            <Link 
                                href={link.href}
                                className={`hover:underline ${pathname === link.href ? 'font-bold' : ''}`}
                                onClick={() => setIsNavigating(true)}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <button
                            onClick={() => setShowUrlEditor(!showUrlEditor)}
                            className="hover:underline"
                        >
                            Comitês Locais
                        </button>
                    </li>
                    <li>
                        <Link 
                            href="/api/auth/signout"
                            className="bg-white text-blue-900 rounded-full px-4 py-2 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsNavigating(true)}
                        >
                            Sair
                        </Link>
                    </li>
                </ul>
            </div>
            {showUrlEditor && (
                <div className="absolute top-full left-0 w-full bg-blue-800 p-4 shadow-lg">
                    <div className="container mx-auto">
                        <h3 className="text-lg font-semibold mb-2">URL do Google Drive</h3>
                        <UrlEditor />
                    </div>
                </div>
            )}
            <div className={`md:hidden ${menuOpen ? "block" : "hidden"} mobile-menu`}>
                <ul className="space-y-4 px-4">
                    {navLinks.map((link) => (
                        <li key={link.href}>
                            <Link 
                                href={link.href}
                                className={`block text-white hover:underline ${pathname === link.href ? 'font-bold' : ''}`}
                                onClick={() => setIsNavigating(true)}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <button
                            onClick={() => setShowUrlEditor(!showUrlEditor)}
                            className="block text-white hover:underline w-full text-left"
                        >
                            Comitês Locais
                        </button>
                    </li>
                    <li>
                        <Link 
                            href="/api/auth/signout"
                            className="block bg-white text-blue-900 rounded-full px-4 py-2 text-center hover:bg-gray-100 transition-colors"
                            onClick={() => setIsNavigating(true)}
                        >
                            Sair
                        </Link>
                    </li>
                </ul>
                {showUrlEditor && (
                    <div className="px-4 py-4 bg-blue-800">
                        <h3 className="text-lg font-semibold mb-2">URL do Google Drive</h3>
                        <UrlEditor />
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
