"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useRef } from "react";

interface props {
  data: {
    title: string;
    image: any;
    id: number;
    identifier: string;
    profileAltText: string;
  }[];
}

const ExploreConsultant = ({ data }: props) => {
  const router = useRouter();

  // 1. Create a reference to the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 2. Function to handle scrolling left and right
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = 300; // Adjusts how far it slides per click

      if (direction === "left") {
        container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  return (
    <section
      id="categories"
      className="mt-[10px] w-full relative group min-h-[360px]"
    >
      <p className="titleText mb-[20px] text-left">Explore Categories</p>

      {/* Wrapper for Buttons and List */}
      <div className="relative w-full">
        {/* --- Left Scroll Button --- */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-md border rounded-full p-2 hidden md:group-hover:block transition-all"
          aria-label="Scroll categories left"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-gray-700"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        {/* --- The Grid Container --- */}
        <div
          ref={scrollContainerRef}
          className="grid grid-rows-2 grid-flow-col gap-[20px] overflow-x-auto pb-4 scroll-smooth hide-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Style to hide scrollbar in Webkit browsers (Chrome, Safari, Edge) */}
          <style jsx>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {data?.map((item, index) => (
            <button
              type="button"
              onClick={() => router.push(`/services/${item?.identifier}`)}
              key={index}
              className="flex flex-col justify-center items-center p-[15px] rounded-[4px] hover:bg-primary-foreground bg-[#F3EDF7] w-[150px] min-w-[150px] h-[150px] text-center cursor-pointer transition-all duration-200 hover:shadow-md"
              aria-label={`Explore ${item?.title} consultants`}
            >
              {item?.image ? (
                <Image
                  src={item.image}
                  width={50}
                  height={50}
                  alt={item?.profileAltText || item?.title || "Explore category"}
                  className="mb-[10px] object-contain"
                  priority={index < 4}
                />
              ) : (
                <div className="w-[50px] h-[50px] mb-[10px] rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                  {item?.title ? item.title.charAt(0).toUpperCase() : "★"}
                </div>
              )}

              <p className="explore !m-0 w-full text-sm font-medium leading-tight break-words">
                {item?.title}
              </p>
            </button>
          ))}
        </div>

        {/* --- Right Scroll Button --- */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white shadow-md border rounded-full p-2 hidden md:group-hover:block transition-all"
          aria-label="Scroll categories right"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-gray-700"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </section>
  );
};

export default ExploreConsultant;
