"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import React, { useState, useEffect } from "react";
import { ImageTable } from "../@components/image-table";
import { UploadModal } from "../@components/upload-modal";
import { deleteAsset, uploadAsset } from "./actions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ✅ Dialog UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IAssetsContainer {
  [key: string]: any;
}

const CATEGORIES = [
  { value: "ALL", label: "All Categories" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "BLOG", label: "Blog" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "BANNER", label: "Banner" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ICON", label: "Icon" },
  { value: "OTHER", label: "Other" },
];

const AssetsContainer: React.FC<IAssetsContainer> = (props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState(props.initialSearch || "");
  const [category, setCategory] = useState(props.initialCategory || "ALL");

  // ✅ Delete dialog states (single-file)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Update URL when filters change
  // useEffect(() => {
  //     const params = new URLSearchParams(searchParams.toString());

  //     if (search) params.set("search", search);
  //     else params.delete("search");

  //     if (category && category !== "ALL") params.set("category", category);
  //     else params.delete("category");

  //     // Reset page to 1 when filtering
  //     params.set("page", "1");

  //     const timeout = setTimeout(() => {
  //         router.push(`?${params.toString()}`);
  //     }, 500); // Debounce search

  //     return () => clearTimeout(timeout);
  // }, [search, category, router, searchParams]);
  // 1. Filter Effect: Handles Search and Category (Resets to Page 1)
  useEffect(() => {
    // Skip the very first render to prevent an immediate redirect/loop
    const isInitialLoad =
      search === (props.initialSearch || "") &&
      category === (props.initialCategory || "ALL");

    if (isInitialLoad) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // Update Search
      if (search) params.set("search", search);
      else params.delete("search");

      // Update Category
      if (category && category !== "ALL") params.set("category", category);
      else params.delete("category");

      // ✅ Reset to page 1 because the result set changed
      params.set("page", "1");

      router.push(`?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timeout);
    // ❌ REMOVED searchParams and router from dependencies to prevent infinite loops
  }, [search, category]);

  // 2. Pagination Handler: Purely for page switching (Does NOT use useEffect)
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());

    // Update only the page, keeping search and category as they are
    params.set("page", newPage.toString());

    router.push(`?${params.toString()}`);
  };
  const openDeleteDialog = (id: string) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const handleDeleteImage = async () => {
    if (!deleteId) return;

    const { success, message } = await deleteAsset(deleteId);

    if (success) {
      toast.success(message || "Image deleted successfully");
    } else {
      toast.error(message || "Delete failed");
    }

    setIsDeleteOpen(false);
    setDeleteId(null);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  };

  const handleUploadImage = async (
    file: string,
    name: string,
    category: string,
  ) => {
    try {
      const { success, message } = await uploadAsset(
        file,
        name,
        category as any,
      );
      if (success) {
        toast.success(message || "Image uploaded successfully");
      } else {
        toast.error(message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload image error:", err);
    }
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Images</h1>
            <p className="text-muted-foreground mt-1">
              Manage your uploaded images
            </p>
          </div>
          <Button onClick={() => setIsUploadOpen(true)} className="text-white">
            <Plus className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="w-[200px]">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Images</CardTitle>
            <CardDescription>
              View and manage all uploaded images
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* ✅ Pass custom delete opener */}
            <ImageTable
              images={props?.images}
              onDelete={(id) => openDeleteDialog(id)}
              onCopyUrl={handleCopyUrl}
              {...props}
            />
          </CardContent>
        </Card>
      </div>

      {/* ✅ Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUploadImage}
      />

      {/* ✅ DELETE CONFIRMATION DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Image?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This image will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteImage}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AssetsContainer;
