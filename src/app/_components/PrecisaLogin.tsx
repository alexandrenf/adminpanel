import Link from "next/link";
import React from "react";

const PrecisaLogin: React.FC = () => {


    return (
        <div className="container mx-auto flex flex-col items-center justify-center px-6 py-12 space-y-8">
            <h1 className="text-5xl font-extrabold">IFMSA Brazil: Portal de Administrador</h1>
            <p className="text-lg">
                Você só pode logar com uma conta Google @ifmsabrazil.org.
            </p>
            <Link href="/api/auth/signin" legacyBehavior>
                <a className="inline-block px-6 py-3 text-lg font-semibold text-blue-600 bg-white rounded-full shadow-md hover:bg-gray-100 transition">
                    Entrar com Google
                </a>
            </Link>
        </div>

    );

}

export default PrecisaLogin;
