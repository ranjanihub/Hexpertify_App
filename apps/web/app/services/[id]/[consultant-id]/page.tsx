import type { Metadata } from "next";
import Container from "./Container";
import { getConsultantByIdentifier } from "./actions";
import NotificationTitleBar from "@/components/NotificationTitleBar";

// Force dynamic rendering to ensure fresh metadata
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string; "consultant-id": string }>;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, "consultant-id": consultantId } = await params;
  const data = await getConsultantByIdentifier(id, consultantId);

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";
  const pageUrl = `${siteUrl}/services/${id}/${consultantId}`;

  if (!data) {
    return {
      title: "Consultant Not Found | Hexpertify",
      description: "The consultant you are looking for could not be found.",
    };
  }

  const { consultant, seoMeta, profession } = data;

  // Build metadata with proper fallbacks
  const metaTitle =
    seoMeta?.metaTitle ||
    `${consultant.name} - ${profession?.name || "Consultant"} | Hexpertify`;
  const metaDescription =
    seoMeta?.metaDescription || consultant.description || "";
  const ogTitle =
    seoMeta?.ogTitle ||
    seoMeta?.metaTitle ||
    `${consultant.name} - ${profession?.name || "Consultant"}`;
  const ogDescription =
    seoMeta?.ogDescription ||
    seoMeta?.metaDescription ||
    consultant.description ||
    "";
  const ogImage = seoMeta?.ogImage || consultant.profileUrl;
  const ogImageAlt = seoMeta?.ogImageAlt || consultant.name;

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: seoMeta?.metaKeywords || consultant.specialties?.join(", "),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [{ url: ogImage, alt: ogImageAlt || undefined }] : [],
      type: "profile",
      url: pageUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription || undefined,
      images: ogImage ? [ogImage] : [],
    },
  };
}
// Generate Person JSON-LD structured data
function generatePersonJsonLd(
  consultant: any,
  profession: any,
  services: any,
  faqs: any,
) {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";
  const schemaPageUrl = `${siteUrl}/services/${profession?.identifier}/${consultant?.identifier}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${schemaPageUrl}#person`,
        name: consultant.name,
        image: consultant.profileUrl,
        description: consultant.description,
        jobTitle: profession?.name || "Consultant",
        worksFor: {
          "@type": "Organization",
          name: "Hexpertify",
          url: "https://hexpertify.com",
          "@id": "https://hexpertify.com/#organization",
        },
        knowsAbout: consultant.specialties || [],
        hasCredential: profession?.name
          ? {
              "@type": "EducationalOccupationalCredential",
              name: profession.name,
            }
          : undefined,
        // yearsOfExperience: consultant.info?.experience?.replace(/\D/g, "") || "0",
        // aggregateRating: consultant.rating
        //   ? {
        //     "@type": "AggregateRating",
        //     ratingValue: consultant.rating.toFixed(1),
        //     reviewCount: consultant.userReview?.totalReviews || 0,
        //   }
        //   : undefined,
      },
      {
        "@type": "Service",
        "@id": `${schemaPageUrl}#service`,
        name: `Online ${profession?.name} Consultation by ${consultant.name}`,
        serviceType: `${profession?.name} Consultation`,
        provider: {
          "@id": `${schemaPageUrl}#person`,
        },
        areaServed: {
          "@type": "Country",
          name: "India",
        },
        availableChannel: {
          "@type": "ServiceChannel",

          url: schemaPageUrl,
        },
        offers: services?.map((ser) => ({
          "@type": "Offer",
          name: ser?.name,
          price: ser?.price,
          priceCurrency: "INR",
          url: schemaPageUrl,
          availability: "https://schema.org/InStock",
        })),
      },
      {
        "@context": "https://schema.org",
        "@id": `${schemaPageUrl}#faqs`,
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question || faq.trigger,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer || faq.accordianItem,
          },
        })),
      },
    ],
  };
}

// Generate FAQPage JSON-LD structured data
function generateFaqJsonLd(faqs: any[]) {
  if (!faqs || faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@id": "[CONSULTANT_PAGE_URL]#faqs",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question || faq.trigger,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer || faq.accordianItem,
      },
    })),
  };
}

export default async function ConsultantPage({ params }: PageProps) {
  const { id, "consultant-id": consultantId } = await params;
  const data = await getConsultantByIdentifier(id, consultantId);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl text-muted-foreground">Consultant not found</p>
      </div>
    );
  }

  const { consultant, services, profession, faqs, seoMeta } = data;

  const personJsonLd = generatePersonJsonLd(
    consultant,
    profession,
    services,
    faqs,
  );
  return (
    <>
      {/* Person Schema JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd),
        }}
      />

      <NotificationTitleBar title={consultant.notificationTitle} />

      {/* Client Container with all interactive elements */}
      <Container
        consultant={consultant}
        seoMeta={seoMeta}
        services={services}
        faqs={faqs}
        serviceId={id}
        profession={profession}
      />
    </>
  );
}
