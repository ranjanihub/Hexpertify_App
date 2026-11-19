import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Header } from "@/components/layout";
import { AlertCircle } from "lucide-react";

interface HtmlChunkPageData {
  id: number;
  title: string;
  identifierUrl: string;
  status: string;
  seoDetails: any;
  chunks: Array<{
    id: string;
    name: string;
    type: string;
    content: string;
    order: number;
  }>;
}

export default function PublicHtmlChunkPage() {
  const [, params] = useRoute("/p/:slug");
  const slug = params?.slug;

  const [page, setPage] = useState<HtmlChunkPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchPublishedPage(slug);
    }
  }, [slug]);

  const fetchPublishedPage = async (slugVal: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/html-chunks/public/${slugVal}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError(`The page "/${slugVal}" was not found or is currently in draft mode.`);
        } else {
          setError("Failed to load page content.");
        }
        return;
      }
      const data = await res.json();
      setPage(data);

      // Dynamically update document title & meta tags for SEO
      if (data.seoDetails?.metaTitle || data.title) {
        document.title = data.seoDetails?.metaTitle || `${data.title} | Hexpertify`;
      }
    } catch (e) {
      setError("Network error loading page.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-muted-foreground">Loading Hexpertify Page...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 pt-[64px] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl border border-border shadow-lg max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Page Not Found</h2>
            <p className="text-xs text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <span className="inline-block bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-primary/90 transition cursor-pointer">
                Return to Dashboard
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sortedChunks = [...(page.chunks || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Global Header */}
      <Header />

      {/* Main Content Rendered Chunks */}
      <main className="flex-1 pt-[64px] max-w-6xl w-full mx-auto p-6 space-y-6">
        {sortedChunks.map((chunk, idx) => (
          <div key={chunk.id || idx} dangerouslySetInnerHTML={{ __html: chunk.content }} />
        ))}
      </main>

      {/* Global Footer */}
      <footer className="bg-slate-900 text-slate-400 p-8 border-t border-slate-800 text-xs mt-12">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-white font-bold text-base">Hexpertify Anytime, Anywhere</span>
            <p className="text-slate-400 text-xs mt-1">Leading platform for counseling, healthcare, and growth.</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-6 text-center text-slate-500 text-[11px]">
          &copy; {new Date().getFullYear()} Hexpertify Inc. All rights reserved. | Terms of Service | Privacy Policy
        </div>
      </footer>
    </div>
  );
}
