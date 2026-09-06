"use server";
import React from "react";

import {
  Assessment,
  Certificate,
  Communication,
  IndividualOnlineTherapy,
  MockTherapySession,
  Onboarding,
  Ongoing,
  OnlineCoupleTherapy,
  OnlineTeenTherapy,
} from "@/asset/images";

import ExploreConsultant from "@/components/Home/Explore";
import CarouselCommon from "@/components/Carousel";
import RecentlyOnboarded from "@/components/Home/RecentlyOnboard";
import TherapistMatchHero from "@/components/Home/TherapistMatchHero";
import TopConsultant from "@/components/Home/TopConsultant";
import Image from "next/image";
import Testimonial from "@/components/Home/Testimonials";
import FAQ from "@/components/Home/FAQ";
import { getPageData } from "./actions";
import Footer from "@/components/Footer";
import Header from "@/components/Headers";
import NotificationTitleBar from "@/components/NotificationTitleBar";

import { Metadata } from "next";
import { BlogGridContainer } from "@/components/BlogGridCard";
import TherapySections, {
  TherapySectionItem,
} from "@/components/TherapySections";

interface Testimonial {
  feedback: string;
  profile: string; // or `StaticImageData` if using Next.js <Image>
  name: string;
  position: string;
}

interface FAQS {
  trigger: string;
  accordianItem: "string";
}

export async function generateMetadata(): Promise<Metadata> {
  const { metaData } = await getPageData();

  if (!metaData?.seoMeta) {
    return {
      title: "Hexpertify",
      description: "Find expert consultants.",
    };
  }

  const { seoMeta } = metaData;

  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com";

  return {
    title: seoMeta.metaTitle,
    description: seoMeta.metaDescription,
    keywords: seoMeta.metaKeywords,
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
    alternates: {
      canonical: siteUrl,
    },
    openGraph: {
      title: seoMeta.ogTitle || seoMeta.metaTitle,
      description: seoMeta.ogDescription || seoMeta.metaDescription,
      images: seoMeta.ogImage
        ? [{ url: seoMeta.ogImage, alt: seoMeta.ogImageAlt || "Hexpertify" }]
        : undefined,
    },
  };
}
const consultantProcess = [
  {
    icon: Certificate,
    title: "Qualification Verification",
    quote: "We verify therapist's credentials and qualifications.",
  },
  {
    icon: Assessment,
    title: "Practical Assessment",
    quote: "Counsellors solve real-world problems to demonstrate expertise.",
  },

  {
    icon: Communication,
    title: "Communication Skills Check",
    quote: "We evaluate clarity, empathy, and professionalism.",
  },
  {
    icon: MockTherapySession,
    title: "Mock Therapy Session",
    quote: "Mock therapy is conducted to assess approach and ethical practice.",
  },
  {
    icon: Onboarding,
    title: "Onboarding to Hexpertify",
    quote: "Approved therapists are onboarded to Hexpertify.",
  },
  {
    icon: Ongoing,
    title: "Ongoing Quality Review",
    quote: "We remove underperforming Therapists based on user reviews.",
  },
];

const therapySectionItems: TherapySectionItem[] = [
  {
    id: "individual-therapy",
    title: "Individual Therapy",
    image: IndividualOnlineTherapy,
    imageAlt: "Individual therapy session",
    imagePosition: "right",
    width: 563,
    height: 368,
    paragraphs: [
      "Individual therapy, also known as one-on-one counselling, provides a safe, confidential, and non-judgmental space to explore your thoughts, emotions, and personal challenges with the guidance of a qualified therapist. ",
      "Whether you're struggling with stress, anxiety, depression, low self-esteem, emotional difficulties, work-related concerns, or major life changes, therapy can help you better understand yourself, build emotional resilience, and develop healthier ways of coping.",
      "Our verified counsellors provide evidence-based support tailored to your unique needs, helping you navigate life's challenges with greater clarity, confidence, and balance.",
    ],
  },
  {
    id: "couple-therapy",
    title: "Couple Therapy",
    image: OnlineCoupleTherapy,
    imageAlt: "Couple therapy session",
    imagePosition: "left",
    width: 563,
    height: 368,
    paragraphs: [
      "Couple therapy provides a supportive and confidential space for both partners to address relationship challenges, improve communication, and strengthen their emotional connection. ",
      "Whether you are experiencing recurring conflicts, trust issues, misunderstandings, or difficulties navigating life transitions, couple therapy can help both partners better understand each other and work towards healthier relationship patterns.",
      "Through evidence-based approaches, they help couples navigate challenges, rebuild trust, strengthen communication, and foster lasting relationship growth.",
    ],
  },
  {
    id: "teen-therapy",
    title: "Teen Therapy",
    image: OnlineTeenTherapy,
    imageAlt: "Teen therapy session",
    imagePosition: "right",
    width: 563,
    height: 368,
    paragraphs: [
      "Teen therapy, also known as adolescent counselling provides a safe, supportive, and confidential space through one-on-one counselling, teenagers can openly express their thoughts and emotions without fear of judgment while developing healthy coping strategies, emotional awareness, and problem-solving skills. ",
      "Therapy can help teenagers build self-confidence, improve communication, strengthen resilience, and better manage the demands of school, relationships, and everyday life. Our verified therapists and counsellors provide compassionate, age-appropriate, and evidence-based support tailored to the unique needs of teenagers.",
    ],
  },
];

const consultantProcessGridPositions = [
  "lg:col-start-1",
  "lg:col-start-3",
  "lg:col-start-5",
  "lg:col-start-2",
  "lg:col-start-4",
  "lg:col-start-3",
];

export default async function HomePage() {
  const { metaData, professions, topConsultants, recentlyBookedConsultants } =
    await getPageData();

  const recentlyOnboard = recentlyBookedConsultants?.map((item) => ({
    name: item?.name,
    consultantType: item?.profession?.name,
    experience: `${item?.experience} yrs + experience`,
    amount: `₹ ${Math.min(...item?.services?.map((s) => s.price))}`,
    profilePic: item?.photoUrl,
    profileAltText: item?.photoAltText,
    link: `/services/${item?.profession?.identifier}/${item?.identifier}`,
  }));

  const TestimonialData =
    metaData?.testimonials?.map((item: any) => ({
      feedback: item.quote,
      profile: item.authorImageUrl,
      name: item.authorName,
      position: item.authorProfessional,
    })) || [];

  const faqs: FAQS[] =
    metaData?.faqs?.map((faqItem: any) => ({
      trigger: faqItem.question,
      accordianItem: faqItem.answer,
    })) || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://hexpertify.com/#organization",
        name: "Hexpertify",
        url: process.env.NEXT_PUBLIC_APP_URL || "https://hexpertify.com",
        logo: {
          "@type": "ImageObject",
          url: "https://drive.google.com/uc?export=view&id=11t552Aj9WOr_1hNYpyB7f7I0P_qq0xT1",
        },
        sameAs: [
          "https://www.instagram.com/hexpertify",
          "https://www.linkedin.com/company/hexpertify",
          "https://youtube.com/@hexpertify_app",
        ],
      },
      {
        "@type": "WebSite",
        "@id": "https://hexpertify.com/#website",
        name: "Hexpertify - Consult CERTIFIED Experts online",
        url: "https://hexpertify.com",
        description:
          "Consult CERTIFIED Experts from various fields ranging from Healthcare to Fashion.",
        publisher: {
          "@id": "https://hexpertify.com/#organization",
        },
      },
      {
        "@type": "FAQPage",
        "@id": "https://hexpertify.com/#faqs",
        mainEntity: faqs?.map((faq) => ({
          "@type": "Question",
          name: faq?.trigger,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq?.accordianItem,
          },
        })),
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="h-[calc(100vh-56px)] overflow-y-scroll md:h-[calc(100vh-92px)]">
        <NotificationTitleBar title={metaData?.notificationTitle} />
        <div className="p-4 md:p-6 lg:p-[50px] w-full">
        
          <CarouselCommon
            HeroBanner={metaData}
            autoSlide={true}
            DotSlider={true}
            width={500}
            height={300}
            ImageclassName="object-contain w-[80%] mb-3"
            type={"heroBanner"}
            SlideButton={true}
          />
          <ExploreConsultant
            data={professions?.map((value) => ({
              title: value?.name,
              image: value?.imageUrl,
              id: value?.id,
              identifier: value?.identifier,
              profileAltText: value?.imageAltText,
            }))}
          />
          <RecentlyOnboarded data={recentlyOnboard} />
            <TherapistMatchHero
            className="mb-8"
            therapists={topConsultants?.map((consultant) => ({
              src: consultant?.photoUrl,
              alt: consultant?.photoAltText || consultant?.name,
            }))}
          />
          <TopConsultant
            data={topConsultants?.map((value) => ({
              ...value,
              name: value?.name,
              consultantType: value?.profession?.name,
              experienceQuote: value?.about,
            }))}
          />
          {/* <div className="flex flex-col justify-center items-center my-[20px]">
            <p className="text-[48px] w-[600px]  text-[600] text-center text-[rgba(0, 0, 0, 0.25)] my-[20px] [text-shadow:0_2px_4px_#00000040] ">
              <span className="text-primary">Our </span>Consultant Selection
              <span className="text-primary"> Process</span>
            </p>
            <p className="text-[24px] max-w-[600px]  text-[400] text-center text-[rgba(0, 0, 0, 0.25)] my-[20px] [text-shadow:0_2px_4px_#00000040] ">
              At <span className="text-primary">Hexpertify</span>, we ensure only
              the best experts join our platform through a rigorous selection
              process:
            </p>
          </div> */}
          <div className="flex flex-col justify-center items-center my-8  md:my-[20px] px-4">
            <p className="text-3xl md:text-[48px] w-full max-w-[600px] font-semibold text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              <span className="text-primary">Our </span>Consultant Selection
              <span className="text-primary"> Process</span>
            </p>

            <p className="text-lg md:text-[24px]  font-normal text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              At <span className="text-primary">Hexpertify</span>, We are
              committed to making online therapy affordable & accessible while
              maintaining the highest standards of therapist quality,
              competence, and client care.
            </p>
          </div>
          <div className="mx-auto  grid max-w-[1290px] grid-cols-1 gap-y-[60px] md:grid-cols-2 lg:grid-cols-6">
            {consultantProcess?.map((item: any, index: any) => (
              <div
                key={index}
                className={`flex h-[196px] w-full max-w-[340px] flex-col items-center justify-center justify-self-center rounded-[35px] p-[30px] shadow-[0_0_15px_0_rgba(0,0,0,0.5)] lg:col-span-2 ${consultantProcessGridPositions[index]}`}
              >
                <Image
                  src={item?.icon}
                  width={75}
                  height={75}
                  className="rounded-[30px]"
                  alt={"Image"}
                />
                <p className="text-[20px] font-semibold text-[700] text-[rgba(8, 26, 61, 1)]">
                  {item?.title}
                </p>
                <div className="text-[16px] font-normal text-center leading-normal">
                  {item.html ?? item.quote}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 md:p-6 lg:p-[50px] lg:pt-[0px] md:pt-[0px]">
          <div className="flex flex-col justify-center items-center my-8 md:my-[20px] px-4">
            <p className="text-3xl md:text-[48px] w-full font-semibold text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              <span className="text-primary">Evidence-Based </span>Insights From
              Our
              <span className="text-primary"> Counsellors</span>
            </p>

            <p className="text-lg md:text-[24px] font-normal text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              Explore evidence-based articles, mental health tips, and practical
              guidance written by our
              <span className="font-bold"> Mental Health Counsellors</span> to
              help you better understand your emotions, relationships, and
              overall well-being.
            </p>
          </div>
          <BlogGridContainer />
        </div>
        <div className="p-4 md:p-6 lg:p-[50px]">
          <div className="flex flex-col justify-center items-center my-8 md:my-[20px] px-4">
            <p className="text-3xl md:text-[48px] w-full font-semibold text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              <span className="text-primary">Our Services</span>
            </p>
            <p className="text-3xl md:text-[48px] w-full font-semibold text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              Affordable Online Therapy in India for Individuals, Couples &
              Teens
            </p>
            <p className="text-lg md:text-[24px] font-normal text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              At <span className="text-primary">Hexpertify</span>, we are
              committed to breaking the stigma around mental health and making
              mental health support more accessible through{" "}
              <span className="font-bold"> online counselling in India</span>.
              We connect individuals, couples, and teenagers with verified
              therapists who provide confidential, compassionate, and
              evidence-based support.
            </p>
          </div>
          <TherapySections
            items={therapySectionItems}
            className="my-8 md:my-12"
          />
        </div>

        <div className="bg-primary-foreground p-4 md:p-6 lg:p-[50px]">
          <Testimonial data={TestimonialData} />
          <FAQ data={faqs} />
        </div>
        <Footer />
      </main>
    </>
  );
}
