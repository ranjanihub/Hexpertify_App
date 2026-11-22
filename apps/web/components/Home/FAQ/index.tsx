"use client";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@radix-ui/react-accordion";
import React, { useState } from "react";
import { IoChevronDownOutline } from "react-icons/io5";

interface props {
  data: {
    trigger: string;
    accordianItem: string;
  }[];
}

const FAQ = ({ data }: props) => {
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  return (
    // COMPACT CHANGE: Reduced padding (p-4 md:p-6) and margin (mt-6 md:mt-8)
    <div className="w-full  p-4 md:p-6 mt-6 md:mt-8 bg-[#c7b5ee]">
      {/* COMPACT CHANGE: Smaller title text (text-xl md:text-2xl) and reduced bottom margin */}
      <p className="border-0 border-[#1D1B20] border-b-[1px] text-xl md:text-2xl font-semibold text-[#1D1B20] mb-4 pb-2">
        FAQs
      </p>

      <Accordion
        type="single"
        collapsible
        value={openItem}
        onValueChange={(value) => setOpenItem(value)}
        className="w-full rounded-lg transition-all ease-in-out duration-300"
      >
        {data?.map((item, index) => {
          const isOpen = openItem === `item-${index}`;
          return (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              // COMPACT CHANGE: Reduced vertical padding between items
              className="border-b border-[#1D1B2033] last:border-none py-2 md:py-3"
            >
              {/* COMPACT CHANGE: Smaller trigger font size (text-base md:text-lg) and reduced padding */}
              <AccordionTrigger className="text-left text-base md:text-lg py-1 flex justify-between items-center cursor-pointer w-full font-medium transition-colors hover:text-primary group min-w-0">
                <span className="flex-1 pr-4 leading-tight min-w-0 break-words whitespace-normal">
                  {item.trigger}
                </span>

                <IoChevronDownOutline
                  className={`flex-shrink-0 w-4 h-4 md:w-5 md:h-5 text-gray-500 group-hover:text-primary transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
                />
              </AccordionTrigger>

              {/* COMPACT CHANGE: Smaller content text and reduced top margin */}
              <AccordionContent className="text-gray-600 text-sm leading-relaxed mt-2 overflow-hidden text-justify transition-all duration-300 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                {item.accordianItem}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default FAQ;
