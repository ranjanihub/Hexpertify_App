import type { Metadata } from "next";
import ZombiePreview from "./zombie-preview";

// Unsaved drafts are previewed here from the Super Admin panel; never index it
export const metadata: Metadata = {
  title: "Zombie Page Preview",
  robots: { index: false, follow: false },
};

export default function ZombiePreviewPage() {
  return <ZombiePreview />;
}
