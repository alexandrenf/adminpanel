"use client";

import React from "react";
import { Loader2 } from "lucide-react";

const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-20 h-20 border-4 border-blue-100 rounded-full"></div>
          {/* Spinning ring */}
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-900">Carregando...</p>
          <p className="text-sm text-gray-600">Aguarde um momento</p>
        </div>
      </div>
    </div>
  );
};

export default Loading; 