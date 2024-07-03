// components/Navbar.tsx
import Link from "next/link";
import React from "react";

const Navbar: React.FC = () => {
    return (
        <nav className="w-full bg-blue-900 text-white py-4">
            <div className="container mx-auto flex justify-between items-center px-4">
                <h1 className="text-xl font-bold">IFMSA Brazil Admin Portal</h1>
                <ul className="flex space-x-4">
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
        </nav>
    );
};

export default Navbar;
