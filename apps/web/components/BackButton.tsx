"use client";

import { useRouter } from "next/navigation";
import { IoArrowBack } from "react-icons/io5";

/**
 * "← Back": returns to the previous page when the visitor came from this site, otherwise opens `fallbackHref`
 * (a page opened directly, from a bookmark, a search result or another site has nowhere on this site to go back to).
 */
export default function BackButton({ fallbackHref, className = "" }: { fallbackHref: string; className?: string }) {
  const router = useRouter();

  const goBack = () => {
    let cameFromThisSite = false;
    try {
      cameFromThisSite = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {}
    if (cameFromThisSite && window.history.length > 1) router.back();
    else router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={`flex items-center gap-[10px] md:gap-[20px] cursor-pointer bg-transparent border-0 p-0 text-left ${className}`}
    >
      <IoArrowBack size={32} aria-hidden="true" className="md:w-[46px] md:h-[46px]" />
      <span className="text-[20px] sm:text-[24px] md:text-[32px] font-semibold text-black leading-tight">Back</span>
    </button>
  );
}
