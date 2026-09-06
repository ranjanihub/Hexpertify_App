"use client";
import { topConsult } from "@/asset/images";
import CarouselCommon from "@/components/Carousel";
import React from "react";
import Image from "next/image";
import Link from "next/link";

interface props {
  data: any;
}

const TopConsultant = ({ data }: props) => {
  return (
    <section id="top-consultants" className="mt-[10px] w-full">
      <p className="titleText my-[20px] text-left text-xl md:text-2xl font-bold md:px-0">
        Top Consultants
      </p>

      <CarouselCommon
        HeroBanner={data}
        type="card"
        DotSlider={false}
        // CLEANUP: Pass "h-full" to the wrapper so items stretch evenly.
        // We do NOT pass the background styles here, so the gap between cards stays clean/transparent.
        cardClassName=""
      >
        {(item: any, index: any) => (
          // VISUAL CARD: Apply background image, padding, and border radius here.
          <div
            className="flex flex-col justify-end h-full max-h-[300px] md:max-h-[300px] w-full bg-cover bg-center bg-no-repeat rounded-[12px] p-6 md:px-[36px] md:pb-[20px] md:pt-[100px]  item-end shadow-md transition-transform duration-300 hover:scale-[1.01]"
            style={{
              backgroundImage: item?.photoUrl
                ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${item?.photoUrl})`
                : `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)),  url(${topConsult.src})`,
              backgroundColor: "#1a1a1a", // Fallback color
              minHeight: 300,
            }}
            aria-label={item?.photoAltText}
          >
            <div className="flex flex-row gap-2 items-end justify-end">
              <div className="flex-1 flex-row justify-between">
                <p className="text-lg md:text-[20px] font-bold text-white">
                  {item?.name}
                </p>
                <p className="text-sm md:text-[16px] text-[#B2B3B5] font-medium">
                  {item?.consultantType}
                </p>
              </div>
              <Link
                href={`services/${item.profession?.identifier}/${item?.identifier}`}
                className="flex items-center justify-center max-w-[100px] mt-6 md:mt-0 h-[40px]  rounded-[30px] bg-primary hover:bg-white hover:text-primary border border-transparent hover:border-primary transition-all duration-300 px-2 py-0 text-white text-sm md:text-base font-medium"
              >
                Book Now
              </Link>
            </div>
          </div>
        )}
      </CarouselCommon>
    </section>
  );
};

export default TopConsultant;
