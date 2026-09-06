"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaWhatsapp } from "react-icons/fa";

const DEFAULT_WHATSAPP_NUMBER = "918618209518";
const DEFAULT_WHATSAPP_MESSAGE =
  "Hey Hexpertify, I'd like to book a therapy session.";

export default function FloatingWhatsappButton() {
  const pathname = usePathname();
  const isConsultantProfile = /^\/services\/[^/]+\/[^/]+\/?$/.test(pathname);

  if (pathname?.startsWith("/dashboard")) {
    return null;
  }

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || DEFAULT_WHATSAPP_NUMBER;
  const whatsappMessage =
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE || DEFAULT_WHATSAPP_MESSAGE;

  return (
    <Link
      href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        whatsappMessage,
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className={`fixed bottom-5 right-5 z-50 h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 hover:bg-[#1ebe5d] focus:outline-none focus:ring-4 focus:ring-[#25D366]/30 md:bottom-8 md:right-8 md:h-16 md:w-16 ${
        isConsultantProfile ? "hidden md:flex" : "flex"
      }`}
    >
      <FaWhatsapp className="h-8 w-8 md:h-9 md:w-9" aria-hidden="true" />
    </Link>
  );
}
