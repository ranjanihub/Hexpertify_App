"use client";
import React from "react";

const Loader = () => {
  return (
    <div className="fixed w-full inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="h-12 w-12 border-4 border-[#450BC8] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default Loader;
