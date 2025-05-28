"use client";

import React from "react";

const NavigationLoading = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 animate-[loading_1s_ease-in-out_infinite]">
      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default NavigationLoading; 