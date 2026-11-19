import Header from "@/components/Headers";
import Footer from "@/components/Footer";

import PageTransition from "@/components/PageTransition";

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
