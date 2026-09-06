// import Image from "next/image";
// import React from "react";
// import { IoStar, IoStarOutline } from "react-icons/io5";
// import { PiCertificateThin } from "react-icons/pi";
// interface props {
//   ConsultantProfileDetails: any;
// }

// const ProfileSec = ({ ConsultantProfileDetails }: props) => {

//   return (
//     <div className="flex gap-[30px] my-[50px] justify-center items-center">
//       <Image
//         src={ConsultantProfileDetails?.profile}
//         width={500}
//         height={0}
//         alt="Image"
//       />
//       <div>
//         <div className="flex justify-between items-center">
//           <p className="text-[40px] text-black font-medium">
//             {ConsultantProfileDetails?.name}
//           </p>
//           <div className="flex gap-[10px] items-center">
//             <IoStar color="#EAC120" size={40} />
//             <p className="font-semibold text-[40px]">{ConsultantProfileDetails?.rating}</p>
//           </div>
//         </div>
//         <div className="flex flex-wrap">
//           {ConsultantProfileDetails?.specialistOn?.map(
//             (item: any, index: number) => (
//               <div className="flex justify-center items-center ">
//                 <p>{item}</p>
//                 {ConsultantProfileDetails?.specialistOn?.length !==
//                   index + 1 && (
//                     <p className="w-[5px] h-[5px] mx-[10px] rounded-[100%] bg-black"></p>
//                   )}
//               </div>
//             )
//           )}
//         </div>
//         <div className="border border-black flex justify-between rounded-[30px]  border-solid my-[50px] cursor-pointer">
//           <div className=" text-black w-full p-[10px] flex justify-center bg-[#F3EDF7] rounded-l-[30px]">
//             Informations
//           </div>
//           <a href="#userReview" className=" text-black w-full p-[10px] flex justify-center">
//             User Reviews
//           </a>
//         </div>
//         <div className="flex justify-center flex-wrap items-center gap-[20px] gap-y-[50px]">
//           {Object?.entries(ConsultantProfileDetails?.info)?.map(
//             ([key, value]: any) => (
//               <div className="w-[235px]  border-r-[1px] flex flex-col justify-center items-center border-[#877CA1]">
//                 {
//                   key == "Certified" ? <PiCertificateThin size={40} color="#877CA1" /> :
//                     <p className="text-[32px] text-[#877CA1]">{`${value}`}</p>
//                 }
//                 {key === "Languages" ?
//                   <p>{key}</p>
//                   : (
//                     <p>{key}</p>
//                   )}
//               </div>
//             )
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ProfileSec;
import Image from "next/image";
import React from "react";
import { IoStar } from "react-icons/io5";
import { PiCertificateThin } from "react-icons/pi";

interface props {
  ConsultantProfileDetails: any;
}

const ProfileSec = ({ ConsultantProfileDetails }: props) => {
  const profileInfo = {
    Consultations: ConsultantProfileDetails?.info?.patients,
    "Booking Price": ConsultantProfileDetails?.info?.bookingPrice,
    Certified: ConsultantProfileDetails?.info?.certified ? "Yes" : "No",
    Experience: ConsultantProfileDetails?.info?.experience,
    [ConsultantProfileDetails?.info?.languages.join(", ")]: "Languages",
  };
  return (
    <div
      className="flex gap-[30px] my-[20px] justify-between items-center 
                    max-md:flex-col max-md:text-center max-md:gap-[20px]"
    >
      {/* Image */}
      <Image
        src={ConsultantProfileDetails?.profileUrl}
        width={500}
        height={0}
        alt={ConsultantProfileDetails?.profileUrlAltText}
        className="max-md:w-[300px] max-md:!w-full !max-w-full max-md:h-auto rounded-[25px]"
      />

      <div className="max-md:flex max-md:flex-col max-md:items-center max-md:w-full">
        {/* Name + Rating */}
        <div
          className="flex justify-between items-center w-full 
                        max-md:gap-2"
        >
          <p className="text-[40px] text-black font-medium max-md:text-[28px]">
            {ConsultantProfileDetails?.name}
          </p>

          <div
            className={`flex gap-[10px] items-center ${ConsultantProfileDetails?.rating == 0 ? "hidden" : ""}`}
          >
            <IoStar color="#EAC120" size={40} className="max-md:size-8" />
            <p className="font-semibold text-[40px] max-md:text-[28px]">
              {ConsultantProfileDetails?.rating}
            </p>
          </div>
        </div>

        {/* Specialist */}
        <div className="flex flex-wrap mt-2 max-md:justify-start w-full">
          {ConsultantProfileDetails?.specialties?.map(
            (item: any, index: number) => (
              <div className="flex justify-start items-center" key={index}>
                <p className="text-[18px] max-md:text-[16px]">{item}</p>

                {ConsultantProfileDetails?.specialties?.length !==
                  index + 1 && (
                  <p className="w-[5px] h-[5px] mx-[10px] rounded-full bg-black"></p>
                )}
              </div>
            ),
          )}
        </div>

        {/* Info - Review Tabs */}
        <div
          className="border border-black flex justify-between rounded-[30px] 
                        border-solid my-[20px] cursor-pointer w-full 
                        max-md:mt-[30px] max-md:text-[14px]"
        >
          <div
            className="text-black w-full p-[10px] flex justify-center 
                          bg-[#F3EDF7] rounded-l-[30px]"
          >
            Informations
          </div>

          <a
            href="#userReview"
            className="text-black w-full p-[10px] flex justify-center"
          >
            User Reviews
          </a>
        </div>

        {/* Info Boxes */}
        <div className="flex flex-col items-center w-full">
          {/* --- First Row (3 Items) --- */}
          <div className="flex justify-center flex-wrap items-center w-full">
            {Object?.entries(profileInfo)
              ?.slice(0, 3)
              .map(([key, value]: any, index: number) => (
                <div
                  key={index}
                  // CHANGES:
                  // 1. w-1/3: Makes items take up 33% width on mobile so 3 fit in a row.
                  // 2. md:w-[235px]: Keeps your fixed width on desktop.
                  // 3. Removed max-md:border-r-0 to keep borders on mobile.
                  className={`
            w-1/3 md:w-[235px] 
            ${index !== 2 ? "border-r-[1px]" : ""} 
            flex flex-col justify-center items-center border-[#877CA1]
        `}
                >
                  {key === "Certified" ? (
                    // You might want to wrap this in a div to scale it via CSS on mobile,
                    // or use a conditional variable for size. Kept as is for now.
                    <PiCertificateThin size={40} color="#877CA1" />
                  ) : (
                    <p className="text-[32px] text-[#877CA1] max-md:text-[18px] font-bold">
                      {`${value}`}
                    </p>
                  )}

                  {/* Reduced label size for mobile */}
                  <p className="text-[16px] max-md:text-[10px] text-center">
                    {key}
                  </p>
                </div>
              ))}
          </div>

          {/* --- Second Row (2 Items) --- */}
          <div className="flex justify-center flex-wrap items-center w-full md:*:mt-4 mt-8">
            {Object?.entries(profileInfo)
              ?.slice(3, 5)
              .map(([key, value]: any, index: number) => (
                <div
                  key={index}
                  // CHANGES:
                  // 1. w-[45%] or w-1/2: Ensures the 2 items fit side-by-side on mobile.
                  className={`
            w-[45%] md:w-[235px] 
            ${index !== 1 ? "border-r-[1px]" : ""} 
            flex flex-col justify-center items-center border-[#877CA1]
        `}
                >
                  {key === "Certified" ? (
                    <PiCertificateThin size={40} color="#877CA1" />
                  ) : (
                    <p className="text-[32px] text-[#877CA1] max-md:text-[18px] font-bold">
                      {`${value}`}
                    </p>
                  )}

                  <p className="text-[16px] max-md:text-[10px] text-center">
                    {key}
                  </p>
                </div>
              ))}
          </div>
        </div>
        {/* <div className="flex justify-center flex-wrap items-center gap-[20px] gap-y-[50px] w-full">
          {Object?.entries(profileInfo)?.slice(0, 3).map(
            ([key, value]: any, index: number) => (
              <div
                key={index}
                className={`w-[235px] ${index !== 2 ? "border-r-[1px]" : ""} flex flex-col justify-center 
                           items-center border-[#877CA1]
                           max-md:border-r-0 max-md:w-[150px] `}
              >
                {key === "Certified" ? (
                  <PiCertificateThin size={40} color="#877CA1" />
                ) : (
                  <p className="text-[32px] text-[#877CA1] max-md:text-[22px]">
                    {`${value}`}
                  </p>
                )}

                <p className="text-[16px]">{key}</p>
              </div>
            )
          )}
        </div>
        <div className="flex justify-center flex-wrap items-center gap-[20px] gap-y-[50px] w-full md:*:mt-4 mt-10">
          {Object?.entries(profileInfo)?.slice(3, 5).map(
            ([key, value]: any, index: number) => (
              <div
                key={index}
                className={`w-[235px] ${index !== 1 ? "border-r-[1px]" : ""} flex flex-col justify-center  
                           items-center border-[#877CA1]
                           max-md:border-r-0 max-md:w-[150px] `}
              >
                {key === "Certified" ? (
                  <PiCertificateThin size={40} color="#877CA1" />
                ) : (
                  <p className="text-[32px] text-[#877CA1] max-md:text-[22px]">
                    {`${value}`}
                  </p>
                )}

                <p className="text-[16px]">{key}</p>
              </div>
            )
          )}
        </div> */}
      </div>
    </div>
  );
};

export default ProfileSec;
