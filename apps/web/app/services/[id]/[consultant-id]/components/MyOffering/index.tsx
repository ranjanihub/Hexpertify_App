"use client";

import { Button } from "@/components/ui/button";
import React from "react";

const MyOffering = ({
  services: Offerings,
  setOpen,
  setBookingPayload,
}: any) => {
  // No current plans: no empty "My Offerings" card (the page already says the therapist isn't taking bookings)
  if (!Array.isArray(Offerings) || Offerings.length === 0) return null;
  return (
    <div className="px-4 md:px-0">
      <p className="text-[24px] font-bold my-[15px] max-md:text-[26px] ">
        My Offerings
      </p>

      <div className="rounded-[25px] bg-white shadow-[0_4px_4px_3px_rgba(0,0,0,0.25)] p-[30px] max-md:p-[20px] md:mx-12 mx-2.5">
        {Offerings?.map((item: any, index: number) => (
          <div
            key={index}
            // Added 'relative' to position the mobile price absolutely
            className="not-last:border-b-[1px] px-[20px] py-2.5 max-md:px-[10px] relative"
          >
            {/* Name, with the price beside it on phones/tablets (a row, so a long name wraps instead of running under the price) */}
            <div className="flex items-start justify-between gap-3 mt-[10px]">
              <p className="min-w-0 text-[29px] font-semibold text-[#06060699] max-md:text-[22px] max-sm:text-[18px] break-words">
                {item?.name}
              </p>
              <p className="md:hidden shrink-0 whitespace-nowrap text-[22px] max-sm:text-[18px] font-bold text-[#06060699]">
                ₹ {item?.price}
              </p>
            </div>

            {/* Details + Button Container */}
            {/* Removed 'max-md:flex-col' to keep row layout */}
            {/* Added 'max-md:items-end' to align button to bottom of text */}
            <div className="flex justify-between items-center max-md:items-end max-md:gap-[10px]">
              {/* Left Info */}
              {/* Adjusted mobile text size and max-width to fit next to button */}
              <div className="text-[24px] text-[#06060699] flex items-center gap-[10px] my-[20px] flex-wrap max-md:text-[13px] max-md:my-[10px] max-md:gap-[5px] max-md:max-w-[65%] max-sm:flex-col max-sm:items-start max-sm:gap-1">
                {/* Desktop Price - Hidden on Mobile */}
                <p className="font-bold text-[30] max-md:hidden">
                  ₹ {item?.price}
                </p>
                <p className="w-[5px] h-[5px] rounded-[10px] bg-black max-md:hidden"></p>

                <p>{item?.platform}</p>
                <p className="w-[5px] h-[5px] rounded-[10px] bg-black max-sm:hidden"></p>

                <p>For {item?.duration} Minutes</p>
                <p className="w-[5px] h-[5px] rounded-[10px] bg-black max-sm:hidden"></p>

                <p>{item?.sessionCount} Consultation</p>
              </div>

              {/* Book Button */}
              {/* Removed full width, made compact for mobile */}
              <Button
                className="bg-primary text-white py-[15px] px-[25px] font-semibold cursor-pointer rounded-full 
                           max-md:w-auto max-md:py-[10px] max-md:px-[18px] max-md:text-[14px] max-md:h-auto shrink-0"
                onClick={() => {
                  setOpen(true);
                  setBookingPayload({ serviceId: item?.id });
                }}
              >
                Book Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyOffering;
