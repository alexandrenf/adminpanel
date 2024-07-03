import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";

import { TRPCReactProvider } from "~/trpc/react";
import { getServerAuthSession } from "~/server/auth";
import Navbar from "./_components/Navbar";

export const metadata = {
  title: "Painel de Administrador da IFMSA Brazil",
  description: "Criado por @alex.bfilho",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TRPCReactProvider>
          {session && <Navbar />}
          {children}
        </TRPCReactProvider>
      </body>
    </html>
  );
}
