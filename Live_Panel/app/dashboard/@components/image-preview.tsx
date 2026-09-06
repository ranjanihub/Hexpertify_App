"use client";

import dayjs from "dayjs";
import { X } from "lucide-react";

interface Image {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface ImagePreviewProps {
  image: Image;
  onClose: () => void;
}

export function ImagePreview({ image, onClose }: ImagePreviewProps) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <img
          src={image.url || "/placeholder.svg"}
          alt={image.name}
          className="w-full h-auto rounded-lg"
        />
        <div className="mt-4 text-white text-center">
          <p className="text-sm text-gray-400">
            Created: {dayjs(image.createdAt).format("MMM D, YYYY")}
          </p>
        </div>
      </div>
    </div>
  );
}
