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

interface props {
  ConsultantProfileDetails: any;
}

/** Scrolls the section with this id into view (the site scrolls inside <main>, so anchors alone are unreliable) */
const scrollToSection = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const ProfileSec = ({ ConsultantProfileDetails }: props) => {
  const info = ConsultantProfileDetails?.info || {};
  const languages = Array.isArray(info.languages) ? info.languages.filter(Boolean).join(", ") : "";
  // Each box shows its value above its label
  const profileInfo: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Consultations", value: info.patients ?? 0 },
    { label: "Booking Price", value: info.bookingPrice || "N/A" },
    { label: "Certified", value: info.certified ? "Yes" : "No" },
    { label: "Experience", value: info.experience || "—" },
    { label: "Languages", value: languages || "—" },
  ];
  const photo = ConsultantProfileDetails?.profileUrl || ConsultantProfileDetails?.photoUrl;
  const initials = String(ConsultantProfileDetails?.name || "")
    .replace(/^dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      id="consultant-info"
      className="flex gap-[30px] my-[20px] justify-between items-center
                    max-lg:flex-col max-lg:text-center max-lg:gap-[20px]"
    >
      {/* Image: the consultant's own photo, or their initials (never a stock photo of someone else) */}
      <div className="w-full max-lg:max-w-[560px] lg:w-[450px] shrink-0 overflow-hidden rounded-[25px] shadow-sm bg-slate-100 flex items-center justify-center">
        {photo ? (
          <Image
            src={photo}
            width={500}
            height={450}
            alt={
              ConsultantProfileDetails?.profileUrlAltText ||
              ConsultantProfileDetails?.photoAltText ||
              ConsultantProfileDetails?.name ||
              "Consultant Profile"
            }
            className="w-full h-[320px] sm:h-[380px] md:h-[420px] lg:h-[450px] object-cover rounded-[25px]"
            priority
          />
        ) : (
          <div
            role="img"
            aria-label={ConsultantProfileDetails?.name || "Consultant"}
            className="w-full h-[320px] sm:h-[380px] md:h-[420px] lg:h-[450px] rounded-[25px] bg-[#F3EDF7] flex items-center justify-center text-[96px] font-bold text-[#877CA1]"
          >
            {initials || "?"}
          </div>
        )}
      </div>

      <div className="min-w-0 lg:flex-1 max-lg:flex max-lg:flex-col max-lg:items-center max-lg:w-full">
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
                        border-solid my-[20px] w-full overflow-hidden
                        max-md:mt-[30px] max-md:text-[14px]"
        >
          <button
            type="button"
            onClick={() => scrollToSection("consultant-info")}
            className="text-black w-full p-[10px] flex justify-center bg-[#F3EDF7] cursor-pointer"
          >
            Informations
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("userReview")}
            className="text-black w-full p-[10px] flex justify-center cursor-pointer"
          >
            User Reviews
          </button>
        </div>

        {/* Info Boxes: 3 on the first row, 2 on the second */}
        <div className="flex flex-col items-center w-full">
          {[profileInfo.slice(0, 3), profileInfo.slice(3)].map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`flex justify-center flex-wrap items-center w-full ${rowIndex ? "md:*:mt-4 mt-8" : ""}`}
            >
              {row.map((item, index) => (
                <div
                  key={item.label}
                  className={`${rowIndex ? "w-[45%]" : "w-1/3"} max-w-[235px] min-w-0 px-1 ${index !== row.length - 1 ? "border-r-[1px]" : ""} flex flex-col justify-center items-center border-[#877CA1]`}
                >
                  <p className="text-[18px] md:text-[26px] xl:text-[32px] text-[#877CA1] font-bold text-center break-words">{item.value}</p>
                  <p className="text-[12px] md:text-[16px] text-center">{item.label}</p>
                </div>
              ))}
            </div>
          ))}
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
