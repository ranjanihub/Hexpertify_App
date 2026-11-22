"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (
    fileBase64: string,
    name: string,
    category: string,
  ) => Promise<void>;
}

const CATEGORIES = [
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "BLOG", label: "Blog" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "BANNER", label: "Banner" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "ICON", label: "Icon" },
  { value: "OTHER", label: "Other" },
];

export function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setName("");
      setCategory("OTHER");
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      // Auto-fill name if empty
      if (!name) {
        setName(file.name.split(".")[0]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      // Auto-fill name if empty
      if (!name) {
        setName(file.name.split(".")[0]);
      }
    }
  };

  const handleUploadButton = async () => {
    if (!selectedFile || !name) return;

    try {
      setIsLoading(true);
      const base64 = await toBase64(selectedFile);
      await onUpload(base64, name, category);
      onClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Upload Image
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs font-medium text-foreground mb-1">
              Drag and drop your image here
            </p>
            <p className="text-xs text-muted-foreground">
              or click to select a file
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, GIF, WebP
            </p>

            {selectedFile && (
              <p className="mt-2 text-xs font-semibold text-primary">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-2">
            <Label htmlFor="name">Asset Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Profile Banner"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
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

        {/* Footer */}
        <div className="flex gap-2 p-3 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-transparent h-8 text-xs"
          >
            Cancel
          </Button>

          <Button
            onClick={handleUploadButton}
            disabled={!selectedFile || !name || isLoading}
            className="flex-1 h-8 text-xs text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
