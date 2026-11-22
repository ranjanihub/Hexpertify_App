import { useEffect, useState } from "react";

type Provider = { name: string; photo: string };

/** Photo links stored as a hexpertify.com image-proxy URL (/_next/image?url=...) point at the original image */
function directPhotoUrl(raw: unknown): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value || value.startsWith("data:")) return value;
  try {
    const url = new URL(value, window.location.origin);
    if (url.pathname.endsWith("/_next/image") && url.searchParams.get("url")) {
      return url.searchParams.get("url") as string;
    }
  } catch {
    return "";
  }
  return value;
}

function initials(name: string): string {
  return name
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/**
 * The real, verified consultants from the platform (photo, or initials when there is no photo),
 * shown on the login page's "Licensed Care Providers" banner.
 */
export function CareProviderAvatars({ max = 3 }: { max?: number }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/consultants")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list: any[] = Array.isArray(data?.consultants) ? data.consultants : Array.isArray(data?.data) ? data.data : [];
        const picked = list
          .filter((c) => c?.name && String(c.verificationStatus || "Verified").toLowerCase() === "verified")
          .map((c) => ({ name: String(c.name), photo: directPhotoUrl(c.photoUrl || c.photo || c.image || c.avatarUrl) }))
          // Consultants with a photo first
          .sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)))
          .slice(0, max);
        setProviders(picked);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [max]);

  if (!providers.length) return null;

  return (
    <div className="flex -space-x-2 shrink-0">
      {providers.map((p, i) =>
        p.photo && !broken[i] ? (
          <img
            key={i}
            src={p.photo}
            alt={p.name}
            title={p.name}
            onError={() => setBroken((prev) => ({ ...prev, [i]: true }))}
            className="w-9 h-9 rounded-full border-2 border-white object-cover bg-white/20"
          />
        ) : (
          <div
            key={i}
            title={p.name}
            className="w-9 h-9 rounded-full border-2 border-white bg-white/20 text-white text-[11px] font-bold flex items-center justify-center"
          >
            {initials(p.name)}
          </div>
        ),
      )}
    </div>
  );
}
