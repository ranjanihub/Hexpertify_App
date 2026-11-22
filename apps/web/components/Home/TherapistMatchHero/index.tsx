"use client";

import { ArrowRight } from "lucide-react";
import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import {
  ArrowHeart,
  Better,
  Heart,
  Personalized,
  profilePic,
  Star,
  StarBg,
  topConsult,
  Verified,
} from "@/asset/images";

type TherapistImage = {
  src?: string | StaticImageData | null;
  alt?: string | null;
};

type DisplayTherapistImage = {
  src: string | StaticImageData;
  alt: string;
};

type TherapistImageWithSrc = TherapistImage & {
  src: string | StaticImageData;
};

type TherapistMatchHeroProps = {
  therapists?: TherapistImage[];
  titlePrefix?: string;
  titleHighlight?: string;
  titleSuffix?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
};

const features = [
  { icon: Personalized, label: "Personalized", label2: "Matches" },
  { icon: Verified, label: "Verified", label2: "Care" },
  { icon: Better, label: "Better", label2: "Outcomes" },
];

const fallbackTherapists: DisplayTherapistImage[] = [
  { src: topConsult, alt: "Hexpertify therapist" },
  { src: profilePic, alt: "Hexpertify counsellor profile" },
  { src: topConsult, alt: "Hexpertify mental health expert" },
  { src: profilePic, alt: "Hexpertify consultant profile" },
  { src: topConsult, alt: "Hexpertify online therapist" },
];

export default function TherapistMatchHero({
  therapists = [],
  titlePrefix = "Match With The Right",
  titleHighlight = "Therapist",
  titleSuffix,
  description = "AI - based therapist matching tailored to your needs, goals, and preferred style of care.",
  ctaLabel = "Coming soon..",
  ctaHref = "/services",
  className = "",
}: TherapistMatchHeroProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const dragStartRef = useRef({ pointerX: 0, dragX: 0 });
  const currentDragXRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getMaxDrag = () => {
    const button = buttonRef.current;
    const handle = handleRef.current;

    if (!button || !handle) {
      return 0;
    }

    return Math.max(0, button.clientWidth - handle.offsetWidth - 16);
  };

  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerX: event.clientX,
      dragX: currentDragXRef.current,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (!isDragging) {
      return;
    }

    const nextDragX =
      dragStartRef.current.dragX +
      event.clientX -
      dragStartRef.current.pointerX;
    const clampedDragX = Math.min(Math.max(nextDragX, 0), getMaxDrag());
    currentDragXRef.current = clampedDragX;
    setDragX(clampedDragX);
  };

  const handlePointerEnd = () => {
    if (!isDragging) {
      return;
    }

    const maxDrag = getMaxDrag();
    setIsDragging(false);

    if (maxDrag > 0 && currentDragXRef.current >= maxDrag * 0.88) {
      currentDragXRef.current = maxDrag;
      setDragX(maxDrag);
      return;
    }

    currentDragXRef.current = 0;
    setDragX(0);
  };

  const providedTherapists: DisplayTherapistImage[] = therapists
    .filter((therapist): therapist is TherapistImageWithSrc =>
      Boolean(therapist?.src),
    )
    .map((therapist) => ({
      alt: therapist.alt || "Hexpertify therapist",
      src: therapist.src,
    }));

  const displayTherapists = [
    ...providedTherapists,
    ...fallbackTherapists,
  ].slice(0, 5);

  return (
    <div className="relative mx-auto w-full">
      <section
        className={`relative w-full overflow-hidden rounded-[24px] bg-white px-5 py-8 shadow-[0_20px_60px_-30px_rgba(17,24,39,0.45)] sm:rounded-[32px] sm:px-10 sm:py-12 lg:px-16 lg:py-14 ${className}`}
      >
        <div className="absolute left-4 top-4 sm:left-8 sm:top-8" aria-hidden>
          <Image
            src={Star}
            alt="Star decoration"
            width={46}
            height={42}
            className="h-[42px] w-[46px]"
          />
        </div>

        <div
          className="pointer-events-none absolute right-[3%] top-6 hidden lg:block"
          aria-hidden
        >
          <Image
            src={Heart}
            alt="Heart decoration"
            width={46}
            height={42}
            className="h-[100px] w-[100px]"
          />
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-8 mb-3">
          <div className="relative pt-10 sm:pt-8 lg:pt-4">
            <h1 className="text-[30px] font-bold leading-[1.05] tracking-normal text-neutral-900 sm:text-5xl lg:text-[56px]">
              <span className="bg-gradient-to-r from-[#3D2386] to-[#6C3DEC] bg-clip-text text-transparent">
                {titlePrefix}
              </span>
              <br />
              <span className="inline-flex flex-wrap items-end gap-x-3">
                <span className="text-neutral-900">{titleHighlight}</span>
                {titleSuffix ? (
                  <span className="text-neutral-900">{titleSuffix}</span>
                ) : null}
                <Image
                  src={ArrowHeart}
                  alt="ArrowHeart decoration"
                  width={46}
                  height={42}
                  className="h-[50px] w-[100px]"
                />
              </span>
            </h1>

            <p className="mt-5 max-w-md font-bold text-[15px] leading-relaxed text-neutral-800 sm:mt-6 sm:text-lg">
              {description}
            </p>

            <ul className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-4 sm:gap-x-4">
              {features.map((feature, index) => (
                <li key={feature.label2} className="flex items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="relative grid h-[60px] w-[60px] shrink-0 place-items-center overflow-hidden rounded-full bg-purple-100 sm:h-[56px] sm:w-[56px]">
                      <Image
                        src={feature.icon}
                        alt={`${feature.label} ${feature.label2}`}
                        fill
                        sizes="80px"
                        className="object-contain scale-[1.35]"
                      />
                    </span>
                    <span className="text-[13px] font-bold leading-tight text-neutral-900 sm:text-sm">
                      {feature.label}
                      <br />
                      {feature.label2}
                    </span>
                  </div>
                  {index < features.length - 1 ? (
                    <span className="ml-3 h-9 w-px bg-neutral-200 sm:ml-4" />
                  ) : null}
                </li>
              ))}
            </ul>

            {/* <div
            className="pointer-events-none absolute -bottom-2 -left-2 hidden lg:block"
            aria-hidden
          > */}

            {/* </div> */}
          </div>

          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <div className="flex items-center justify-center -space-x-3 sm:-space-x-4">
              {displayTherapists.map((therapist, index) => (
                <div
                  key={`${therapist.alt}-${index}`}
                  className="relative h-[62px] w-[62px] overflow-hidden rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.15)] ring-[3px] ring-white sm:h-24 sm:w-24 sm:ring-4 lg:h-32 lg:w-32"
                  style={{ zIndex: index + 1 }}
                >
                  {typeof therapist.src === "string" ? (
                    <img
                      src={therapist.src}
                      alt={therapist.alt || "Therapist portrait"}
                      loading={index === 0 ? "eager" : "lazy"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={therapist.src}
                      alt={therapist.alt || "Therapist portrait"}
                      width={512}
                      height={512}
                      priority={index === 0}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              ref={buttonRef}
              type="button"
              aria-label={`Swipe to open ${ctaLabel}`}
              className="group relative z-10 flex h-[60px] w-full max-w-[620px] touch-none select-none items-center justify-center overflow-hidden rounded-full border-4 bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#6366f1] px-14 text-white shadow-[0_14px_40px_-10px_rgba(124,58,237,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.99] sm:h-[68px] sm:px-[72px]"
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                }
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-[therapist-match-shine_2.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />
              <span
                ref={handleRef}
                className={`absolute left-1.5 top-1/2 z-10 grid h-11 w-11 shrink-0 cursor-grab place-items-center overflow-hidden rounded-full bg-white shadow-md active:cursor-grabbing sm:left-2 sm:h-[52px] sm:w-[52px] ${
                  isDragging
                    ? ""
                    : dragX > 0
                      ? "transition-transform duration-200 ease-out"
                      : "animate-[therapist-match-call-swipe_1.9s_ease-in-out_infinite]"
                }`}
                style={
                  isDragging || dragX > 0
                    ? { transform: `translateX(${dragX}px) translateY(-50%)` }
                    : undefined
                }
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
              >
                <ArrowRight
                  className="h-4 w-4 text-[#7c3aed] sm:h-5 sm:w-5"
                  strokeWidth={2.5}
                />
              </span>
              {/* sm:text-lg lg:text-xl */}
              <span className="relative w-full text-center text-[22px] font-semibold sm:text-[24px]">
                {ctaLabel}
              </span>
            </button>
          </div>
        </div>
      </section>
      <div className="absolute -bottom-10 -left-4 " aria-hidden>
        <Image
          src={StarBg}
          alt="StarBg decoration"
          width={46}
          height={42}
          className="h-[200px] w-[250px]"
        />
      </div>
    </div>
  );
}
