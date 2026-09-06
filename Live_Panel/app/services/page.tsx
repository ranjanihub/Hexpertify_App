import {
  Assessment,
  Certificate,
  Communication,
  Onboarding,
  Ongoing,
} from "@/asset/images";
import ExploreConsultant from "@/components/Home/Explore";
import { getPageData } from "../actions";
import Image from "next/image";
export const metadata = {
  title: "Services - Hexpertify",
  description:
    "Explore all services on Hexpertify including doctors, mental health counsellors, fitness coaches, and career coaches.",
  alternates: {
    canonical: "https://hexpertify.com/services",
  },
  openGraph: {
    title: "Services - Hexpertify",
    description:
      "Discover expert services on Hexpertify — connect with doctors, mental health counsellors, fitness coaches, and career coaches.",
    url: "https://hexpertify.com/services",
    siteName: "Hexpertify",
    type: "website",
  },
};

const consultantProcess = [
  {
    icon: Certificate,
    title: "Certificate Verification",
    quote: "We verify all professional credentials and qualifications.",
  },
  {
    icon: Assessment,
    title: "Practical Assessment",
    quote: "Consultants solve real-world problems to demonstrate expertise.",
  },
  {
    icon: Communication,
    title: "Communication Skills Check",
    quote: "We evaluate clarity, empathy, and professionalism.",
  },
  {
    icon: Onboarding,
    title: "Onboarding to Hexpertify",
    quote: "Approved consultants are officially added to our network.",
  },
  {
    icon: Ongoing,
    title: "Ongoing Quality Review",
    quote: "We remove underperforming consultants based on user reviews.",
  },
];
export default async function ServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { professions } = await getPageData();

  return (
    <div className="p-4 md:p-6 lg:p-[50px] w-full">
      <ExploreConsultant
        data={professions?.map((value) => ({
          title: value?.name,
          image: value?.imageUrl,
          id: value?.id,
          identifier: value?.identifier,
          profileAltText: value?.imageAltText,
        }))}
      />
      <div className="flex flex-col justify-center items-center my-8 md:my-[20px] px-4">
        <p className="text-3xl md:text-[48px] w-full max-w-[600px] font-semibold text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
          <span className="text-primary">Our </span>Consultant Selection
          <span className="text-primary"> Process</span>
        </p>

        <p className="text-lg md:text-[24px] max-w-[600px] font-normal text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
          At <span className="text-primary">Hexpertify</span>, we ensure only
          the best experts join our platform through a rigorous selection
          process:
        </p>
      </div>
      <div className="flex flex-wrap basis-3 gap-x-[90px] gap-y-[60px] justify-center mt-[20px] mb-[50px]">
        {consultantProcess?.map((item: any, index: any) => (
          <div
            key={index}
            className="rounded-[35px] p-[30px] w-[340px] h-[196px] shadow-[0_0_15px_0_rgba(0,0,0,0.5)] flex flex-col justify-center items-center"
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
  );
}
