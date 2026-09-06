import { Banner, Banner2, hexpertify } from "@/asset/images";
import CarouselCommon from "@/components/Carousel";
import React from "react";

const RegisteredCertificate = ({ data }: { data: any }) => {
  return (
    <div className="py-2 px-4 md:px-0">
      <p className="text-[24px] font-bold my-[25px]">Registered Certificate</p>
      <CarouselCommon
        counter
        HeroBanner={data || []}
        type="heroBanner"
        isCleanMeta
        SlideButton={true}
        ImageclassName="object-contain w-[80%] mb-3"
      />
    </div>
  );
};

export default RegisteredCertificate;
