"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { FAQFormSection } from "./faq-form-section";
import { SeoFormSection } from "./seo-form-section";
import { toast } from "sonner";
import {
  createProfession,
  getProfessionById,
  updateProfession,
} from "../professions/actions";

interface FAQItem {
  question: string;
  answer: string;
}

interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  htmlChunk?: string;
}

interface ProfessionFormData {
  name: string;
  identifier: string;
  imageUrl: string;
  imageAltText: string;
  bannerUrl: string;
  bannerTitle: string;
  faqs: FAQItem[];
  seoMeta: SeoMeta;
}

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("Profession name is required")
    .min(2, "Name must be at least 2 characters"),
  identifier: Yup.string()
    .required("Identifier is required")
    .min(2, "Identifier must be at least 2 characters")
    .matches(
      /^[a-z0-9-]+$/,
      "Identifier can only contain lowercase letters, numbers, and hyphens",
    ),
  imageUrl: Yup.string()
    .url("Must be a valid URL")
    .required("Image URL is required"),
  imageAltText: Yup.string().required("Image alt text is required"),
  bannerUrl: Yup.string().url("Must be a valid URL").nullable(),
  bannerTitle: Yup.string().nullable(),
  faqs: Yup.array().of(
    Yup.object()
      .shape({
        question: Yup.string().required("Question is required"),
        answer: Yup.string().required("Answer is required"),
      })
      .required("FAQ item is required"),
  ),
  seoMeta: Yup.object().shape({
    metaTitle: Yup.string()
      .required("Meta title is required")
      .max(60, "Meta title must be 60 characters or less"),
    metaDescription: Yup.string()
      .required("Meta description is required")
      .max(160, "Meta description must be 160 characters or less"),
    metaKeywords: Yup.array()
      .of(Yup.string())
      .required("Meta keywords are required"),
    ogTitle: Yup.string()
      .required("OG title is required")
      .max(60, "OG title must be 60 characters or less"),
    ogDescription: Yup.string()
      .required("OG description is required")
      .max(200, "OG description must be 200 characters or less"),
    ogImage: Yup.string()
      .url("Must be a valid URL")
      .required("OG image URL is required"),
    ogImageAlt: Yup.string().required("OG image alt text is required"),
  }),
});

interface ProfessionFormPageProps {
  mode: "create" | "edit";
  professionId?: string;
}

export function ProfessionFormPage({
  mode,
  professionId,
}: ProfessionFormPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(mode === "edit");

  const initialValues: ProfessionFormData = {
    name: "",
    identifier: "",
    imageUrl: "",
    imageAltText: "",
    bannerUrl: "",
    bannerTitle: "",
    faqs: [{ question: "", answer: "" }],
    seoMeta: {
      metaTitle: "",
      metaDescription: "",
      metaKeywords: [],
      ogTitle: "",
      ogDescription: "",
      ogImage: "",
      ogImageAlt: "",
      htmlChunk: "",
    },
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    if (mode === "edit" && professionId) {
      fetchProfession();
    }
  }, [mode, professionId]);

  useEffect(() => {
    if (formik.isSubmitting && Object.keys(formik.errors).length > 0) {
      toast.error("Please fix the errors in the form");
    }
  }, [formik.isSubmitting, formik.errors]);

  const hasBasicInfoErrors =
    (formik.touched.name && formik.errors.name) ||
    (formik.touched.identifier && formik.errors.identifier) ||
    (formik.touched.imageUrl && formik.errors.imageUrl) ||
    (formik.touched.imageAltText && formik.errors.imageAltText) ||
    (formik.submitCount > 0 &&
      (formik.errors.name ||
        formik.errors.identifier ||
        formik.errors.imageUrl ||
        formik.errors.imageAltText));

  const hasFaqErrors =
    (formik.touched.faqs && formik.errors.faqs) ||
    (formik.submitCount > 0 && formik.errors.faqs);

  const hasSeoErrors =
    (formik.touched.seoMeta && formik.errors.seoMeta) ||
    (formik.submitCount > 0 && formik.errors.seoMeta);

  const fetchProfession = async () => {
    try {
      const { success, data } = await getProfessionById(professionId as string);

      if (!success || !data) throw new Error("Failed to fetch profession");

      const mapped: ProfessionFormData = {
        name: data.name ?? "",
        identifier: data.identifier ?? "",
        imageUrl: data.imageUrl ?? "",
        imageAltText: data.imageAltText ?? "",
        bannerUrl: data.bannerUrl ?? "",
        bannerTitle: data.bannerTitle ?? "",
        faqs:
          Array.isArray(data.faqs) && data.faqs.length > 0
            ? data.faqs.map((f: any) => ({
                question: f.question ?? "",
                answer: f.answer ?? "",
              }))
            : [{ question: "", answer: "" }],
        seoMeta: {
          metaTitle: data.seoMeta?.metaTitle ?? "",
          metaDescription: data.seoMeta?.metaDescription ?? "",
          metaKeywords: Array.isArray(data.seoMeta?.metaKeywords)
            ? data.seoMeta.metaKeywords
            : [],
          ogTitle: data.seoMeta?.ogTitle ?? "",
          ogDescription: data.seoMeta?.ogDescription ?? "",
          ogImage: data.seoMeta?.ogImage ?? "",
          ogImageAlt: data.seoMeta?.ogImageAlt ?? "",
          htmlChunk: data.seoMeta?.htmlChunk ?? "",
        },
      };

      formik.setValues(mapped);
    } catch (error) {
      toast.error("Failed to load profession");
    } finally {
      setIsLoading(false);
    }
  };

  async function handleSubmit(values: ProfessionFormData) {
    try {
      if (mode === "edit" && !professionId) {
        throw new Error("Profession ID is required");
      }

      const result =
        mode === "create"
          ? await createProfession(values)
          : await updateProfession(professionId as string, values);

      const { success } = result;

      if (!success) throw new Error("Failed to save profession");

      toast.success(
        `Profession ${mode === "create" ? "created" : "updated"} successfully`,
      );

      router.push("/dashboard/professions");
    } catch (error) {
      toast.error(
        `Failed to ${mode === "create" ? "create" : "update"} profession`,
      );
    }
  }

  if (isLoading) {
    return (
      <main className="bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background p-8">
      <div className=" mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/professions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {mode === "create" ? "Create" : "Edit"} Profession
            </h1>
            <p className="text-muted-foreground mt-1">
              {mode === "create"
                ? "Add a new profession to your catalog"
                : "Update profession details"}
            </p>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="relative">
                Basic Info
                {hasBasicInfoErrors && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="faqs" className="relative">
                FAQs
                {hasFaqErrors && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="seo" className="relative">
                SEO
                {hasSeoErrors && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the profession details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Profession Name{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., Software Engineer"
                      {...formik.getFieldProps("name")}
                      className={
                        (formik.touched.name && formik.errors.name) ||
                        (formik.submitCount > 0 && formik.errors.name)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {((formik.touched.name && formik.errors.name) ||
                      (formik.submitCount > 0 && formik.errors.name)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier">
                      Identifier <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="identifier"
                      placeholder="e.g., software-engineer"
                      {...formik.getFieldProps("identifier")}
                      className={
                        (formik.touched.identifier &&
                          formik.errors.identifier) ||
                        (formik.submitCount > 0 && formik.errors.identifier)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      Used for URLs and unique identification
                    </p>
                    {((formik.touched.identifier && formik.errors.identifier) ||
                      (formik.submitCount > 0 && formik.errors.identifier)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.identifier}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">
                      Image URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://example.com/image.jpg"
                      {...formik.getFieldProps("imageUrl")}
                      className={
                        (formik.touched.imageUrl && formik.errors.imageUrl) ||
                        (formik.submitCount > 0 && formik.errors.imageUrl)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {((formik.touched.imageUrl && formik.errors.imageUrl) ||
                      (formik.submitCount > 0 && formik.errors.imageUrl)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.imageUrl}
                      </p>
                    )}
                    {formik.values.imageUrl && (
                      <div className="mt-2">
                        <img
                          src={formik.values.imageUrl || "/placeholder.svg"}
                          alt="Preview"
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imageAltText">
                      Image Alt Text <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="imageAltText"
                      placeholder="Description of the image"
                      {...formik.getFieldProps("imageAltText")}
                      className={
                        (formik.touched.imageAltText &&
                          formik.errors.imageAltText) ||
                        (formik.submitCount > 0 && formik.errors.imageAltText)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {((formik.touched.imageAltText &&
                      formik.errors.imageAltText) ||
                      (formik.submitCount > 0 &&
                        formik.errors.imageAltText)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.imageAltText}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerUrl">Banner URL</Label>
                    <Input
                      id="bannerUrl"
                      placeholder="https://example.com/banner.jpg"
                      {...formik.getFieldProps("bannerUrl")}
                      className={
                        (formik.touched.bannerUrl && formik.errors.bannerUrl) ||
                        (formik.submitCount > 0 && formik.errors.bannerUrl)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {((formik.touched.bannerUrl && formik.errors.bannerUrl) ||
                      (formik.submitCount > 0 && formik.errors.bannerUrl)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.bannerUrl}
                      </p>
                    )}
                    {formik.values.bannerUrl && (
                      <div className="mt-2">
                        <img
                          src={formik.values.bannerUrl || "/placeholder.svg"}
                          alt="Banner Preview"
                          className="h-32 w-full object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bannerTitle">Banner Title</Label>
                    <Input
                      id="bannerTitle"
                      placeholder="e.g., Find trusted software engineers"
                      {...formik.getFieldProps("bannerTitle")}
                      className={
                        (formik.touched.bannerTitle &&
                          formik.errors.bannerTitle) ||
                        (formik.submitCount > 0 && formik.errors.bannerTitle)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {((formik.touched.bannerTitle &&
                      formik.errors.bannerTitle) ||
                      (formik.submitCount > 0 &&
                        formik.errors.bannerTitle)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.bannerTitle}
                      </p>
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
                  <FAQFormSection formik={formik} />
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
                  <SeoFormSection formik={formik} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="flex-1 !text-white"
                >
                  {formik.isSubmitting
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Profession"
                      : "Update Profession"}
                </Button>
                <Link href="/professions" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
}
