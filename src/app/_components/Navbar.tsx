"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";
import { 
  LogOut, 
  Users, 
  Settings, 
  Menu as MenuIcon, 
  X as XIcon, 
  Shield,
  FileText,
  Clock,
  UserCheck,
  Newspaper,
  Archive,
  Calendar
} from "lucide-react";
import { isIfmsaEmailSession } from "~/server/lib/authcheck";

const Navbar: React.FC = () => {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const navRef = useRef<HTMLDivElement>(null);
    const [isIfmsaEmail, setIsIfmsaEmail] = useState<boolean | null>(null);

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
    
    useEffect(() => {
        const checkEmail = async () => {
          if (session) {
            const result = await isIfmsaEmailSession(session);
            setIsIfmsaEmail(result);
          } else {
            setIsIfmsaEmail(false);
          }
        };
        checkEmail();
      }, [session]);

    // No session - return null
    if (!session) {
        return null;
    }

    // Define navigation links for IFMSA users
    const ifmsaNavLinks = [
        { href: "/comites-locais", label: "LCs", icon: Users },
        { href: "/noticias", label: "Notícias", icon: Newspaper },
        { href: "/eb", label: "EBs", icon: UserCheck },
        { href: "/documentos", label: "Documentos", icon: FileText },
        { href: "/historico", label: "Histórico", icon: Clock },
        { href: "/cr", label: "CRs", icon: Archive },
        { href: "/times", label: "Times", icon: Users },
        { href: "/ag", label: "AGs", icon: Calendar },
        { href: "/ag/admin", label: "AG Admin", icon: Settings },
        { href: "/config", label: "Configurações", icon: Settings },
    ];

    // Define navigation links for non-IFMSA users (only AG)
    const agNavLinks = [
        { href: "/ag", label: "AG", icon: Calendar },
    ];

    // Determine which links to show
    const navLinks = isIfmsaEmail === true ? ifmsaNavLinks : agNavLinks;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-lg sticky top-0 z-50" ref={navRef}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/logonavbar.svg"
                                alt="IFMSA Brazil Logo"
                                width={180}
                                height={72}
                                className="h-12 w-auto"
                                priority
                            />
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex md:ml-6 md:space-x-1">
                        {navLinks.map((link) => {
                            const currentPath = pathname ?? "";
                            const isActive = currentPath === link.href || (link.href !== "/" && currentPath.startsWith(link.href));
                            return (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        isActive
                                            ? "bg-blue-50 text-blue-700 shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <link.icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Menu */}
                    <div className="hidden md:flex items-center ml-auto space-x-4">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                    <Avatar className="h-10 w-10 ring-2 ring-blue-100 hover:ring-blue-200 transition-all">
                                        <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                            {getInitials(session.user?.name || "U")}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-64" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {session.user?.email}
                                        </p>
                                        <Badge variant="secondary" className="w-fit mt-1">
                                            {isIfmsaEmail === true ? "IFMSA Brazil" : "Guest"}
                                        </Badge>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-red-600 focus:text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden flex items-center">
                        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                                >
                                    <span className="sr-only">Open main menu</span>
                                    <MenuIcon className="block h-6 w-6" aria-hidden="true" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80">
                                <div className="flex flex-col h-full">
                                    {/* User info */}
                                    <div className="flex items-center space-x-3 p-4 border-b">
                                        <Avatar className="h-12 w-12">
                                            <AvatarImage src={session.user?.image || ""} alt={session.user?.name || ""} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
                                                {getInitials(session.user?.name || "U")}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {session.user?.name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {session.user?.email}
                                            </p>
                                            <Badge variant="secondary" className="w-fit mt-1">
                                                {isIfmsaEmail === true ? "IFMSA Brazil" : "Guest"}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Navigation links */}
                                    <div className="flex-1 py-4 space-y-1">
                                        {navLinks.map((link) => {
                                            const currentPath = pathname ?? "";
                                            const isActive = currentPath === link.href || (link.href !== "/" && currentPath.startsWith(link.href));
                                            return (
                                                <Link
                                                    key={link.label}
                                                    href={link.href}
                                                    onClick={() => setMenuOpen(false)}
                                                    className={`flex items-center py-3 px-4 text-base font-medium rounded-lg transition-colors ${
                                                        isActive
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                                    }`}
                                                >
                                                    <link.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                                    {link.label}
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {/* Logout button */}
                                    <div className="p-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => signOut({ callbackUrl: '/' })}
                                            className="w-full flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sair
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
