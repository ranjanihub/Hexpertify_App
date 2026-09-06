import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";

export type TherapyImagePosition = "left" | "right";

export interface TherapySectionItem {
  id: string;
  title: string;
  paragraphs: string[];
  image: StaticImageData;
  imageAlt: string;
  imagePosition?: TherapyImagePosition;
  width?: number;
  height?: number;
}

interface TherapySectionsProps {
  items: TherapySectionItem[];
  className?: string;
}

interface TherapySectionCardProps {
  item: TherapySectionItem;
  index: number;
}

function TherapySectionCard({ item, index }: TherapySectionCardProps) {
  const imageOnRight =
    item.imagePosition ? item.imagePosition === "right" : index % 2 === 0;

  return (
    <article className="rounded-[20px] bg-[#E8E3F3] p-5 md:rounded-[24px] md:p-7">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-8">
        <div className={cn("space-y-5 lg:col-span-8", !imageOnRight && "lg:order-2")}>
          <h3 className="text-3xl font-bold tracking-tight text-[#121212] md:text-4xl">
            {item.title}
          </h3>
          <div className="space-y-4">
            {item.paragraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`${item.id}-paragraph-${paragraphIndex}`}
                className="text-[18px] leading-relaxed text-[#2E2A37]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className={cn("lg:order-2 flex justify-start lg:col-span-4", !imageOnRight && "lg:order-1")}>
          <div className="rounded-[18px] bg-white p-3 shadow-[0_8px_24px_rgba(45,34,72,0.09)] lg:rounded-[22px] lg:p-4 w-full mx-auto sm:max-w-md lg:max-w-none">
            <Image
              src={item?.image}
              alt={item?.imageAlt}
              width={item.width ?? item.image.width}
              height={item.height ?? item.image.height}
              className="h-auto w-full rounded-[14px] object-cover"
              sizes="(max-width: 768px) 90vw, 40vw"
              priority={index === 0}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TherapySections({ items, className }: TherapySectionsProps) {
  if (!items?.length) {
    return null;
  }

  return (
    <section className={cn("space-y-8", className)} aria-label="Therapy service sections">
      {items.map((item, index) => (
        <TherapySectionCard key={item.id} item={item} index={index} />
      ))}
    </section>
  );
}
