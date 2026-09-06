"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";

interface props {
  HeroBanner: any;
  DotSlider?: boolean;
  autoSlide?: boolean;
  width?: number;
  height?: number;
  ImageclassName?: string;
  type: string;
  children?: any;
  cardClassName?: string;
  colorChange?: any;
  style?: any;
  SlideButton?: boolean;
  isCleanMeta?: boolean;
  counter?: boolean;
}

const CarouselCommon = ({
  HeroBanner,
  DotSlider = false,
  autoSlide = false,
  isCleanMeta = false,
  width,
  height,
  ImageclassName,
  type,
  children,
  cardClassName,
  colorChange,
  style,
  SlideButton,
  counter = false,
}: props) => {
  const plugin = useRef(
    Autoplay({
      delay: 2000,
      stopOnInteraction: false,
    }),
  );

  const emblaApiRef = useRef<any>(null);
  const autoplayRef = plugin.current;
  const isMobile = useIsMobile();
  const [selectedIndex, setIndex] = useState(0);

  const combined =
    HeroBanner?.carouselImageUrls?.map((url: any, index: number) => ({
      url,
      alt: HeroBanner?.carouselImageAltTexts?.[index],
      isMobile: HeroBanner?.carouselImageIsMobileFlags?.[index],
    })) || [];

  const heroBanner = isCleanMeta
    ? HeroBanner || []
    : combined.filter((item: any) =>
        isMobile ? item?.isMobile : !item?.isMobile,
      );

  return (
    <div className="mx-auto flex flex-col justify-center items-center overflow-hidden w-full">
      <Carousel
        plugins={[plugin.current]}
        orientation="horizontal"
        opts={{
          loop: true,
          align: "start",
        }}
        setApi={(api: any) => {
          emblaApiRef.current = api;
          api.on("select", () => setIndex(api.selectedScrollSnap()));
          if (!autoSlide) autoplayRef.stop();
        }}
        className="flex justify-center items-center w-full relative group"
      >
        <CarouselContent className="-ml-4">
          {type === "heroBanner"
            ? heroBanner?.map((item: any, index: number) => (
                <CarouselItem key={index} className="pl-4 basis-full">
                  <div className="relative w-full flex items-center justify-center">
                    {counter && (
                      <div
                        className="absolute top-3 right-3 z-20
                                 px-3 py-1 text-sm font-medium
                                 text-white rounded-xl
                                 backdrop-blur-md
                                 bg-white/20 shadow-lg border border-white/30"
                      >
                        {index + 1} / {heroBanner.length}
                      </div>
                    )}

                    <Image
                      src={item.url}
                      width={width || 1200}
                      height={height || 600}
                      alt={item.alt}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                      className={`w-full h-auto object-cover rounded-[20px] ${
                        ImageclassName || ""
                      }`}
                      style={{
                        width: "100%",
                        height: "auto",
                      }}
                      priority={index === 0}
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                  </div>
                </CarouselItem>
              ))
            : type === "banner"
              ? HeroBanner?.map((item: any, index: number) => (
                  <CarouselItem key={index} className="pl-4 basis-full">
                    <div className="relative w-full flex items-center justify-center">
                      <Image
                        src={item}
                        width={width || 1200}
                        height={height || 600}
                        alt={item}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"
                        className={`w-full h-auto object-cover rounded-[20px] ${
                          ImageclassName || ""
                        }`}
                        style={{
                          width: "100%",
                          height: "auto",
                        }}
                        priority={index === 0}
                        fetchPriority={index === 0 ? "high" : "auto"}
                      />
                    </div>
                  </CarouselItem>
                ))
              : HeroBanner?.map((item: any, index: number) => (
                  <CarouselItem
                    key={index}
                    className={`pl-4 basis-full sm:basis-1/2 lg:basis-1/3 ${
                      cardClassName || ""
                    } ${colorChange ? colorChange(index) : ""}`}
                    style={style}
                  >
                    <div className="h-full w-full">{children(item, index)}</div>
                  </CarouselItem>
                ))}
        </CarouselContent>

        {/* Pagination Dots */}
        {SlideButton && DotSlider && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center z-10">
            <div className="flex gap-2 bg-white/70 p-2 rounded-full backdrop-blur-sm shadow-sm">
              {(type === "heroBanner" ? heroBanner : HeroBanner)?.map(
                (_: any, index: number) => (
                  <button
                    type="button"
                    key={index}
                    onClick={() => {
                      emblaApiRef.current?.scrollTo(index);
                      autoplayRef?.reset();
                    }}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={index === selectedIndex ? "true" : undefined}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      index === selectedIndex
                        ? "bg-white w-6"
                        : "bg-gray-400 w-2"
                    }`}
                  />
                ),
              )}
            </div>
          </div>
        )}

        {/* Arrow Buttons */}
        {SlideButton && !DotSlider && (
          <>
            <CarouselPrevious className="absolute left-2 h-8 w-8 sm:h-10 sm:w-10 z-10 bg-white/80 hover:bg-white" />
            <CarouselNext className="absolute right-2 h-8 w-8 sm:h-10 sm:w-10 z-10 bg-white/80 hover:bg-white" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default CarouselCommon;
