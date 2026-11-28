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
  // Card rows show their arrows only when the cards do not all fit (there is somewhere to move to)
  const [canScroll, setCanScroll] = useState(false);
  const isCardRow = type !== "heroBanner" && type !== "banner";

  const combined =
    HeroBanner?.carouselImageUrls?.map((url: any, index: number) => ({
      url,
      alt: HeroBanner?.carouselImageAltTexts?.[index],
      isMobile: HeroBanner?.carouselImageIsMobileFlags?.[index],
    })) || [];

  // Phones show the banners marked "mobile" and larger screens the others; when one set is empty
  // the other is used, so the banner never disappears
  const mobileBanners = combined.filter((item: any) => item?.isMobile);
  const desktopBanners = combined.filter((item: any) => !item?.isMobile);
  const heroBanner = isCleanMeta
    ? HeroBanner || []
    : isMobile
      ? mobileBanners.length ? mobileBanners : desktopBanners
      : desktopBanners.length ? desktopBanners : mobileBanners;

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
          if (!api) return;
          emblaApiRef.current = api;
          const updateScrollable = () => setCanScroll(api.canScrollPrev() || api.canScrollNext());
          api.on("select", () => setIndex(api.selectedScrollSnap()));
          api.on("reInit", updateScrollable);
          api.on("resize", updateScrollable);
          updateScrollable();
          if (!autoSlide) autoplayRef.stop();
        }}
        className="w-full relative group"
      >
        <CarouselContent className="-ml-4">
          {type === "heroBanner"
            ? heroBanner?.map((item: any, index: number) => (
                <CarouselItem key={index} className="pl-4 basis-full w-full">
                  <div className="relative w-full overflow-hidden rounded-[20px] flex items-center justify-center">
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
                      width={width || 1400}
                      height={height || 600}
                      alt={item.alt || "Banner image"}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1400px"
                      className={
                        ImageclassName ||
                        "w-full h-[220px] sm:h-[320px] md:h-[400px] lg:h-[480px] object-cover rounded-[20px]"
                      }
                      style={{ width: "100%", ...style }}
                      priority={index === 0}
                      fetchPriority={index === 0 ? "high" : "auto"}
                    />
                  </div>
                </CarouselItem>
              ))
            : type === "banner"
              ? HeroBanner?.map((item: any, index: number) => (
                  <CarouselItem key={index} className="pl-4 basis-full w-full">
                    <div className="relative w-full overflow-hidden rounded-[20px] flex items-center justify-center">
                      <Image
                        src={item}
                        width={width || 1400}
                        height={height || 600}
                        alt={typeof item === "string" ? item : "Banner"}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1400px"
                        className={
                          ImageclassName ||
                          "w-full h-[220px] sm:h-[320px] md:h-[400px] lg:h-[480px] object-cover rounded-[20px]"
                        }
                        style={{ width: "100%", ...style }}
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
            <div className="flex bg-white/70 px-1 py-2 rounded-full backdrop-blur-sm shadow-sm">
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
                    // Padding (with the colour clipped to the content box) gives each dot a finger-sized hit area; the negative
                    // vertical margin keeps the pill exactly as it looks, and the 4px side padding is the old 8px gap
                    className={`box-content h-2 -my-3 py-3 px-1 bg-clip-content rounded-full transition-all duration-300 cursor-pointer ${
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
        {SlideButton && !DotSlider && (!isCardRow || canScroll) && (
          <>
            <CarouselPrevious className="absolute left-2 h-9 w-9 sm:h-10 sm:w-10 z-10 bg-white/80 hover:bg-white" />
            <CarouselNext className="absolute right-2 h-9 w-9 sm:h-10 sm:w-10 z-10 bg-white/80 hover:bg-white" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default CarouselCommon;
