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
        ImageclassName="w-full max-h-[380px] object-contain rounded-2xl bg-slate-50/50 p-2"
      />
    </div>
  );
};

export default RegisteredCertificate;
