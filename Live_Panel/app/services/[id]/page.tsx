import Script from "next/script";
import { getConsultantByProfessionByIdentifier } from "./action";
import ServicesMain from "./components/main";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: consultants } = await getConsultantByProfessionByIdentifier(
    id,
    1,
    1,
  );

  if (!consultants || consultants.length === 0) return {};

  // Use profession's seoMeta instead of consultant's
  const { profession } = consultants[0];
  const professionSeo = profession?.seoMeta;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";
  const pageUrl = `${siteUrl}/services/${id}`;

  const title =
    professionSeo?.metaTitle ||
    `Online ${profession?.name} Consultation | Hexpertify`;

  const description =
    professionSeo?.metaDescription ||
    `Find expert ${profession?.name} consultants. Book your online consultation today.`;

  const ogTitle = professionSeo?.ogTitle || title;
  const ogDescription = professionSeo?.ogDescription || description;
  const ogImage = professionSeo?.ogImage || profession?.imageUrl || "";
  const ogImageAlt =
    professionSeo?.ogImageAlt || profession?.name || "Hexpertify";

  return {
    title,
    description,
    keywords: professionSeo?.metaKeywords,
    alternates: {
      canonical: pageUrl,
    },

    openGraph: {
      type: "website",
      url: pageUrl,
      title: ogTitle,
      description: ogDescription,
      images: ogImage
        ? [
            {
              url: ogImage,
              alt: ogImageAlt,
            },
          ]
        : [],
    },

    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function ServiceByIdPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { params, searchParams } = await props;

  const { page, pageSize } = (await searchParams) || {};

  const postPageSize = parseInt(pageSize || "5", 10);
  const currentPage = parseInt(page || "1", 10);

  const resolvedParams = await params;
  const { data: fetchConsultant } = await getConsultantByProfessionByIdentifier(
    resolvedParams?.id,
    currentPage,
    postPageSize,
  );

  const FeatureConsultantData = fetchConsultant?.map((item) => ({
    id: item?.id,
    identifier: item?.identifier,
    name: item?.name,
    Description: item?.about,
    Languages: item?.languages?.join(" ,"),
    Price: Math.min(...item?.services?.map((s) => s.price)),
    rating: item?.reviews?.length
      ? item.reviews.reduce((sum, review) => sum + (review.rating || 0), 0) /
        item.reviews.length
      : 0,
    reviewsCount: item?.reviews?.length || 0,
    certified: item?.isCertified,
    profile: item?.photoUrl,
    profileAltText: item?.photoAltText,
    profession: item?.profession,
  }));

  // Get profession data (same for all consultants on this page)
  const profession = fetchConsultant?.[0]?.profession;

  const Faqs = profession?.faqs?.map((item) => ({
    id: item?.question,
    trigger: item?.question,
    accordianItem: item?.answer,
  }));

  // Build FAQ entities from profession FAQs only (not consultant-specific)
  const professionFaqs = profession?.faqs || [];
  const faqEntities = professionFaqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  }));

  // Build Page URL
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";
  const schemaPageUrl = `${siteUrl}/services/${resolvedParams?.id}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${schemaPageUrl}#service`,
        name: `Online ${profession?.name} Consultation`,
        serviceType: `${profession?.name} Consulting`,
        description:
          profession?.seoMeta?.metaDescription ||
          profession?.seoMeta?.ogDescription ||
          `Find expert ${profession?.name} consultants on Hexpertify.`,
        provider: {
          "@type": "Organization",
          "@id": "https://hexpertify.com/#organization",
        },
        areaServed: {
          "@type": "Country",
          name: "India",
        },
        availableChannel: {
          "@type": "ServiceChannel",
          url: schemaPageUrl,
        },
      },

      ...(faqEntities.length > 0
        ? [
            {
              "@type": "FAQPage",
              "@id": `${schemaPageUrl}#faqs`,
              mainEntity: faqEntities,
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <Script
        id="consultant-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ServicesMain
        FeatureConsultantData={FeatureConsultantData}
        faqs={Faqs}
        serviceId={resolvedParams?.id}
      />
    </>
  );
}
