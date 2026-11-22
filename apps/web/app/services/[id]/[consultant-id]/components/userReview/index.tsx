import Image from "next/image";
import React from "react";
import { IoStar } from "react-icons/io5";

const UserReview = ({ userReview }: any) => {
  // 1. Calculate total reviews dynamically to ensure bar percentages are correct
  const breakdown = userReview?.ratingBreakdown || {};
  const totalReviews =
    (breakdown.fiveStar || 0) +
    (breakdown.fourStar || 0) +
    (breakdown.threeStar || 0) +
    (breakdown.twoStar || 0) +
    (breakdown.oneStar || 0);
  if (userReview?.overallRating == 0) {
    return null;
  }
  return (
    <section id="userReview" className="w-full px-4 md:px-0">
      <p className="text-[24px] font-bold mt-[20px] mb-[50px] max-md:text-[26px]">
        User Reviews
      </p>

      {/* Rating Summary */}
      <div className="flex gap-[15px] my-[30px] items-center max-md:flex-wrap">
        <p className="text-[40px] font-bold max-md:text-[30px]">
          {userReview?.overallRating || 0}
        </p>

        {/* Adjusted width and leading to ensure text stacks nicely if needed */}
        <div className="flex flex-col justify-center w-[40px] max-md:w-auto">
          <p className="text-[16px] leading-tight text-center">Out of 5</p>
        </div>

        <div className="flex justify-center items-center max-md:ml-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <IoStar
              key={index}
              size={40}
              className="max-md:size-7"
              color={
                index < Math.round(userReview?.overallRating || 0)
                  ? "#EAC120"
                  : "#D9D9D9"
              }
            />
          ))}
        </div>
      </div>

      {/* Rating Bars */}
      <div className="flex flex-col gap-[15px]">
        {[
          { label: "5 Stars", value: breakdown.fiveStar || 0 },
          { label: "4 Stars", value: breakdown.fourStar || 0 },
          { label: "3 Stars", value: breakdown.threeStar || 0 },
          { label: "2 Stars", value: breakdown.twoStar || 0 },
          { label: "1 Star", value: breakdown.oneStar || 0 },
        ].map((r, idx) => {
          // Calculate percentage safely
          const percentage =
            totalReviews > 0 ? (r.value / totalReviews) * 100 : 0;

          return (
            <div
              className="flex gap-[15px] items-center w-full flex-row max-md:items-start max-md:gap-[5px]"
              key={idx}
            >
              {/* Added min-w to align all bars perfectly */}
              <p className="min-w-[60px] font-medium text-nowrap flex-shrink-0">
                {r.label}
              </p>

              <div className="w-[461px] h-[17px] md:h-[21px] bg-[#D9D9D9] rounded-[32px] max-md:w-full overflow-hidden">
                <div
                  className="h-full bg-[#EAC120] transition-all duration-500 rounded-[32px]"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <p className="text-sm text-black hidden">{r.value}</p>

              {/* Optional: Show count next to bar for clarity (Uncomment if needed) */}
              <span className="text-sm text-black block">{r.value}</span>
            </div>
          );
        })}
      </div>

      <ReviewComponent userReview={userReview} />
    </section>
  );
};

export default UserReview;

import { useState } from "react";
import { IoClose } from "react-icons/io5"; // Added IoClose for the modal

const ReviewComponent = ({ userReview }: { userReview: any }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const closePreview = () => setSelectedImage(null);

  return (
    <>
      {/* 1. Changed grid-cols-[auto_auto] to grid-cols-2 for equal width */}
      <div className="grid grid-cols-2 gap-[30px] my-[50px] max-md:grid-cols-1">
        {userReview?.reviewCards?.map((item: any, idx: number) => {
          // Image Logic
          const MAX_VISIBLE_IMAGES = 3;
          const images = item?.imageUrls || [];
          const visibleImages = images.slice(0, MAX_VISIBLE_IMAGES);
          const remainingCount = images.length - MAX_VISIBLE_IMAGES;

          return (
            <div
              key={idx}
              // 2. Added 'h-full', 'flex', 'flex-col', 'justify-between' for equal height
              className="h-full flex flex-col justify-between rounded-[25px] bg-white shadow-[0_4px_4px_3px_rgba(0,0,0,0.25)] p-[30px] max-md:p-[20px]"
            >
              {/* Content Container (Header + Text) */}
              <div>
                {/* Header */}
                <div className="flex justify-between items-center max-md:flex-col max-md:items-start max-md:gap-[10px]">
                  <div>
                    <p className="text-[20px] font-bold max-md:text-[18px]">
                      {item?.name || "UserName"}
                    </p>
                    <p className="text-[15px] text-[#0000008C] font-bold max-md:text-[14px]">
                      {item?.date || "Date"}
                    </p>
                  </div>

                  <div className="flex justify-center items-center max-md:self-start">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <IoStar
                        key={index}
                        size={24}
                        className="max-md:size-5"
                        color={
                          index < (item?.rating || 0) ? "#EAC120" : "#D9D9D9"
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="mt-[15px] mb-[15px]">
                  <p className="max-md:text-[14px] leading-relaxed">
                    {item?.feedback}
                  </p>
                </div>
              </div>

              {/* Images Section (Pushed to bottom) */}
              {visibleImages.length > 0 && (
                <div className="flex gap-[10px] mt-auto pt-[10px] max-md:justify-start border-t border-gray-100">
                  {visibleImages.map((img: any, index: number) => {
                    const isLastItem = index === MAX_VISIBLE_IMAGES - 1;
                    const showOverlay = isLastItem && remainingCount > 0;

                    return (
                      <div
                        key={index}
                        className="relative cursor-pointer transition-transform hover:scale-105"
                        onClick={() => setSelectedImage(img?.url)}
                      >
                        <Image
                          src={img?.url}
                          alt={img?.alt || `Review Image ${index + 1}`}
                          width={100}
                          height={100}
                          className="rounded-lg object-cover w-[80px] h-[80px]"
                        />
                        {showOverlay && (
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              +{remainingCount}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          <button
            onClick={closePreview}
            className="absolute top-5 right-5 text-white hover:text-gray-300 transition-colors"
          >
            <IoClose size={40} />
          </button>
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedImage}
              alt="Preview"
              width={1200}
              height={800}
              className="object-contain max-w-full max-h-[90vh] rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};
