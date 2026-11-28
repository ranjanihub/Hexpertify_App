import Header from "@/components/Headers";
import Footer from "@/components/Footer";

import PageTransition from "@/components/PageTransition";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen supports-[height:100dvh]:h-dvh flex-col">
      <Header />
      <main className="min-h-0 flex-1 overflow-y-scroll max-md:has-[[data-sticky-book]]:pb-[73px]">
        <PageTransition>{children}</PageTransition>
        <Footer />
      </main>
    </div>
  );
}
