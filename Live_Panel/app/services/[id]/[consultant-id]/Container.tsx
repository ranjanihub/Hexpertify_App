"use client";

import { IoArrowBack } from "react-icons/io5";
import { FaWhatsapp } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import ProfileSec from "./components/ProfileSec";
import MyOffering from "./components/MyOffering";
import RegisteredCertificate from "./components/RegisterCertificate";
import UserReview from "./components/userReview";
import ModalComp from "@/components/Modal";
import FaqCompo from "@/components/Home/FAQ";
import { CalendarCheck } from "lucide-react";

interface ConsultantPageContainerProps {
  consultant: {
    id?: string;
    identifier?: string;
    profileUrl: string | null;
    profileUrlAltText?: string | null;
    name: string;
    notificationTitle?: string | null;
    rating: number;
    specialties: string[];
    info: {
      patients: number;
      bookingPrice: string;
      certified: boolean;
      experience: string;
      languages: string[];
      certificateUrls: {
        url: string;
        alt: string;
      }[];
    };
    description: string;
    videoUrl: string | null;
    userReview: {
      overallRating: number;
      totalReviews: number;
      reviewCards: {
        name: string;
        date: string;
        feedback: string;
        profileUrl: string | null;
        rating: number;
      }[];
    };
  };
  services: any[];
  faqs: any[];
  serviceId: string;
  profession: any;
  seoMeta?: any;
}

export default function Container({
  consultant,
  services,
  faqs,
  profession,
  serviceId,
  seoMeta,
}: ConsultantPageContainerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data } = useSession();
  const [bookingPayload, setBookingPayload] = useState({
    serviceId: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const htmlChunk = seoMeta?.htmlChunk;
  const scrollToBookingSection = () => {
    document.getElementById("booking-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const convertToEmbedURL = (url: string) => {
    return url
      .replace("youtu.be/", "www.youtube.com/embed/")
      .replace("watch?v=", "embed/");
  };

  const formattedFaqs =
    faqs?.map((faq, index) => ({
      id: index + 1,
      trigger: faq.question || faq.trigger || "Question",
      accordianItem: faq.answer || faq.accordianItem || "Answer",
    })) || [];

  const handleBooking = async () => {
    const userId = data?.user?.id || "";
    const payload = {
      userId,
      consultantId: consultant?.id || "",
      serviceId: bookingPayload.serviceId,
    };
    setIsLoading(true);
    const { data: resDate, error } = await createBooking(payload);
    setOpen(false);
    setIsLoading(false);
    if (resDate?.id) {
      setIsSuccessModalOpen(true);
      toast.success("Booking successful!");
    } else {
      toast.error(
        <div className="flex items-center justify-between gap-3">
          <span>{error || "Booking failed. Please try again."}</span>

          <button
            onClick={() => router.push("/profile")}
            className="bg-[#4a00e0] hover:bg-[#3b00b3] max-w-fit w-[200px] text-white font-bold py-2 px-6 rounded-full transition-colors duration-200"
          >
            Update
          </button>
        </div>,
      );
    }
  };

  return (
    <>
      <div className="py-4 pb-24 md:p-6 lg:p-[50px]">
        <div className="w-full px-4 md:px-0">
          {" "}
          {/* Added padding for mobile edge safety */}
          {/* --- Header Section --- */}
          <div className="flex gap-[10px] md:gap-[20px] items-center my-[15px] md:my-[20px]">
            {/* Adjusted icon size logic or wrapper if needed, keeping simple here */}
            <IoArrowBack
              size={32}
              className="cursor-pointer md:w-[46px] md:h-[46px]" // Responsive sizing via class if supported, or fallback to size prop
              onClick={() => router.back()}
            />
            <p className="text-[20px] sm:text-[24px] md:text-[32px] font-semibold text-black leading-tight">
              Back
            </p>
          </div>
          <ProfileSec ConsultantProfileDetails={consultant} />
          {/* --- About Section --- */}
          <div className="mt-6 md:mt-0">
            <p className="text-[24px] font-bold my-[15px] max-md:text-[26px] ">
              About
            </p>

            {/* Layout: Stack vertically on mobile (flex-col), side-by-side on desktop (lg:flex-row) */}
            <div className="flex flex-col lg:flex-row justify-between gap-[20px] lg:gap-[40px]">
              {/* Description Text */}
              <div className="w-full lg:w-1/2">
                <p className="whitespace-pre-line text-base md:text-lg leading-relaxed text-justify">
                  {consultant.description}
                </p>
              </div>

              {/* Video Section */}
              {consultant.videoUrl && (
                <div className="w-full lg:w-1/2 flex justify-center lg:justify-end ">
                  <div className="w-full max-w-[511px] relative">
                    <iframe
                      className="rounded-[16px] md:rounded-[30px] w-full aspect-video shadow-lg border-4 border-primary"
                      src={convertToEmbedURL(consultant.videoUrl)}
                      title="Consultant video"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <section id="booking-section" className="scroll-mt-16">
          <MyOffering
            services={services}
            setOpen={setOpen}
            setBookingPayload={setBookingPayload}
          />
        </section>
        <RegisteredCertificate data={consultant.info?.certificateUrls} />
        <UserReview userReview={consultant.userReview} />
        <div className="my-[30px]">
          {htmlChunk && <HtmlContent content={htmlChunk} />}
        </div>
        <ConfirmationModal
          open={isSuccessModalOpen}
          setOpen={setIsSuccessModalOpen}
          consultantName={consultant.name}
        />
        <BookingModal
          open={open}
          setOpen={setOpen}
          handleBooking={handleBooking}
          isLoading={isLoading}
        />
      </div>

      {formattedFaqs.length > 0 && <FaqCompo data={formattedFaqs} />}
      {services?.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/20 bg-white/95 px-4 py-3 shadow-[0_-4px_18px_rgba(0,0,0,0.18)] backdrop-blur md:hidden">
          <Button
            type="button"
            onClick={scrollToBookingSection}
            className="h-12 w-full rounded-full bg-primary text-base font-semibold text-white"
          >
            {/* <CalendarCheck className="mr-2 h-5 w-5" />÷ */}
            Book Consultation
          </Button>
        </div>
      )}
    </>
  );
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Adjust import path based on your project structure
import { useSession } from "next-auth/react";
import { createBooking } from "./actions";
import { toast } from "sonner";

interface BookingModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  handleBooking: () => Promise<void>;
  isLoading: boolean;
}

function BookingModal({
  open,
  setOpen,
  handleBooking,
  isLoading,
}: BookingModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* sm:max-w-[600px] ensures the modal is wide enough for your desktop padding */}
      <DialogContent className="sm:max-w-[600px] bg-white p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[24px] md:text-[32px] font-bold text-left">
            Book Consultant
          </DialogTitle>
          <DialogDescription className="text-[16px] md:text-[20px]  text-left text-black">
            Are you sure you want to book the consultant?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col w-full">
          {/* Buttons Section */}
          <div className="p-4 pt-0 flex gap-3 flex-col justify-center items-center">
            <Button
              className="bg-[#450BC8] hover:bg-[#3708a0]  rounded-[16px] text-white w-full h-[50px] text-[18px] md:text-[20px] cursor-pointer font-semibold"
              onClick={() => {
                // Handle booking confirmation logic here
                handleBooking();
              }}
              disabled={isLoading}
            >
              {isLoading ? "Booking..." : "Yes, Book"}
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="outline" // Using shadcn variant for borders, overridden by className
              className="!hover:bg-[green] cursor-pointer rounded-[16px] bg-white border-[1px] border-[red] text-black w-[80%] h-[50px] text-[18px] md:text-[20px] font-semibold"
            >
              No, Close
            </Button>
          </div>

          <div></div>

          {/* How It Works Section */}
          <div className="bg-[#D0BCFFA6] rounded-[16px] p-[20px] flex flex-col justify-center items-center text-center">
            <h1 className="mb-6 text-center text-2xl font-bold text-black underline decoration-2 underline-offset-4 md:text-3xl">
              How It Works
            </h1>

            {/* Steps Container */}
            <div className="flex flex-col space-y-4 text-center">
              {/* Step 1 */}
              <div>
                <h2 className="text-lg font-bold text-black md:text-xl">
                  Book Your Consultation
                </h2>
                <p className="mx-auto mt-1 max-w-lg text-sm font-semibold text-gray-600 md:text-base">
                  Choose your preferred expert and submit your booking request.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <h2 className="text-lg font-bold text-black md:text-xl">
                  Confirmation
                </h2>
                <p className="mx-auto mt-1 max-w-lg text-sm font-semibold text-gray-600 md:text-base">
                  Our executive will reach out to confirm and schedule your
                  booking as per your preferred time.
                </p>
              </div>

              {/* Step 3 */}
              <div>
                <h2 className="text-lg font-bold text-black md:text-xl">
                  Secure Payment
                </h2>
                <p className="mx-auto mt-1 max-w-lg text-sm font-semibold text-gray-600 md:text-base">
                  Once your booking is confirmed, you’ll receive a payment link.
                  Complete your payment securely to finalize the consultation.
                </p>
              </div>

              {/* Step 4 */}
              <div>
                <h2 className="text-lg font-bold text-black md:text-xl">
                  Get Connected
                </h2>
                <p className="mx-auto mt-1 max-w-lg text-sm font-semibold text-gray-600 md:text-base">
                  After payment, you’ll receive the consultation details and can
                  connect with your chosen expert at the scheduled time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Check, Phone } from "lucide-react"; // Ensure you have lucide-react installed
import HtmlContent from "@/app/services/[id]/components/HtmlContent";
import Link from "next/link";

interface ConfirmationModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  consultantName: string;
}

function ConfirmationModal({
  open,
  setOpen,
  consultantName,
}: ConfirmationModalProps) {
  const whatsappMessage = encodeURIComponent(
    `Hey Hexpertify, I've booked a session with ${consultantName}.`,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] bg-white p-6 md:p-10 rounded-[24px] flex flex-col items-center justify-center border-none shadow-lg outline-none">
        {/* Green Check Icon Circle */}
        <div className="bg-[#00C300] w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-full flex items-center justify-center mb-6 shadow-sm">
          <Check className="text-white w-[50px] h-[50px] md:w-[60px] md:h-[60px] stroke-[4]" />
        </div>

        {/* Main Heading */}
        <h2 className="text-[20px] md:text-[24px] font-bold text-center text-black leading-tight">
          Your Booking is Confirmed Successfully
        </h2>

        {/* Subtext */}
        <p className="text-[14px] md:text-[16px] text-gray-600 text-center mt-3 px-2">
          Our Team will be contacting you shortly to schedule your Booking
        </p>

        {/* Contact Info */}
        <p className="text-[16px] md:text-[18px] font-bold text-black text-center mt-8 mb-4">
          Contact Us:{" "}
          <Link
            href="tel:+918618209518"
            className="text-blue-600 underline underline-offset-4 hover:text-black active:text-black transition-colors"
          >
            +91 8618209518
          </Link>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            className="group min-w-[180px] rounded-full bg-[#00C300] px-8 py-6 text-[16px] font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#00a800] hover:shadow-lg active:translate-y-0 active:scale-95 motion-reduce:transform-none md:text-[18px]"
          >
            <Link
              href={`https://wa.me/918618209518?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaWhatsapp
                className="size-5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110 motion-reduce:transform-none"
                aria-hidden="true"
              />
              WhatsApp
            </Link>
          </Button>
          <Button
            asChild
            className="group min-w-[160px] rounded-full bg-[#4C00D8] px-8 py-6 text-[16px] font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:bg-[#3d00ad] hover:shadow-lg active:translate-y-0 active:scale-95 motion-reduce:transform-none md:text-[18px]"
          >
            <Link href="tel:+918618209518">
              <Phone
                className="size-5 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 motion-reduce:transform-none"
                aria-hidden="true"
              />
              Call Us
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
