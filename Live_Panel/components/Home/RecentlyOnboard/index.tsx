"use client";

import React from "react";
import Image from "next/image";
import CarouselCommon from "@/components/Carousel";
import { useRouter } from "next/navigation";

interface props {
  data: {
    name: string;
    consultantType: string;
    experience: string;
    amount: string;
    profilePic: any;
  }[];
}

const RecentlyOnboarded = ({ data }: props) => {
  const route = useRouter();
  const getGradientClass = (index: number) => {
    const colors = [
      "bg-gradient-to-b from-[#010E1A] to-[#D0BCFF]",
      "bg-gradient-to-b from-[#010E1A] to-[#7D5260]",
      "bg-gradient-to-b from-[#010E1A] to-[#3C9BD1]",
    ];
    return colors[index % colors.length];
  };
  return (
    <section id="recently-onboarded" className="mt-[10px] w-full">
      <p className="titleText my-[20px] text-left text-xl md:text-2xl font-bold  md:px-0">
        Recently Onboarded
      </p>

      <CarouselCommon
        HeroBanner={data}
        type="card"
        autoSlide={true}
        DotSlider={false}
        // CLEANUP: Removed visual styles (bg, border, padding) from here.
        // We only leave basic layout height here. The spacing (padding-left) is handled by the CarouselCommon internal structure.
        cardClassName="h-full"
        // IMPORTANT: We do NOT pass colorChange here.
        // If passed here, the wrapper (including the gap space) gets colored.
      >
        {(item: any, index: any) => (
          // VISUAL CARD: We apply the styling, background, and rounded corners HERE.
          // This ensures the "gap" padding remains transparent outside this div.
          <button
            type="button"
            onClick={() => route.push(item?.link)}
            aria-label={`View ${item?.name} consultant profile`}
            className={`flex flex-col justify-between h-full rounded-[12px] p-5 md:pl-[16px] md:pr-[30px] md:py-[30px] w-full text-left ${getGradientClass(index)}`}
          >
            {/* Top Section: Profile Pic & Name */}
            <div className="text-white flex items-center gap-3 md:gap-[20px]">
              <div className="relative flex-shrink-0">
                {item?.profilePic ? (
                  <Image
                    src={item.profilePic}
                    width={60}
                    height={60}
                    className="rounded-[30%] object-cover w-[50px] h-[50px] md:w-[60px] md:h-[60px]"
                    alt={item?.profileAltText || item?.name || "Profile"}
                  />
                ) : (
                  <div className="rounded-[30%] bg-white/20 w-[50px] h-[50px] md:w-[60px] md:h-[60px] flex items-center justify-center font-bold text-white text-lg">
                    {item?.name ? item.name.charAt(0).toUpperCase() : "D"}
                  </div>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-lg md:text-[20px] font-semibold truncate">
                  {item.name}
                </p>
                <p className="text-sm md:text-[16px] opacity-90 truncate">
                  {item.consultantType}
                </p>
              </div>
            </div>

            {/* Bottom Section: Experience & Amount */}
            <div className="flex flex-wrap justify-between items-center mt-4 md:mt-[20px] gap-2">
              <section className="bg-white rounded-[20px] py-[4px] px-[10px] text-xs md:text-sm font-medium text-black shadow-sm">
                {item?.experience}
              </section>
              <section className="bg-white rounded-[20px] py-[4px] px-[10px] flex justify-center items-center gap-[5px] text-xs md:text-sm font-medium text-black shadow-sm">
                <div className="w-[5px] h-[5px] bg-black rounded-full"></div>
                {item?.amount}
              </section>
            </div>
          </button>
        )}
      </CarouselCommon>
    </section>
  );
};

export default RecentlyOnboarded;
