"use client";

import Link from "next/link";
import { Heart, Coffee } from "lucide-react";
import { usePathname } from "next/navigation";

// Simple color scheme - blue background pages vs white background pages
const getPageColors = (pathname: string) => {
  // Pages with blue backgrounds (homepage, auth)
  const isBlueBackgroundPage = pathname === '/' || pathname.includes('/auth');
  
  if (isBlueBackgroundPage) {
    // Dark footer for blue background pages
    return {
      background: 'from-slate-900/90 via-blue-900/90 to-indigo-900/90',
      border: 'via-blue-400/40',
      textClass: 'text-white/95',
      buttonClass: 'bg-white/10 hover:bg-white/20 border-white/20 hover:border-white/30',
      managementTextClass: 'text-white/80',
      coffeeIconClass: 'text-amber-400',
      heartIconClass: 'text-pink-400 fill-current',
      buttonTextClass: 'text-white group-hover:text-blue-200'
    };
  } else {
    // Light footer for white background pages
    return {
      background: 'from-white/95 via-gray-50/95 to-slate-100/95',
      border: 'via-gray-400/60',
      textClass: 'text-gray-900',
      buttonClass: 'bg-gray-900/10 hover:bg-gray-900/20 border-gray-900/20 hover:border-gray-900/30',
      managementTextClass: 'text-gray-700',
      coffeeIconClass: 'text-amber-600',
      heartIconClass: 'text-pink-600 fill-current',
      buttonTextClass: 'text-gray-900 group-hover:text-blue-700'
    };
  }
};

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const colors = getPageColors(pathname || '/');

  return (
    <footer className="relative mt-auto w-full">
      {/* Background with gradient and glass effect */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.background} backdrop-blur-xl`}></div>
      
      {/* Decorative top border */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${colors.border} to-transparent`}></div>
      
      {/* Content */}
      <div className="relative z-10 py-4 sm:py-6">
        <div className="w-full px-3 sm:px-6">
          <div className="flex flex-col items-center space-y-2 sm:space-y-3">
            {/* Main footer text */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-center text-xs sm:text-sm">
              <span className={`${colors.textClass} font-medium`}>
                © {currentYear} Codificado com
              </span>
              <div className="flex items-center space-x-1">
                <Coffee className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colors.coffeeIconClass}`} />
                <span className={colors.textClass}>e</span>
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colors.heartIconClass}`} />
              </div>
              <span className={colors.textClass}>por</span>
              <Link 
                href="https://instagram.com/alex.bfilho" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`group inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full transition-all duration-300 ${colors.buttonClass}`}
              >
                <span className={`font-semibold transition-colors text-xs sm:text-sm ${colors.buttonTextClass}`}>
                  @alex.bfilho
                </span>
              </Link>
            </div>
            
            {/* Management text */}
            <div className={`text-center text-xs sm:text-sm ${colors.managementTextClass}`}>
              Feito com carinho pela gestão 2024/25
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 