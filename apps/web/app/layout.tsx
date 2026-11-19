import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderClient from "@/components/session-provider-client";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOneTapNextAuth } from "@/components/google-one-tap-nextauth";
import { Metadata } from "next";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import FloatingWhatsappButton from "@/components/FloatingWhatsappButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect critical origins */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://accounts.google.com" />
        <meta name="p:domain_verify" content="d4b023c9aa33ac4bc4d8558ec9245be0"/>
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProviderClient>
          {/* ───── NON BLOCKING GTM ───── */}
          <Script
            id="gtm-script"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){
                  w[l]=w[l]||[];
                  w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
                  var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                  j.async=true;
                  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                  f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','GTM-MJTX9BXG');
              `,
            }}
          />
          {/* ──────────────────────────── */}

          {/* Google One Tap – will now execute after hydration */}
          <GoogleOneTapNextAuth />

          <Toaster />

          {children}
          <FloatingWhatsappButton />

          <SpeedInsights />
          <Analytics />
        </SessionProviderClient>
      </body>
    </html>
  );
}
