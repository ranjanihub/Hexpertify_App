"use client";
import React from "react";
import Image from "next/image";
import CarouselCommon from "@/components/Carousel";

interface props {
  data: {
    feedback: string;
    profile: any;
    name: string;
    position: string;
  }[];
}

const getValidImageSrc = (profile: any): string | null => {
  if (!profile) return null;
  if (typeof profile === "string" && profile.trim().length > 0) return profile.trim();
  if (typeof profile === "object") {
    if (typeof profile.src === "string" && profile.src.trim().length > 0) return profile.src.trim();
    if (typeof profile.url === "string" && profile.url.trim().length > 0) return profile.url.trim();
  }
  return null;
};

const Testimonial = ({ data }: props) => {
  return (
    <div className="w-full mt-10 mb-10">
      <p className="text-3xl md:text-[48px] font-medium text-center mb-8 md:mb-[30px]">
        Testimonials
      </p>

      <CarouselCommon
        HeroBanner={data}
        // Wrapper: clean, full height to ensure all cards match the tallest one
        cardClassName="h-full"
        type="card"
        autoSlide={true}
        SlideButton={false}
      >
        {(item: any) => {
          const validSrc = getValidImageSrc(item?.profile);
          return (
            // VISUAL CARD: Background, rounded corners, and padding go here
            <div className="flex flex-col justify-between items-center h-full max-h-[300px] bg-[#F3EDF7] rounded-[16px] p-6 md:p-8 text-center min-h-[300px]">
              {/* Feedback Text Area - Grows to fill space */}
              <div className="flex-1 flex items-center justify-center mb-6">
                <p className="text-lg md:text-[20px] font-normal italic leading-relaxed text-gray-800">
                  "{item?.feedback}"
                </p>
              </div>

              {/* Profile Section - Stays at bottom */}
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 mb-3">
                  {validSrc ? (
                    <Image
                      src={validSrc}
                      fill
                      className="rounded-full object-cover"
                      alt={item?.name || "User"}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-purple-100 text-[#5e2be2] font-bold text-xl flex items-center justify-center border border-purple-200">
                      {(item?.name || "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="font-semibold text-base md:text-[16px] text-black">
                  {item?.name}
                </p>
                <p className="font-normal text-sm md:text-[16px] text-gray-600">
                  {item?.position}
                </p>
              </div>
            </div>
          );
        }}
      </CarouselCommon>
    </div>
  );
};

export default Testimonial;
