import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Coming Soon | Hexpertify",
  description:
    "Our blog is under construction. Stay tuned for amazing content, insights, and updates coming soon!",
  keywords: ["blog", "coming soon", "hexpertify", "updates", "insights"],
  openGraph: {
    title: "Blog - Coming Soon | Hexpertify",
    description:
      "Our blog is under construction. Stay tuned for amazing content, insights, and updates coming soon!",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog - Coming Soon | Hexpertify",
    description:
      "Our blog is under construction. Stay tuned for amazing content, insights, and updates coming soon!",
  },
};

interface IPage {
  [key: string]: any;
}

const Page: React.FC<IPage> = (props) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse [animation-delay:1s]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <h1 className="text-7xl md:text-9xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-6 animate-fade-in">
          Coming Soon
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8 animate-fade-in [animation-delay:0.2s]">
          Our blog is under construction. Something amazing is on the way!
        </p>
        <div className="flex items-center justify-center gap-2 animate-fade-in [animation-delay:0.4s]">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
        </div>
      </div>
    </div>
  );
};

export default Page;
