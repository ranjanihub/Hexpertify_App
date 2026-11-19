import { useState, useEffect } from "react";
import { History, RotateCcw, Clock, User, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Revision {
  id: number;
  pageId: number;
  versionNumber: number;
  snapshot: any;
  summaryOfChanges: string;
  updatedBy: string;
  createdAt: string;
}

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: number;
  onRestore: (versionNumber: number) => Promise<void>;
}

export function HtmlChunkVersionModal({
  isOpen,
  onClose,
  pageId,
  onRestore,
}: VersionModalProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && pageId) {
      fetchRevisions();
    }
  }, [isOpen, pageId]);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/html-chunks/pages/${pageId}/revisions`);
      if (res.ok) {
        const data = await res.json();
        setRevisions(data);
      }
    } catch (e) {
      console.error("Failed to load revisions", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    setRestoringVersion(versionNumber);
    try {
      await onRestore(versionNumber);
      await fetchRevisions();
    } finally {
      setRestoringVersion(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Version History & Revisions</h2>
              <p className="text-xs text-muted-foreground">Restore previous snapshots of this page</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading revisions history...</div>
          ) : revisions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No revision history found.</div>
          ) : (
            revisions.map((rev, idx) => {
              const isLatest = idx === 0;
              return (
                <div
                  key={rev.id || idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isLatest
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "border-border bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={isLatest ? "default" : "outline"} className="font-mono text-xs">
                        v{rev.versionNumber}
                      </Badge>
                      {isLatest && (
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Current Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-900 mb-2">{rev.summaryOfChanges || "Updated page details"}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>{rev.updatedBy || "Admin"}</span>
                    </div>

                    {!isLatest && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoringVersion === rev.versionNumber}
                        onClick={() => handleRestore(rev.versionNumber)}
                        className="h-7 text-xs gap-1.5 hover:bg-primary hover:text-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoringVersion === rev.versionNumber ? "Restoring..." : "Restore Version"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
