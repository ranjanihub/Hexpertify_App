"use client";

import { Copy, Trash2, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ImagePreview } from "./image-preview";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dayjs from "dayjs";
import { PaginationWithLinks } from "@/components/ui/pagination-with-links";

interface Image {
  id: string;
  name: string;
  category: string;
  url: string;
  createdAt: string;
  publicId: string;
}

interface ImageTableProps {
  images: Image[];
  onDelete: (id: string) => void;
  onCopyUrl: (url: string) => void;
  currentPage?: number;
  pageSize?: number;
  totalCount?: number;
}

export function ImageTable({
  images,
  onDelete,
  onCopyUrl,
  currentPage = 0,
  pageSize = 0,
  totalCount = 0,
}: ImageTableProps) {
  const [previewImage, setPreviewImage] = useState<Image | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = (url: string, imageId: string) => {
    navigator.clipboard.writeText(url);
    onCopyUrl(url);
    setCopiedId(imageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Url</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No images uploaded yet. Click "Upload Image" to get started.
                </TableCell>
              </TableRow>
            ) : (
              images.map((image) => (
                <TableRow key={image.id}>
                  <TableCell>
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={image.name}
                      className="w-10 h-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewImage(image)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{image.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      {image.category}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {image.url}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {dayjs(image.createdAt).format("MMM D, YYYY")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewImage(image)}
                        title="View image"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyUrl(image.url, image.id)}
                        title="Copy URL"
                      >
                        {copiedId === image.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(image.publicId)}
                        title="Delete image"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {images.length > 0 && (
          <div className="flex items-center justify-end space-x-2 py-4">
            <PaginationWithLinks
              page={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              pageSizeSelectOptions={{
                pageSizeOptions: [5, 10, 25, 50],
              }}
            />
          </div>
        )}
      </div>

      {previewImage && (
        <ImagePreview
          image={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </>
  );
}
