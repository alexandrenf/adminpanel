import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Suspense } from "react";

import { getServerAuthSession } from "~/server/auth";
import Navbar from "./_components/Navbar";
import Loading from "~/app/_components/Loading";
import { Providers } from "./_components/Providers";
import { Toaster } from "../components/ui/toaster";
import Footer from "./_components/Footer";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"


export const metadata = {
  title: "Portal IFMSA Brazil",
  description: "Criado por @alex.bfilho",
  viewport: "width=device-width, initial-scale=1",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    { rel: "icon", url: "/android-chrome-192x192.png", sizes: "192x192" },
    { rel: "icon", url: "/android-chrome-512x512.png", sizes: "512x512" },
    { rel: "icon", url: "/favicon-16x16.png", sizes: "16x16" },
    { rel: "icon", url: "/favicon-32x32.png", sizes: "32x32" },
    { rel: "manifest", url: "/site.webmanifest" },
    { rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#5bbad5" },
    { rel: "msapplication-TileImage", url: "/mstile-150x150.png" },
    { rel: "msapplication-config", url: "/browserconfig.xml" }
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAuthSession();
  
  return (
    <html lang="pt-BR" className={`${GeistSans.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://api.convex.cloud" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers session={session}>
          <Navbar />
          <div className="flex-grow">
            <Suspense fallback={<Loading />}>
              {children}
              <Analytics />
              <SpeedInsights />
            </Suspense>
          </div>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
