import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";
const ogImageUrl =
  "https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1";

export const metadata: Metadata = {
  title: "Contact Us | Hexpertify",
  description:
    "Connect with Hexpertify via email or phone for inquiries and career opportunities.",
  alternates: {
    canonical: `${siteUrl}/contact-us`,
  },
  openGraph: {
    title: "Contact Us | Hexpertify",
    description:
      "Connect with Hexpertify via email or phone for inquiries and career opportunities.",
    type: "website",
    url: `${siteUrl}/contact-us`,
    images: [
      {
        url: ogImageUrl,
        alt: "Hexpertify Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Us | Hexpertify",
    description:
      "Connect with Hexpertify via email or phone for inquiries and career opportunities.",
    images: [ogImageUrl],
  },
};

export default function ContactUsPage() {
  return (
    <div className="flex flex-col items-center pt-24 bg-white px-4">
      {/* Main Container */}
      <div className="w-full max-w-2xl text-center flex flex-col items-center">
        {/* Heading */}
        <h1 className="text-4xl font-extrabold text-black mb-6">Contact Us</h1>

        {/* Subtext */}
        <p className="text-lg text-gray-700 mb-8 max-w-xl">
          We would love to hear from you! You can reach us through any of the
          following methods:
        </p>

        {/* 1. Email Button (Blue, Rounded) */}
        <Link
          href="mailto:contact@hexpertify.com"
          className="bg-primary text-white font-medium py-2 px-8 rounded shadow-md transition-colors duration-200 mb-6"
        >
          Email Us
        </Link>

        {/* 2. Phone Link (Centered Text) */}
        <div className="text-gray-800 font-medium mb-8 text-lg">
          Phone:{" "}
          <Link
            href="tel:+918618209518"
            className="text-blue-600 hover:text-blue-800 underline transition-colors"
          >
            +91 86182 09518
          </Link>
        </div>

        {/* 3. Join Button (Purple/Slate, Large Block) */}
        <Link
          href="mailto:admin@hexpertify.com?subject=Join%20as%20Consultant%20Inquiry"
          className="bg-primary text-white font-medium rounded shadow-md transition-colors duration-200 py-4 px-10 text-xl "
          style={{ backgroundColor: "#7C83FD" }} // Exact purple tint override if needed, otherwise remove for Tailwind class
        >
          Join as consultant
        </Link>
      </div>
    </div>
  );
}
