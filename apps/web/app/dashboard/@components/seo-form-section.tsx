"use client";

import type React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import type { FormikProps } from "formik";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface SeoFormSectionProps {
  formik: FormikProps<any>;
}

export function SeoFormSection({ formik }: SeoFormSectionProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const seoMeta = formik.values.seoMeta || {};
  const keywords = seoMeta.metaKeywords || [];

  const handleAddKeyword = () => {
    if (keywordInput.trim()) {
      const newKeywords = [...keywords, keywordInput.trim()];
      formik.setFieldValue("seoMeta.metaKeywords", newKeywords);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const newKeywords = keywords.filter((_: string, i: number) => i !== index);
    formik.setFieldValue("seoMeta.metaKeywords", newKeywords);
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
        <Label htmlFor="metaTitle">
          Meta Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="metaTitle"
          placeholder="Page title for search engines (50-60 characters)"
          value={seoMeta.metaTitle || ""}
          onChange={(e) =>
            formik.setFieldValue("seoMeta.metaTitle", e.target.value)
          }
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          {(seoMeta.metaTitle || "").length}/60 characters
        </p>
        {((formik.touched.seoMeta as any)?.metaTitle &&
          (formik.errors.seoMeta as any)?.metaTitle) ||
        (formik.submitCount > 0 &&
          (formik.errors.seoMeta as any)?.metaTitle) ? (
          <p className="text-sm text-destructive">
            {(formik.errors.seoMeta as any).metaTitle}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="metaDescription">
          Meta Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="metaDescription"
          placeholder="Page description for search engines (150-160 characters)"
          value={seoMeta.metaDescription || ""}
          onChange={(e) =>
            formik.setFieldValue("seoMeta.metaDescription", e.target.value)
          }
          maxLength={160}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {(seoMeta.metaDescription || "").length}/160 characters
        </p>
        {((formik.touched.seoMeta as any)?.metaDescription &&
          (formik.errors.seoMeta as any)?.metaDescription) ||
        (formik.submitCount > 0 &&
          (formik.errors.seoMeta as any)?.metaDescription) ? (
          <p className="text-sm text-destructive">
            {(formik.errors.seoMeta as any).metaDescription}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="keywords">
          Meta Keywords <span className="text-destructive">*</span>
        </Label>
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

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {keywords.map((keyword: string, index: number) => (
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

      {/* Divider */}
      <div className="border-t pt-4 mt-6">
        <h3 className="text-lg font-semibold mb-4">
          Open Graph (Social Media)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          These fields control how your page appears when shared on social media
          platforms like Facebook, Twitter, LinkedIn, etc.
        </p>
      </div>

      {/* OG Title */}
      <div className="space-y-2">
        <Label htmlFor="ogTitle">
          OG Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ogTitle"
          placeholder="Title for social media sharing (leave empty to use Meta Title)"
          value={seoMeta.ogTitle || ""}
          onChange={(e) =>
            formik.setFieldValue("seoMeta.ogTitle", e.target.value)
          }
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground">
          {(seoMeta.ogTitle || "").length}/60 characters
        </p>
        {((formik.touched.seoMeta as any)?.ogTitle &&
          (formik.errors.seoMeta as any)?.ogTitle) ||
        (formik.submitCount > 0 && (formik.errors.seoMeta as any)?.ogTitle) ? (
          <p className="text-sm text-destructive">
            {(formik.errors.seoMeta as any).ogTitle}
          </p>
        ) : null}
      </div>

      {/* OG Description */}
      <div className="space-y-2">
        <Label htmlFor="ogDescription">
          OG Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="ogDescription"
          placeholder="Description for social media sharing (leave empty to use Meta Description)"
          value={seoMeta.ogDescription || ""}
          onChange={(e) =>
            formik.setFieldValue("seoMeta.ogDescription", e.target.value)
          }
          maxLength={200}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          {(seoMeta.ogDescription || "").length}/200 characters
        </p>
        {((formik.touched.seoMeta as any)?.ogDescription &&
          (formik.errors.seoMeta as any)?.ogDescription) ||
        (formik.submitCount > 0 &&
          (formik.errors.seoMeta as any)?.ogDescription) ? (
          <p className="text-sm text-destructive">
            {(formik.errors.seoMeta as any).ogDescription}
          </p>
        ) : null}
      </div>

      {/* OG Image */}
      <div className="space-y-2">
        <Label htmlFor="ogImage">
          OG Image URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="ogImage"
          placeholder="https://example.com/og-image.jpg (1200x630px recommended)"
          value={seoMeta.ogImage || ""}
          onChange={(e) =>
            formik.setFieldValue("seoMeta.ogImage", e.target.value)
          }
        />
        <p className="text-xs text-muted-foreground">
          Recommended size: 1200x630 pixels for optimal display
        </p>
        {((formik.touched.seoMeta as any)?.ogImage &&
          (formik.errors.seoMeta as any)?.ogImage) ||
        (formik.submitCount > 0 && (formik.errors.seoMeta as any)?.ogImage) ? (
          <p className="text-sm text-destructive">
            {(formik.errors.seoMeta as any).ogImage}
          </p>
        ) : null}
        {/* OG Image Alt */}
        <div className="space-y-2">
          <Label htmlFor="ogImageAlt">
            OG Image Alt Text <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ogImageAlt"
            placeholder="Description of OG image"
            value={seoMeta.ogImageAlt || ""}
            onChange={(e) =>
              formik.setFieldValue("seoMeta.ogImageAlt", e.target.value)
            }
          />
          {((formik.touched.seoMeta as any)?.ogImageAlt &&
            (formik.errors.seoMeta as any)?.ogImageAlt) ||
          (formik.submitCount > 0 &&
            (formik.errors.seoMeta as any)?.ogImageAlt) ? (
            <p className="text-sm text-destructive">
              {(formik.errors.seoMeta as any).ogImageAlt}
            </p>
          ) : null}
        </div>

        {seoMeta.ogImage && (
          <div className="mt-2">
            <Label className="text-sm">Preview</Label>
            <div className="mt-1 border rounded-lg p-2 bg-muted/20">
              <img
                src={seoMeta.ogImage || "/placeholder.svg"}
                alt={seoMeta.ogImageAlt || "OG Image preview"}
                className="w-full max-w-md h-auto object-cover rounded"
              />
            </div>
          </div>
        )}
      </div>

      {/* HTML Chunk Field */}
      <div className="space-y-2 border-t pt-4 mt-6">
        <h3 className="text-lg font-semibold mb-2">Structured Data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add custom HTML/JSON-LD structured data for enhanced SEO (e.g.,
          schema.org markup)
        </p>
        <Label htmlFor="htmlChunk">HTML Chunk (Optional)</Label>
        <div data-color-mode="light">
          <MDEditor
            value={seoMeta.htmlChunk || ""}
            onChange={(value) =>
              formik.setFieldValue("seoMeta.htmlChunk", value || "")
            }
            preview="edit"
            height={300}
            style={{ borderRadius: "0.5rem" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          You can add JSON-LD, microdata, or any other structured data markup
          here
        </p>
        {((formik.touched.seoMeta as any)?.htmlChunk &&
          (formik.errors.seoMeta as any)?.htmlChunk) ||
        (formik.submitCount > 0 &&
          (formik.errors.seoMeta as any)?.htmlChunk) ? (
          <p className="text-sm text-destructive">
            {(formik.errors.seoMeta as any).htmlChunk}
          </p>
        ) : null}
      </div>
    </div>
  );
}
