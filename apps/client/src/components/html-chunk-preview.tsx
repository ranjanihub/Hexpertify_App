import { useState } from "react";
import { Monitor, Tablet, Smartphone, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Chunk {
  id: string;
  name: string;
  type: string;
  content: string;
  order: number;
}

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle: string;
  identifierUrl: string;
  chunks: Chunk[];
}

export function HtmlChunkPreviewModal({
  isOpen,
  onClose,
  pageTitle,
  identifierUrl,
  chunks,
}: PreviewModalProps) {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  if (!isOpen) return null;

  const sortedChunks = [...chunks].sort((a, b) => a.order - b.order);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-between p-4 overflow-hidden animate-in fade-in duration-200">
      {/* Top Controls Header */}
      <div className="w-full max-w-7xl bg-white/95 backdrop-blur rounded-2xl px-6 py-3 shadow-2xl flex items-center justify-between border border-white/20 mb-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-lg font-bold text-xs">PREVIEW MODE</div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-none">{pageTitle || "Untitled Page"}</h3>
            <span className="text-xs text-muted-foreground font-mono">https://hexpertify.com/{identifierUrl || "your-page-slug"}</span>
          </div>
        </div>

        {/* Device Viewport Switcher */}
        <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-xl border border-border">
          <Button
            size="sm"
            variant={device === "desktop" ? "default" : "ghost"}
            onClick={() => setDevice("desktop")}
            className="h-8 px-3 text-xs gap-1.5 rounded-lg"
          >
            <Monitor className="w-4 h-4" />
            <span>Desktop</span>
          </Button>
          <Button
            size="sm"
            variant={device === "tablet" ? "default" : "ghost"}
            onClick={() => setDevice("tablet")}
            className="h-8 px-3 text-xs gap-1.5 rounded-lg"
          >
            <Tablet className="w-4 h-4" />
            <span>Tablet (768px)</span>
          </Button>
          <Button
            size="sm"
            variant={device === "mobile" ? "default" : "ghost"}
            onClick={() => setDevice("mobile")}
            className="h-8 px-3 text-xs gap-1.5 rounded-lg"
          >
            <Smartphone className="w-4 h-4" />
            <span>Mobile (375px)</span>
          </Button>
        </div>

        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 w-full flex items-center justify-center overflow-y-auto p-2">
        <div
          className={`bg-white rounded-2xl shadow-2xl overflow-y-auto border border-border transition-all duration-300 flex flex-col ${
            device === "desktop"
              ? "w-full max-w-6xl h-[85vh]"
              : device === "tablet"
              ? "w-[768px] h-[85vh]"
              : "w-[375px] h-[85vh]"
          }`}
        >
          {/* Centrally Managed Global Header Banner */}
          <div className="bg-white text-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center gap-3">
              <img alt="Hexpertify Logo" className="h-16 w-auto object-contain" src="/hexpertify-logo.png" />
              <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 font-medium ml-4">
                <span>Services</span>
                <span>Doctors</span>
                <span>Resources</span>
                <span>About Us</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3" /> Centrally Managed Global Header
              </span>
              <button className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-full">Book Session</button>
            </div>
          </div>

          {/* Dynamic Page Content Built with HTML Chunks */}
          <div className="flex-1 bg-slate-50/50 p-6 space-y-6">
            {sortedChunks.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <p className="font-semibold">No HTML chunks added yet.</p>
                <p className="text-xs">Add chunks in the editor to view them rendered here.</p>
              </div>
            ) : (
              sortedChunks.map((chunk, idx) => (
                <div key={chunk.id || idx} className="relative group">
                  <div className="absolute -top-3 left-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded shadow z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                    Chunk #{idx + 1}: {chunk.name || chunk.type}
                  </div>
                  <div
                    className="p-2 border border-transparent hover:border-primary/40 rounded-xl transition-colors bg-white shadow-sm"
                    dangerouslySetInnerHTML={{ __html: chunk.content }}
                  />
                </div>
              ))
            )}
          </div>

          {/* Centrally Managed Global Footer */}
          <div className="bg-slate-900 text-slate-400 p-8 border-t border-slate-800 text-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-white font-bold text-base">Hexpertify Anytime, Anywhere</span>
                <p className="text-slate-400 text-xs mt-1">Leading platform for counseling, healthcare, and growth.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                  <Lock className="w-3 h-3" /> Centrally Managed Global Footer
                </span>
              </div>
            </div>
            <div className="pt-6 text-center text-slate-500 text-[11px]">
              &copy; {new Date().getFullYear()} Hexpertify Inc. All rights reserved. | Terms of Service | Privacy Policy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
