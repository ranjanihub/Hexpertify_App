"use client";

import type React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useState } from "react";

interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface SeoSectionProps {
  seoMeta: SeoMeta;
  onSeoChange: (field: keyof SeoMeta, value: string | string[]) => void;
}

export function SeoSection({ seoMeta, onSeoChange }: SeoSectionProps) {
  const [keywordInput, setKeywordInput] = useState("");

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      const newKeywords = [...seoMeta.metaKeywords, keywordInput.trim()];
      onSeoChange("metaKeywords", newKeywords);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const newKeywords = seoMeta.metaKeywords.filter((_, i) => i !== index);
    onSeoChange("metaKeywords", newKeywords);
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="metaTitle">Meta Title</Label>
        <Input
          id="metaTitle"
          placeholder="Page title for search engines (50-60 characters)"
          value={seoMeta.metaTitle}
          onChange={(e) => onSeoChange("metaTitle", e.target.value)}
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          {seoMeta.metaTitle.length}/60 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="metaDescription">Meta Description</Label>
        <Textarea
          id="metaDescription"
          placeholder="Page description for search engines (150-160 characters)"
          value={seoMeta.metaDescription}
          onChange={(e) => onSeoChange("metaDescription", e.target.value)}
          maxLength={160}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {seoMeta.metaDescription.length}/160 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="keywords">Meta Keywords</Label>
        <div className="flex gap-2">
          <Input
            id="keywords"
            placeholder="Enter a keyword and press Enter or click Add"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordInputKeyDown}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddKeyword}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {seoMeta.metaKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {seoMeta.metaKeywords.map((keyword, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {keyword}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
