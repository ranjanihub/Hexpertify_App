"use server";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Star } from "lucide-react";

interface consultants {
  name: string;
  Description: string;
  Languages: string;
  Price: string;
  rating: number;
  reviewsCount: number;
  certified: Boolean;
  profile: string;
  profileAltText?: string;
  id: any;
  identifier: string;
}

interface props {
  data: consultants[];
  serviceNo: string;
}

const FeatureConsultant = ({ data, serviceNo }: props) => {
  const getStarFill = (rating: number, starIndex: number) => {
    return Math.max(0, Math.min(100, (rating - starIndex + 1) * 100));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px]">
      {data?.map((item: consultants, index: number) => (
        <Link
          key={index}
          href={`/services/${serviceNo}/${item?.identifier}`}
          className="mb-[10px] flex flex-row justify-start items-stretch rounded-[16px] bg-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] p-3 sm:p-1 overflow-hidden gap-3 sm:gap-0 scale-[1.02] cursor-pointer no-underline transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <div className="relative w-[120px] h-[165px] sm:h-[300px] sm:w-[254px] shrink-0 rounded-lg  overflow-hidden bg-gray-100">
            <Image
              src={item?.profile}
              alt={item?.profileAltText || "Doctor Profile"}
              fill
              className="object-cover object-top"
            />
          </div>

          <div className="flex flex-col justify-between w-full sm:p-[15px]">
            <div className="flex justify-between items-start">
              <div className="block"></div>

              <div className="flex justify-end">
                <p className="py-[5px] px-[10px] bg-[#FFD400] text-white rounded-[30px] text-xs font-bold">
                  CERTIFIED
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1 sm:mt-0">
              <p className="text-[#081A3D] font-bold text-[17px] sm:text-[26px] leading-tight">
                {item?.name}
              </p>

              <p className="text-gray-600 text-[12px] sm:text-[14px] line-clamp-2 sm:line-clamp-2 leading-snug">
                {item?.Description}
              </p>

              <p className="text-black text-[12px] sm:text-[18px] font-semibold mt-1">
                Languages:{" "}
                <span className="font-normal text-gray-600">
                  {item?.Languages}
                </span>
              </p>

              <div
                className={`flex items-center gap-1 ${item?.rating == 0 ? "hidden" : ""}`}
              >
                <div
                  className="flex items-center gap-0.5"
                  aria-label={`${item?.rating?.toFixed(1) || "0.0"} out of 5 stars`}
                >
                  {[1, 2, 3, 4, 5].map((starIndex) => (
                    <span
                      key={starIndex}
                      className="relative inline-flex h-4 w-4 sm:h-5 sm:w-5"
                    >
                      <Star
                        className="h-4 w-4 text-gray-300 sm:h-5 sm:w-5"
                        fill="currentColor"
                      />
                      <span
                        className="absolute inset-0 overflow-hidden text-[#FFD400]"
                        style={{
                          width: `${getStarFill(item?.rating || 0, starIndex)}%`,
                        }}
                      >
                        <Star
                          className="h-4 w-4 sm:h-5 sm:w-5"
                          fill="currentColor"
                        />
                      </span>
                    </span>
                  ))}
                </div>
                <span className="text-[12px] font-semibold text-gray-700 sm:text-[14px]">
                  {(item?.rating || 0).toFixed(1)}
                </span>
                {/* <span className="text-[11px] text-gray-500 sm:text-[13px]">
                  ({item?.reviewsCount || 0})
                </span> */}
              </div>
            </div>

            <div className="flex flex-row justify-between items-center mt-2 sm:mt-[10px] gap-2">
              <p className="text-black text-[20px] sm:text-[26px] font-bold">
                ₹{item?.Price}
              </p>

              <Button className="bg-[#2e048a] hover:bg-[#1a0255] text-white text-[13px] sm:text-[16px] h-9 sm:h-10 px-4 rounded-full font-semibold">
                Consult Now
              </Button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FeatureConsultant;
