import { Open_Sans } from "next/font/google";
import "./globals.css";
import SessionProviderClient from "@/components/session-provider-client";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOneTapNextAuth } from "@/components/google-one-tap-nextauth";
import { Metadata } from "next";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import FloatingWhatsappButton from "@/components/FloatingWhatsappButton";
import IntroLoader, { INTRO_LOADER_SCRIPT } from "@/components/Loader/IntroLoader";

/**
 * The one font of the website and all three panels (globals.css :root). Tailwind's font-sans and font-mono
 * point at it too, so no other typeface is downloaded or shown.
 */
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
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
    // suppressHydrationWarning: the intro script marks <html data-hx-intro> before React hydrates
    <html lang="en" className={openSans.variable} suppressHydrationWarning>
      <head>
        {/* Preconnect critical origins */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://accounts.google.com" />
        <meta name="p:domain_verify" content="d4b023c9aa33ac4bc4d8558ec9245be0"/>
      </head>

      <body className="antialiased">
        {/* First-visit loading intro: the script decides before the first paint whether it plays */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_LOADER_SCRIPT }} />
        <IntroLoader />

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
