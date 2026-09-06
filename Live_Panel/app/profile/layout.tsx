import Header from "@/components/Headers";
import Footer from "@/components/Footer";

import PageTransition from "@/components/PageTransition";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Profile — Hexpertify",
  description:
    "Manage your Hexpertify account, update profile details, and view your consultation bookings.",
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "https://hexpertify.com/profile",
  },
  openGraph: {
    title: "My Profile — Hexpertify",
    description:
      "View and manage your Hexpertify bookings and profile settings.",
    url: "https://hexpertify.com/profile",
    siteName: "Hexpertify",
    images: [
      {
        url: "https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1",
        width: 1200,
        height: 630,
        alt: "Hexpertify Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Profile — Hexpertify",
    description: "Manage your Hexpertify account and bookings.",
    images: [
      "https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-[100vh]">
      <Header />
      <main className=" h-[calc(100vh-108.43px)] overflow-y-scroll">
        <PageTransition>{children}</PageTransition>
        <Footer />
      </main>
    </div>
  );
}
