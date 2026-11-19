import {
  hexpertifyFooter,
  instaFooter,
  linkedInFooter,
  xFooter,
} from "@/asset/images";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Footer = () => {
  return (
    <>
      <footer className="flex flex-wrap md:flex-nowrap bg-[#a081e2] justify-between items-start md:items-center p-6 md:p-[30px]">
        <section className="w-full md:w-[25%] flex flex-col justify-start md:justify-center items-start md:items-center order-last md:order-first mt-8 pt-8 md:mt-0 md:pt-0 border-t border-gray-400 md:border-none">
          {/* <Image 
 src={hexpertifyFooter} height={200} width={250}
unoptimized={true} 
          priority={true} 
         placeholder="empty"
 alt='FooterLogo' className='mb-0' quality={100}/> */}
          <object
            type="image/svg+xml"
            data={hexpertifyFooter}
            height={200}
            width={250}
            role="img"
            aria-label="Hexpertify footer logo"
            className="mb-0 h-[104px]!"
          >
            svg-animation
          </object>

          <div className="flex justify-center items-center gap-[5px]">
            <Link
              href="https://www.instagram.com/hexpertify"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Hexpertify on Instagram"
            >
              {/* <Image src={instaFooter} height={50} width={50} alt="Instagram" className="cursor-pointer "  /> */}
              <object
                type="image/svg+xml"
                data={instaFooter}
                height={50}
                width={50}
                role="img"
                aria-label="Instagram"
                className="cursor-pointer pointer-events-none"
              >
                svg-animation
              </object>
            </Link>

            <Link
              href="https://x.com/hexpertifyapp"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Hexpertify on X"
            >
              {/* <Image src={xFooter} height={50} width={50} alt="X" className="cursor-pointer "  /> */}
              <object
                type="image/svg+xml"
                data={xFooter}
                height={50}
                width={50}
                role="img"
                aria-label="X"
                className="cursor-pointer pointer-events-none"
              >
                svg-animation
              </object>
            </Link>

            <Link
              href="https://www.linkedin.com/company/hexpertify"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Hexpertify on LinkedIn"
            >
              {/* <Image src={linkedInFooter} height={50} width={50} alt="LinkedIn" className="cursor-pointer pointer-events-none"  /> */}
              <object
                type="image/svg+xml"
                data={linkedInFooter}
                height={50}
                width={50}
                role="img"
                aria-label="LinkedIn"
                className="cursor-pointer pointer-events-none"
              >
                svg-animation
              </object>
            </Link>
          </div>
        </section>

        <section className="w-1/2 md:w-[19%] flex flex-col gap-4 md:gap-[25px] pr-2 md:px-[20px] mb-8 md:mb-0">
          <Link href="/" className="menuText no-underline font-bold">
            Home
          </Link>
          <Link
            href="/#categories"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Categories
          </Link>
          <Link
            href="/#recently-onboarded"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Recently Onboarded
          </Link>
          <Link
            href="/#top-consultants"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Top Consultants
          </Link>
        </section>

        <section className="w-1/2 md:w-[19%] flex flex-col gap-4 md:gap-[25px] pl-2 md:px-[20px] mb-8 md:mb-0">
          <Link href="/#categories" className="menuText no-underline font-bold">
            Services
          </Link>
         
          <Link
            href="/services/mental-health-counsellor"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Individual Therapy
          </Link>
          <Link
            href="/services/couple-therapy"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Couple Therapy
          </Link>
           <Link
            href="/services/teen-therapy"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Teen Therapy
          </Link>
        </section>

        <section className="w-1/2 md:w-[19%] flex flex-col gap-4 md:gap-[25px] pr-2 md:px-[20px]">
          <Link href="/about-us" className="menuText no-underline font-bold">
            About Us
          </Link>
          <Link
            href="/privacy-policy"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-conditions"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Terms & Conditions
          </Link>
          <Link
            href="/refund-policy"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Refund Policy
          </Link>
        </section>

        <section className="w-1/2 md:w-[19%] flex flex-col gap-4 md:gap-[25px] pl-2 md:px-[20px]">
          <Link href="/contact-us" className="menuText no-underline font-bold">
            Contact Us
          </Link>
          <Link
            href="tel:+918940506900"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Call Us
          </Link>
          <Link
            href="mailto:hexpertifyapp@gmail.com"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Email Us
          </Link>
          <Link
            href="/contact-us"
            className="h1 cursorPointer no-underline text-sm md:text-base"
          >
            Join as Consultant
          </Link>
        </section>
      </footer>
      <div className="bg-primary px-4 py-3 text-center text-xs leading-relaxed text-white md:text-sm">
        Hexpertify is not a crisis support. If you are in immediate danger or
        emergency, please contact emergency services or a crisis helpline right
        away. National Tele MANAS helpline at{" "}
        <Link href="tel:18008914416" className="font-semibold underline">
          1800-89-14416
        </Link>
        .
      </div>
      <div className="bg-primary text-[white] text-center p-2 text-sm">
        © {new Date().getFullYear()} Hexpertify. All rights reserved.
      </div>
    </>
  );
};

export default Footer;
