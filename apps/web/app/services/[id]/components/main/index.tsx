"use server";
import React from "react";
import FeatureConsultant from "@/app/services/[id]/components/FeatureConsultant";
import { Details, Expert, Plan, Service, Support } from "@/asset/images";
import BackButton from "@/components/BackButton";
import Image from "next/image";
import FaqCompo from "@/components/Home/FAQ";
import HtmlContent from "../HtmlContent";

const consultantProcess = [
  {
    icon: Service,
    title: "Choose Service",
    quote:
      "Select the specific service or expertise that best matches your needs.",
  },
  {
    icon: Details,
    title: "Share Details",
    quote: "Provide information about your concerns through a simple form.",
  },
  {
    icon: Expert,
    title: "Connect with Expert",
    quote:
      "Engage directly with a CERTIFIED and verified Expert via chat or video.",
  },
  {
    icon: Plan,
    title: "Action Plan",
    quote:
      "Receive personalized solutions, plans, or prescriptions right after the session.",
  },
  {
    icon: Support,
    title: "Continued Support",
    quote: "Easily schedule follow-up sessions to ensure lasting results.",
  },
];

const ServicesMain = ({ FeatureConsultantData, faqs, serviceId, profession: professionProp }: any) => {
  // The profession is passed in directly; older callers derive it from the first therapist
  const profession = professionProp || FeatureConsultantData?.[0]?.profession;
  return (
    <div>
      <div className="p-4 md:p-6 lg:p-[50px] min-[2000px]:mx-auto min-[2000px]:max-w-[1900px]">
        {/* Adjusted icon size logic or wrapper if needed, keeping simple here */}
        <BackButton fallbackHref="/services" className="mt-[10px] mb-[15px]" />

        <div
          className="w-full flex justify-center items-center h-[200px] rounded-[16px] shadow-xl overflow-hidden bg-gray-100" // Added bg-gray-100 as fallback color for empty spaces
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${profession?.bannerUrl})`,

            // CHANGE 1: "contain" ensures the full image is visible.
            // Use "auto" if you want the image's raw pixel size (which might crop).
            backgroundSize: "cover",

            // CHANGE 2: Prevents the image from tiling if it is smaller than the box
            backgroundRepeat: "no-repeat",

            backgroundPosition: "top",
          }}
        >
          <h1 className="text-[18px] sm:text-[22px] md:text-[28px] text-white font-semibold leading-tight drop-shadow-md text-center px-4">
            
            {
              profession?.bannerTitle || `Consult Certified ${profession?.name}`
            }
          </h1>
        </div>
        <div className="my-[30px]">
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-[36px] font-semibold text-black mt-5 mb-10">
            Featured Consultants
          </p>

          <FeatureConsultant
            data={FeatureConsultantData}
            serviceNo={serviceId}
          />
        </div>
        <div className="my-[30px]">
          <div className="flex flex-col justify-center items-center my-8 md:my-[20px] px-4">
            <p className="text-3xl md:text-[48px] w-full max-w-[600px] font-semibold text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              <span className="text-primary">How </span>We Connect you to
              <span className="text-primary"> Experts</span>
            </p>

            <p className="text-lg md:text-[24px] max-w-[600px] font-normal text-center text-[black] my-4 md:my-[20px] [text-shadow:0_2px_4px_#00000040]">
              We connect your needs with verified experts, delivering reliable
              advice, personalized solutions, and real-time support in just a
              few clicks.
            </p>
          </div>
          <div className="flex flex-wrap basis-3 gap-x-6 gap-y-8 sm:gap-y-12 md:gap-y-[60px] lg:gap-x-[90px] justify-center mt-[20px] mb-[50px]">
            {consultantProcess?.map((item: any, index: any) => (
              <div
                key={index}
                className="rounded-[35px] p-6 sm:p-[30px] w-full max-w-[340px] min-h-[196px] shadow-[0_0_15px_0_rgba(0,0,0,0.5)] flex flex-col justify-center items-center"
              >
                <Image
                  src={item?.icon}
                  width={75}
                  height={75}
                  className="rounded-[30px]"
                  alt={"Image"}
                />
                <p className="text-center text-lg sm:text-[20px] text-[700] text-[rgba(8, 26, 61, 1)] font-semibold">
                  {item?.title}
                </p>
                <p className="text-[16px] text-[400] text-center">
                  {item?.quote}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="my-[30px]">
          <HtmlContent
            content={profession?.seoMeta?.htmlChunk}
          />
        </div>
      </div>
      <FaqCompo data={faqs} />
    </div>
  );
};

export default ServicesMain;
