"use client";

import { useEffect, useState } from "react";
import ZombieArticle from "@/components/ZombieArticle";

/**
 * The Super Admin panel loads this page in an iframe and posts the page being edited, so admins
 * see it inside the real website header and footer before publishing. Only the admin panel's
 * origins may send content (anything else could inject HTML into this site).
 */
const ADMIN_ORIGINS = [
  "https://hexpertify-backend.vercel.app",
  "https://hexpertify.com",
  "https://www.hexpertify.com",
  "http://localhost:5175",
  ...(process.env.NEXT_PUBLIC_ADMIN_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean),
];

type PreviewMessage = { type: "hexpertify:zombie-preview"; htmlChunk?: string; pageTitle?: string };

export default function ZombiePreview() {
  const [page, setPage] = useState<{ htmlChunk: string; pageTitle: string } | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin && !ADMIN_ORIGINS.includes(event.origin)) return;
      if (event.data?.type !== "hexpertify:zombie-preview") return;
      setPage({ htmlChunk: String(event.data.htmlChunk || ""), pageTitle: String(event.data.pageTitle || "") });
    };
    window.addEventListener("message", onMessage);
    // Tell the admin panel we're listening (carries no data, so any parent may receive it)
    window.parent?.postMessage({ type: "hexpertify:zombie-preview-ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!page) {
    return <p className="py-24 text-center text-sm text-gray-400">Waiting for the page from the admin panel…</p>;
  }
  return <ZombieArticle htmlChunk={page.htmlChunk} pageTitle={page.pageTitle} />;
}
