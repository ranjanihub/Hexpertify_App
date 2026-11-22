import type { Metadata } from "next";
import NotFoundScene from "@/components/NotFound/NotFoundScene";

export const metadata: Metadata = {
  title: "Page not found | Hexpertify",
  description: "The page you're looking for doesn't exist or has moved.",
  robots: { index: false, follow: true },
};

/** Any URL the website does not know: the full-screen 404 with the logo */
export default function NotFound() {
  return <NotFoundScene fullScreen />;
}
