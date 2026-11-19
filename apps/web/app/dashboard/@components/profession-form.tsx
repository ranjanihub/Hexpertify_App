"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FAQSection } from "./faq-section";
import { SeoSection } from "./seo-section";

interface FAQItem {
  question: string;
  answer: string;
}

interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

interface ProfessionFormData {
  name: string;
  identifier: string;
  imageUrl: string;
  faqs: FAQItem[];
  seoMeta: SeoMeta;
}

const initialFormData: ProfessionFormData = {
  name: "",
  identifier: "",
  imageUrl: "",
  faqs: [{ question: "", answer: "" }],
  seoMeta: {
    metaTitle: "",
    metaDescription: "",
    metaKeywords: [],
  },
};

export function ProfessionForm() {
  const [formData, setFormData] = useState<ProfessionFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleBasicFieldChange = (
    field: keyof Omit<ProfessionFormData, "faqs" | "seoMeta">,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFaqChange = (
    index: number,
    field: keyof FAQItem,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) =>
        i === index ? { ...faq, [field]: value } : faq,
      ),
    }));
  };

  const handleAddFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: "", answer: "" }],
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const handleSeoChange = (field: keyof SeoMeta, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      seoMeta: {
        ...prev.seoMeta,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.identifier.trim()) {
        setSubmitMessage("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      // Here you would typically send the data to your API
      setSubmitMessage("Profession saved successfully!");

      // Reset form after successful submission
      setTimeout(() => {
        setFormData(initialFormData);
        setSubmitMessage("");
      }, 2000);
    } catch (error) {
      setSubmitMessage("Error saving profession. Please try again.");
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the profession details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Profession Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Software Engineer"
                  value={formData.name}
                  onChange={(e) =>
                    handleBasicFieldChange("name", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier">
                  Identifier <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="identifier"
                  placeholder="e.g., software-engineer"
                  value={formData.identifier}
                  onChange={(e) =>
                    handleBasicFieldChange("identifier", e.target.value)
                  }
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Used for URLs and unique identification
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    handleBasicFieldChange("imageUrl", e.target.value)
                  }
                />
                {formData.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={formData.imageUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="h-32 w-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Add FAQs related to this profession
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FAQSection
                faqs={formData.faqs}
                onFaqChange={handleFaqChange}
                onAddFaq={handleAddFaq}
                onRemoveFaq={handleRemoveFaq}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Metadata</CardTitle>
              <CardDescription>Optimize for search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SeoSection
                seoMeta={formData.seoMeta}
                onSeoChange={handleSeoChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Saving..." : "Save Profession"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormData(initialFormData)}
            >
              Reset
            </Button>
          </div>
          {submitMessage && (
            <p
              className={`mt-4 text-sm ${submitMessage.includes("Error") ? "text-destructive" : "text-green-600"}`}
            >
              {submitMessage}
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
