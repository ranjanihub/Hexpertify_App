import React from "react";
import { Metadata } from "next";
import Image from "next/image";
import { hexpertifyPurpleLogo } from "@/asset/images";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";
const ogImageUrl =
  "https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1";

export const metadata: Metadata = {
  title: "About Us - HEXPERTIFY | Your Trusted Online Consulting Partner",
  description:
    "HEXPERTIFY is on a mission to destroy misinformation by connecting you with certified consultants across healthcare, fashion, and more. Find verified experts online and shape your future with knowledge, not luck.",
  keywords: [
    "hexpertify",
    "online consulting",
    "certified consultants",
    "verified experts",
    "healthcare consulting",
    "fashion consulting",
    "professional advice",
    "anti-misinformation",
  ],
  alternates: {
    canonical: `${siteUrl}/about-us`,
  },
  openGraph: {
    title: "About Us - HEXPERTIFY | Your Trusted Online Consulting Partner",
    description:
      "HEXPERTIFY is on a mission to destroy misinformation by connecting you with certified consultants across healthcare, fashion, and more.",
    type: "website",
    url: `${siteUrl}/about-us`,
    images: [
      {
        url: ogImageUrl,
        alt: "Hexpertify Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us - HEXPERTIFY | Your Trusted Online Consulting Partner",
    description:
      "HEXPERTIFY is on a mission to destroy misinformation by connecting you with certified consultants.",
    images: [ogImageUrl],
  },
};

export default function AboutUsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://hexpertify.com/#organization",
        name: "Hexpertify",
        url: "https://hexpertify.com",
        logo: {
          "@type": "ImageObject",
          url: ogImageUrl,
        },
      },
      {
        "@type": "AboutPage",
        "@id": "https://hexpertify.com/about-us#about",
        url: "https://hexpertify.com/about-us",
        name: "About Hexpertify",
        about: {
          "@id": "https://hexpertify.com/#organization",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen py-20 px-6">
        <div className="">
          {/* UPDATED LAYOUT:
                   1. flex-col: Stacks items vertically on mobile.
                   2. md:flex-row: Keeps them side-by-side on laptop (md+).
                   3. gap-10: Adds space between text and image on mobile (removed on desktop via justify-between).
                   4. items-center: Centers items on mobile.
                   5. md:items-start: Aligns items to top on desktop.
                */}
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10 md:gap-0">
            {/* Added w-full to ensure text takes full width on mobile */}
            <div className="flex-1 w-full">
              <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
                About Us
              </h1>
              <p className="text-lg leading-relaxed mb-4">
                <span className="font-semibold text-primary">
                  Hexpertify: Affordable Online Therapy in India
                </span>
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                {/* Welcome to{" "}
                <span className="font-semibold text-primary">HEXPERTIFY</span>,
                your trusted Online consulting Partner.
              </p>

              <p className="text-lg text-gray-700 leading-relaxed mb-12">
                Hexpertify is an online Consulting platform where people can
                Consult with{" "}
                <span className="font-semibold text-primary">
                  CERTIFIED Consultants
                </span>{" "}
                across a wide range of fields ranging from Healthcare to
                Fashion. In the world full of misinformation Hexpertify serves
                people by making the process of finding a Verified and Certified
                Expert online. */}
                <span className="font-semibold text-primary"> Hexpertify </span>
                is a structured mental wellness platform dedicated to making
                quality{" "}
                <span className="font-semibold text-primary">
                  mental health support
                </span>{" "}
                more accessible, affordable, and trustworthy across India.
                 We connect individuals with verified therapists and counsellors
                who provide confidential, compassionate, and evidence-based care
                through secure online sessions.
              </p>
            </div>

            {/* Added flex justify-center to center the image on mobile screens */}
            <div className="flex justify-center md:block">
              <Image
                src={hexpertifyPurpleLogo}
                // Increased intrinsic dimensions for better quality at larger sizes
                width={600}
                height={150}
                alt="Hexpertify Logo"
                // RESPONSIVE CLASSES:
                // w-40 (160px) on mobile
                // md:w-72 (288px) on tablet/laptop
                // lg:w-96 (384px) on large screens
                className="cursor-pointer w-40 md:w-72 lg:w-96 h-auto object-contain rounded-lg "
              />
            </div>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 mt-8 md:mt-0">
            OUR MISSION
          </h2>

          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            At Hexpertify, our mission is to break the stigma around mental
            health and making mental health support more accessible through
            online counselling in India.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            We connect individuals, couples, and teenagers with verified
            therapists who provide confidential, compassionate, and
            evidence-based support.
          </p>
        </div>
      </div>
    </>
  );
}
