"use client";

import Link from "next/link";
import React, { useState } from "react";

const Navbar: React.FC = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    return (
        <nav className="w-full bg-blue-900 text-white py-4">
            <div className="container mx-auto flex justify-between items-center px-4">
                <h1 className="text-xl font-bold">
                    <Link legacyBehavior href="/">
                        <a className="hover:underline">IFMSA Brazil Admin</a>
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
                <ul className="hidden md:flex space-x-4">
                    <li>
                        <Link legacyBehavior href="/noticias">
                            <a className="hover:underline">Notícias</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/eb">
                            <a className="hover:underline">EB</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/documentos">
                            <a className="hover:underline">Documentos</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/historico">
                            <a className="hover:underline">Histórico</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/regionais">
                            <a className="hover:underline">Regionais</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/config">
                            <a className="hover:underline">Configurações</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/api/auth/signout">
                            <a className="hover:underline">Sair da conta</a>
                        </Link>
                    </li>
                </ul>
            </div>
            <div className={`md:hidden ${menuOpen ? "block" : "hidden"} mobile-menu`}>
                <ul className="space-y-4 px-4">
                    <li>
                        <Link legacyBehavior href="/noticias">
                            <a className="block text-white hover:underline">Notícias</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/eb">
                            <a className="block text-white hover:underline">EB</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/documentos">
                            <a className="block text-white hover:underline">Documentos</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/historico">
                            <a className="block text-white hover:underline">Histórico</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/regionais">
                            <a className="block text-white hover:underline">Regionais</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/config">
                            <a className="block text-white hover:underline">Configurações</a>
                        </Link>
                    </li>
                    <li>
                        <Link legacyBehavior href="/api/auth/signout">
                            <a className="block text-white hover:underline">Sair da conta</a>
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
