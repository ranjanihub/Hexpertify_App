"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormik, type FormikTouched } from "formik";
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { FAQFormSection } from "./faq-form-section";
import { SeoFormSection } from "./seo-form-section";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  createConsultant,
  getConsultant,
  updateConsultant,
  listProfessions,
} from "../consultants/actions";

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

interface Review {
  id?: string;
  clientName: string;
  clientTitle: string;
  rating: number;
  comment: string;
  reviewImages?: { url: string; alt: string }[];
  createdAt?: string;
}

interface Service {
  id?: string;
  name: string;
  price: number;
  duration: number;
  sessionCount: number;
  platform: string;
}

interface ConsultantFormData {
  name: string;
  notificationTitle: string;
  sequence: string;
  identifier: string;
  email: string;
  experience: number;
  clientCount: number;
  photoUrl: string;
  photoAltText: string;
  youtubeUrl: string;
  certificateImages: { url: string; alt: string }[];
  qualifications: string[];
  specialties: string[];
  languages: string[];
  about: string;
  isCertified: boolean;
  professionId: string;
  faqs: FAQItem[];
  seoMeta: SeoMeta;
  reviews: Review[];
  services: Service[];
}

const getTouchedArray = <T,>(value: boolean | T[] | undefined): T[] =>
  Array.isArray(value) ? value : [];

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("Consultant name is required")
    .min(2, "Name must be at least 2 characters"),
  notificationTitle: Yup.string().max(
    120,
    "Notification title must be 120 characters or less",
  ),
  identifier: Yup.string()
    .required("Identifier is required")
    .min(2, "Identifier must be at least 2 characters")
    .matches(
      /^[a-z0-9-]+$/,
      "Identifier can only contain lowercase letters, numbers, and hyphens",
    ),
  email: Yup.string()
    .email("Must be a valid email")
    .required("Email is required"),
  experience: Yup.number()
    .min(0, "Experience must be 0 or more")
    .required("Experience is required"),
  clientCount: Yup.number()
    .min(0, "Client count must be 0 or more")
    .required("Client count is required"),
  photoUrl: Yup.string()
    .url("Must be a valid URL")
    .required("Photo URL is required"),
  photoAltText: Yup.string().required("Photo alt text is required"),
  youtubeUrl: Yup.string().url("Must be a valid URL"),
  professionId: Yup.string().required("Profession is required"),
  about: Yup.string()
    .required("About is required")
    .max(1000, "About must be 1000 characters or less"),
  isCertified: Yup.boolean().default(false),
  certificateImages: Yup.array().of(
    Yup.object().shape({
      url: Yup.string().url("Must be a valid URL").required("URL is required"),
      alt: Yup.string().required("Alt text is required"),
    }),
  ),
  qualifications: Yup.array().of(
    Yup.string().required("Qualification is required"),
  ),
  specialties: Yup.array().of(Yup.string().required("Specialty is required")),
  languages: Yup.array().of(Yup.string().required("Language is required")),
  faqs: Yup.array().of(
    Yup.object().shape({
      question: Yup.string().required("Question is required"),
      answer: Yup.string().required("Answer is required"),
    }),
  ),
  seoMeta: Yup.object().shape({
    metaTitle: Yup.string()
      .required("Meta title is required")
      .max(60, "Meta title must be 60 characters or less"),
    metaDescription: Yup.string()
      .required("Meta description is required")
      .max(160, "Meta description must be 160 characters or less"),
    metaKeywords: Yup.array().of(Yup.string()),
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
  reviews: Yup.array()
    // .min(1, "At least one review is required")
    .of(
      Yup.object().shape({
        clientName: Yup.string().required("Client name is required"),
        clientTitle: Yup.string().required("Client title is required"),
        rating: Yup.number()
          .min(1, "Rating must be at least 1")
          .max(5, "Rating must be at most 5")
          .required("Rating is required"),
        comment: Yup.string()
          .required("Comment is required")
          .min(10, "Comment must be at least 10 characters"),
        reviewImages: Yup.array()
          .of(
            Yup.object().shape({
              url: Yup.string()
                .url("Must be a valid URL")
                .required("URL is required"),
              alt: Yup.string().optional(),
            }),
          )
          .optional(),
      }),
    ),
  services: Yup.array()
    .min(1, "At least one service is required")
    .of(
      Yup.object().shape({
        name: Yup.string().required("Service name is required"),
        price: Yup.number()
          .min(0, "Price must be 0 or more")
          .required("Price is required"),
        duration: Yup.number()
          .min(1, "Duration must be at least 1 minute")
          .required("Duration is required"),
        sessionCount: Yup.number()
          .min(1, "Session count must be at least 1")
          .default(1),
        platform: Yup.string().required("Platform is required"),
      }),
    ),
});

interface ConsultantFormPageProps {
  mode: "create" | "edit";
  consultantId?: string;
}

export function ConsultantFormPage({
  mode,
  consultantId,
}: ConsultantFormPageProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [professions, setProfessions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const initialValues: ConsultantFormData = {
    name: "",
    notificationTitle: "",
    identifier: "",
    email: "",
    sequence: "",
    experience: 0,
    clientCount: 0,
    isCertified: false,
    photoUrl: "",
    photoAltText: "",
    youtubeUrl: "",
    certificateImages: [],
    qualifications: [""],
    specialties: [""],
    languages: [""],
    about: "",
    professionId: "",
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
    reviews: [],
    services: [],
  };

  const formik = useFormik({
    initialValues,
    validationSchema,
    onSubmit: handleSubmit,
  });

  useEffect(() => {
    fetchProfessions();
    if (mode === "edit" && consultantId) {
      fetchConsultant();
    }
  }, [mode, consultantId]);

  const fetchProfessions = async () => {
    try {
      const result = await listProfessions();
      if (result.success) {
        setProfessions((result as any).data);
      } else {
        console.error("Failed to load professions:", (result as any).error);
      }
    } catch (error) {
      console.error("Failed to load professions:", error);
    }
  };

  const fetchConsultant = async () => {
    try {
      if (!consultantId) return;

      const result = await getConsultant(consultantId);

      if (result.success) {
        const data = (result as any).data;

        // Transform the data to match form structure - explicitly map only form fields
        const formValues = {
          name: data.name || "",
          notificationTitle: data.notificationTitle || "",
          sequence: data.sequence || "",
          identifier: data.identifier || "",
          email: data.email || "",
          experience: data.experience || 0,
          clientCount: data.clientCount || 0,
          photoUrl: data.photoUrl || "",
          photoAltText: data.photoAltText || "",
          youtubeUrl: data.youtubeUrl || "",
          about: data.about || "",
          isCertified: data.isCertified || false,
          professionId: data.professionId || "",
          certificateImages:
            data.certificateUrls && data.certificateUrls.length > 0
              ? data.certificateUrls.map((url: string, index: number) => ({
                  url,
                  alt: data.certificateAltTexts?.[index] || "",
                }))
              : [{ url: "", alt: "" }],
          qualifications:
            data.qualifications && data.qualifications.length > 0
              ? data.qualifications
              : [""],
          specialties:
            data.specialties && data.specialties.length > 0
              ? data.specialties
              : [""],
          languages:
            data.languages && data.languages.length > 0 ? data.languages : [""],
          faqs:
            data.faqs && data.faqs.length > 0
              ? data.faqs
              : [{ question: "", answer: "" }],
          seoMeta: data.seoMeta
            ? {
                metaTitle: data.seoMeta.metaTitle || "",
                metaDescription: data.seoMeta.metaDescription || "",
                metaKeywords: data.seoMeta.metaKeywords || [],
                ogTitle: data.seoMeta.ogTitle || "",
                ogDescription: data.seoMeta.ogDescription || "",
                ogImage: data.seoMeta.ogImage || "",
                ogImageAlt: data.seoMeta.ogImageAlt || "",
                htmlChunk: data.seoMeta.htmlChunk || "",
              }
            : {
                metaTitle: "",
                metaDescription: "",
                metaKeywords: [],
                ogTitle: "",
                ogDescription: "",
                ogImage: "",
                ogImageAlt: "",
                htmlChunk: "",
              },
          reviews:
            data.reviews && data.reviews.length > 0
              ? data.reviews.map((r: any) => ({
                  id: r.id,
                  clientName: r.clientName || "",
                  clientTitle: r.clientTitle || "",
                  rating: r.rating || 5,
                  comment: r.comment || "",
                  reviewImages:
                    r.imageUrls && r.imageUrls.length > 0
                      ? r.imageUrls.map((url: string, idx: number) => ({
                          url,
                          alt: r.imageAltTexts?.[idx] || "",
                        }))
                      : [],
                  createdAt: r.createdAt,
                }))
              : [],
          services:
            data.services && data.services.length > 0
              ? data.services.map((s: any) => ({
                  id: s.id,
                  name: s.name || "",
                  price: s.price || 0,
                  duration: s.duration || 60,
                  sessionCount: s.sessionCount || 1,
                  platform: s.platform || "G-Meet",
                }))
              : [
                  {
                    name: "",
                    price: 0,
                    duration: 60,
                    sessionCount: 1,
                    platform: "G-Meet",
                  },
                ],
        };

        formik.setValues(formValues);
      } else {
        toast.error((result as any).error || "Failed to load consultant");
      }
    } catch (error) {
      console.error("Error fetching consultant:", error);
      toast.error("Failed to load consultant");
    } finally {
      setIsLoading(false);
    }
  };

  // Debug: Log errors when trying to submit
  useEffect(() => {
    if (formik.isSubmitting && Object.keys(formik.errors).length > 0) {
      console.error("Form validation errors:", formik.errors);
      toast.error("Please fix the errors in the form");
    }
  }, [formik.isSubmitting, formik.errors]);

  async function handleSubmit(values: ConsultantFormData) {
    try {
      // Clean up empty values
      const cleanedValues = {
        ...values,
        notificationTitle: values.notificationTitle.trim(),
        certificateImages: values.certificateImages.filter(
          (img) => img.url.trim() !== "",
        ),
        qualifications: values.qualifications.filter((q) => q.trim() !== ""),
        specialties: values.specialties.filter((s) => s.trim() !== ""),
        languages: values.languages.filter((l) => l.trim() !== ""),
        // Filter out empty reviews and clean up review images
        reviews: values.reviews
          .filter(
            (review) =>
              review.clientName.trim() !== "" && review.comment.trim() !== "",
          )
          .map((review) => ({
            ...review,
            reviewImages: review.reviewImages
              ? review.reviewImages.filter((img) => img.url.trim() !== "")
              : [],
          })),
        // Only send seoMeta if it has meaningful content
        seoMeta:
          values.seoMeta.metaTitle.trim() ||
          values.seoMeta.metaDescription.trim()
            ? values.seoMeta
            : undefined,
      };

      let result;
      if (mode === "create") {
        result = await createConsultant(cleanedValues as any);
      } else if (consultantId) {
        result = await updateConsultant(consultantId, cleanedValues as any);
      }

      if (result?.success) {
        toast.success(
          `Consultant ${mode === "create" ? "created" : "updated"} successfully`,
        );
        router.push("/dashboard/consultants");
      } else {
        toast.error(
          (result as any)?.error ||
            `Failed to ${mode === "create" ? "create" : "update"} consultant`,
        );
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(
        `Failed to ${mode === "create" ? "create" : "update"} consultant`,
      );
    }
  }

  const addArrayField = (fieldName: keyof ConsultantFormData) => {
    const currentValues = formik.values[fieldName] as string[];
    formik.setFieldValue(fieldName, [...currentValues, ""]);
  };

  const removeArrayField = (
    fieldName: keyof ConsultantFormData,
    index: number,
  ) => {
    const currentValues = formik.values[fieldName] as string[];
    formik.setFieldValue(
      fieldName,
      currentValues.filter((_, i) => i !== index),
    );
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background p-8">
      <div className="mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/consultants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {mode === "create" ? "Create" : "Edit"} Consultant
            </h1>
            <p className="text-muted-foreground mt-1">
              {mode === "create"
                ? "Add a new consultant to your platform"
                : "Update consultant details"}
            </p>
          </div>
        </div>

        <form onSubmit={formik.handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
              <TabsTrigger value="basic" className="relative">
                Basic Info
                {(formik.errors.name ||
                  formik.errors.notificationTitle ||
                  formik.errors.email ||
                  formik.errors.identifier ||
                  formik.errors.professionId ||
                  formik.errors.photoUrl ||
                  formik.errors.about) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="details" className="relative">
                Details
                {(formik.errors.experience ||
                  formik.errors.clientCount ||
                  formik.errors.youtubeUrl) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="credentials" className="relative">
                Credentials
                {(formik.errors.certificateImages ||
                  formik.errors.qualifications) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="services" className="relative">
                Services
                {formik.errors.services && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="relative">
                Reviews
                {formik.errors.reviews && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="faqs" className="relative">
                FAQs
                {formik.errors.faqs && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
              <TabsTrigger value="seo" className="relative">
                SEO
                {formik.errors.seoMeta && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Enter the consultant's basic details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g., John Doe"
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
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        {...formik.getFieldProps("email")}
                        className={
                          (formik.touched.email && formik.errors.email) ||
                          (formik.submitCount > 0 && formik.errors.email)
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {((formik.touched.email && formik.errors.email) ||
                        (formik.submitCount > 0 && formik.errors.email)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="identifier">
                        Identifier <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="identifier"
                        placeholder="e.g., john-doe"
                        {...formik.getFieldProps("identifier")}
                        className={
                          (formik.touched.identifier &&
                            formik.errors.identifier) ||
                          (formik.submitCount > 0 && formik.errors.identifier)
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {((formik.touched.identifier &&
                        formik.errors.identifier) ||
                        (formik.submitCount > 0 &&
                          formik.errors.identifier)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.identifier}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sequence">Sequence</Label>
                      <Input
                        id="sequence"
                        placeholder="e.g., 1"
                        {...formik.getFieldProps("sequence")}
                        className={
                          (formik.touched.sequence && formik.errors.sequence) ||
                          (formik.submitCount > 0 && formik.errors.sequence)
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {((formik.touched.sequence && formik.errors.sequence) ||
                        (formik.submitCount > 0 && formik.errors.sequence)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.sequence}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notificationTitle">
                        Notification Title
                      </Label>
                      <Input
                        id="notificationTitle"
                        placeholder="Title used for notifications"
                        {...formik.getFieldProps("notificationTitle")}
                        className={
                          (formik.touched.notificationTitle &&
                            formik.errors.notificationTitle) ||
                          (formik.submitCount > 0 &&
                            formik.errors.notificationTitle)
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {((formik.touched.notificationTitle &&
                        formik.errors.notificationTitle) ||
                        (formik.submitCount > 0 &&
                          formik.errors.notificationTitle)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.notificationTitle}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="professionId">
                        Profession <span className="text-destructive">*</span>
                      </Label>
                      <select
                        id="professionId"
                        {...formik.getFieldProps("professionId")}
                        className={`w-full px-3 py-2 border border-input rounded-md bg-background ${
                          (formik.touched.professionId &&
                            formik.errors.professionId) ||
                          (formik.submitCount > 0 && formik.errors.professionId)
                            ? "border-destructive"
                            : ""
                        }`}
                      >
                        <option value="">Select a profession</option>
                        {professions.map((prof) => (
                          <option key={prof.id} value={prof.id}>
                            {prof.name}
                          </option>
                        ))}
                      </select>
                      {((formik.touched.professionId &&
                        formik.errors.professionId) ||
                        (formik.submitCount > 0 &&
                          formik.errors.professionId)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.professionId}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photoUrl">
                      Photo URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="photoUrl"
                      placeholder="https://example.com/photo.jpg"
                      {...formik.getFieldProps("photoUrl")}
                      className={
                        formik.touched.photoUrl && formik.errors.photoUrl
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {formik.touched.photoUrl && formik.errors.photoUrl && (
                      <p className="text-sm text-destructive">
                        {formik.errors.photoUrl}
                      </p>
                    )}
                    <div className="mt-2">
                      <Label htmlFor="photoAltText">
                        Photo Alt Text{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="photoAltText"
                        placeholder="Description of the photo"
                        {...formik.getFieldProps("photoAltText")}
                        className={
                          formik.touched.photoAltText &&
                          formik.errors.photoAltText
                            ? "border-destructive"
                            : ""
                        }
                      />
                    </div>
                    {formik.values.photoUrl && (
                      <div className="mt-2">
                        <img
                          src={formik.values.photoUrl || "/placeholder.svg"}
                          alt={formik.values.photoAltText || "Preview"}
                          className="h-32 w-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="about">
                      About <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="about"
                      placeholder="Tell us about this consultant..."
                      {...formik.getFieldProps("about")}
                      className={
                        (formik.touched.about && formik.errors.about) ||
                        (formik.submitCount > 0 && formik.errors.about)
                          ? "border-destructive"
                          : ""
                      }
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      {formik.values.about.length}/1000 characters
                    </p>
                    {((formik.touched.about && formik.errors.about) ||
                      (formik.submitCount > 0 && formik.errors.about)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.about}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Details</CardTitle>
                  <CardDescription>
                    Add experience, languages, and other details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">
                        Years of Experience{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="experience"
                        type="number"
                        min="0"
                        {...formik.getFieldProps("experience")}
                        className={
                          (formik.touched.experience &&
                            formik.errors.experience) ||
                          (formik.submitCount > 0 && formik.errors.experience)
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {((formik.touched.experience &&
                        formik.errors.experience) ||
                        (formik.submitCount > 0 &&
                          formik.errors.experience)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.experience}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientCount">
                        Clients Served{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="clientCount"
                        type="number"
                        min="0"
                        {...formik.getFieldProps("clientCount")}
                        className={
                          (formik.touched.clientCount &&
                            formik.errors.clientCount) ||
                          (formik.submitCount > 0 && formik.errors.clientCount)
                            ? "border-destructive"
                            : ""
                        }
                      />
                      {((formik.touched.clientCount &&
                        formik.errors.clientCount) ||
                        (formik.submitCount > 0 &&
                          formik.errors.clientCount)) && (
                        <p className="text-sm text-destructive">
                          {formik.errors.clientCount}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 flex items-end">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isCertified"
                          checked={formik.values.isCertified}
                          onCheckedChange={(checked) =>
                            formik.setFieldValue("isCertified", checked)
                          }
                        />
                        <Label
                          htmlFor="isCertified"
                          className="font-normal cursor-pointer"
                        >
                          Is Certified
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube URL </Label>
                    <Input
                      id="youtubeUrl"
                      placeholder="https://youtube.com/..."
                      {...formik.getFieldProps("youtubeUrl")}
                      className={
                        (formik.touched.youtubeUrl &&
                          formik.errors.youtubeUrl) ||
                        (formik.submitCount > 0 && formik.errors.youtubeUrl)
                          ? "border-destructive"
                          : ""
                      }
                    />
                    {((formik.touched.youtubeUrl && formik.errors.youtubeUrl) ||
                      (formik.submitCount > 0 && formik.errors.youtubeUrl)) && (
                      <p className="text-sm text-destructive">
                        {formik.errors.youtubeUrl}
                      </p>
                    )}
                  </div>

                  {/* Languages */}
                  <div className="space-y-2">
                    <Label>
                      Languages <span className="text-destructive">*</span>
                    </Label>
                    {formik.values.languages.map((language, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="e.g., English"
                          value={language}
                          onChange={(e) => {
                            const newLanguages = [...formik.values.languages];
                            newLanguages[index] = e.target.value;
                            formik.setFieldValue("languages", newLanguages);
                          }}
                          className={
                            (getTouchedArray<boolean>(
                              formik.touched.languages,
                            )[index] &&
                              (formik.errors.languages?.[index] as any)) ||
                            (formik.submitCount > 0 &&
                              (formik.errors.languages?.[index] as any))
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {((getTouchedArray<boolean>(
                          formik.touched.languages,
                        )[index] &&
                          formik.errors.languages?.[index]) ||
                          (formik.submitCount > 0 &&
                            formik.errors.languages?.[index])) && (
                          <p className="text-sm text-destructive">
                            {formik.errors.languages[index]}
                          </p>
                        )}
                        {formik.values.languages.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeArrayField("languages", index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayField("languages")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Language
                    </Button>
                  </div>

                  {/* Specialties */}
                  <div className="space-y-2">
                    <Label>
                      Specialties <span className="text-destructive">*</span>
                    </Label>
                    {formik.values.specialties.map((specialty, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="e.g., Web Development"
                          value={specialty}
                          onChange={(e) => {
                            const newSpecialties = [
                              ...formik.values.specialties,
                            ];
                            newSpecialties[index] = e.target.value;
                            formik.setFieldValue("specialties", newSpecialties);
                          }}
                          className={
                            (getTouchedArray<boolean>(
                              formik.touched.specialties,
                            )[index] &&
                              (formik.errors.specialties?.[index] as any)) ||
                            (formik.submitCount > 0 &&
                              (formik.errors.specialties?.[index] as any))
                              ? "border-destructive"
                              : ""
                          }
                        />
                        {((getTouchedArray<boolean>(
                          formik.touched.specialties,
                        )[index] &&
                          formik.errors.specialties?.[index]) ||
                          (formik.submitCount > 0 &&
                            formik.errors.specialties?.[index])) && (
                          <p className="text-sm text-destructive">
                            {formik.errors.specialties[index]}
                          </p>
                        )}
                        {formik.values.specialties.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeArrayField("specialties", index)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayField("specialties")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Specialty
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credentials Tab */}
            <TabsContent value="credentials" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Credentials</CardTitle>
                  <CardDescription>
                    Add qualifications and certificates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Qualifications */}
                  <div className="space-y-2">
                    <Label>
                      Qualifications <span className="text-destructive">*</span>
                    </Label>
                    {formik.values.qualifications.map(
                      (qualification, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="e.g., Bachelor's in Computer Science"
                            value={qualification}
                            onChange={(e) => {
                              const newQualifications = [
                                ...formik.values.qualifications,
                              ];
                              newQualifications[index] = e.target.value;
                              formik.setFieldValue(
                                "qualifications",
                                newQualifications,
                              );
                            }}
                            className={
                              (getTouchedArray<boolean>(
                                formik.touched.qualifications,
                              )[index] &&
                                (formik.errors.qualifications?.[
                                  index
                                ] as any)) ||
                              (formik.submitCount > 0 &&
                                (formik.errors.qualifications?.[index] as any))
                                ? "border-destructive"
                                : ""
                            }
                          />
                          {((getTouchedArray<boolean>(
                            formik.touched.qualifications,
                          )[index] &&
                            formik.errors.qualifications?.[index]) ||
                            (formik.submitCount > 0 &&
                              formik.errors.qualifications?.[index])) && (
                            <p className="text-sm text-destructive">
                              {formik.errors.qualifications[index]}
                            </p>
                          )}
                          {formik.values.qualifications.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                removeArrayField("qualifications", index)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ),
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayField("qualifications")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Qualification
                    </Button>
                  </div>

                  {/* Certificates */}
                  <div className="space-y-2">
                    <Label>
                      Certificates <span className="text-destructive">*</span>
                    </Label>
                    {formik.values.certificateImages.map(
                      (certificate, index) => (
                        <div
                          key={index}
                          className="flex gap-2 items-start border p-2 rounded-md"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="https://example.com/certificate.pdf"
                              value={certificate.url}
                              onChange={(e) => {
                                const newCertificates = [
                                  ...formik.values.certificateImages,
                                ];
                                newCertificates[index] = {
                                  ...newCertificates[index],
                                  url: e.target.value,
                                };
                                formik.setFieldValue(
                                  "certificateImages",
                                  newCertificates,
                                );
                              }}
                              className={
                                (formik.touched.certificateImages?.[index]
                                  ?.url &&
                                  (
                                    formik.errors.certificateImages?.[
                                      index
                                    ] as any
                                  )?.url) ||
                                (formik.submitCount > 0 &&
                                  (
                                    formik.errors.certificateImages?.[
                                      index
                                    ] as any
                                  )?.url)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.certificateImages?.[index]?.url &&
                              formik.errors.certificateImages?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.certificateImages?.[index])) && (
                              <p className="text-sm text-destructive">
                                {
                                  (
                                    formik.errors.certificateImages[
                                      index
                                    ] as any
                                  )?.url
                                }
                              </p>
                            )}
                            <Input
                              placeholder="Certificate description (Alt Text)"
                              value={certificate.alt}
                              onChange={(e) => {
                                const newCertificates = [
                                  ...formik.values.certificateImages,
                                ];
                                newCertificates[index] = {
                                  ...newCertificates[index],
                                  alt: e.target.value,
                                };
                                formik.setFieldValue(
                                  "certificateImages",
                                  newCertificates,
                                );
                              }}
                              className={
                                (formik.touched.certificateImages?.[index]
                                  ?.alt &&
                                  (
                                    formik.errors.certificateImages?.[
                                      index
                                    ] as any
                                  )?.alt) ||
                                (formik.submitCount > 0 &&
                                  (
                                    formik.errors.certificateImages?.[
                                      index
                                    ] as any
                                  )?.alt)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.certificateImages?.[index]?.alt &&
                              formik.errors.certificateImages?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.certificateImages?.[index])) && (
                              <p className="text-sm text-destructive">
                                {
                                  (
                                    formik.errors.certificateImages[
                                      index
                                    ] as any
                                  )?.alt
                                }
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newCertificates =
                                formik.values.certificateImages.filter(
                                  (_, i) => i !== index,
                                );
                              formik.setFieldValue(
                                "certificateImages",
                                newCertificates,
                              );
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ),
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        formik.setFieldValue("certificateImages", [
                          ...formik.values.certificateImages,
                          { url: "", alt: "" },
                        ]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Services</CardTitle>
                  <CardDescription>
                    Manage services offered by this consultant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formik.values.services.map((service, index) => (
                    <Card key={index} className="p-4 border">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`services.${index}.name`}>
                              Service Name{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`services.${index}.name`}
                              placeholder="e.g., 1-on-1 Consultation"
                              {...formik.getFieldProps(
                                `services.${index}.name`,
                              )}
                              className={
                                (formik.touched.services?.[index]?.name &&
                                  (formik.errors.services?.[index] as any)
                                    ?.name) ||
                                (formik.submitCount > 0 &&
                                  (formik.errors.services?.[index] as any)
                                    ?.name)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.services?.[index]?.name &&
                              formik.errors.services?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.services?.[index])) && (
                              <p className="text-sm text-destructive">
                                {(formik.errors.services[index] as any)?.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`services.${index}.platform`}>
                              Platform{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <select
                              id={`services.${index}.platform`}
                              {...formik.getFieldProps(
                                `services.${index}.platform`,
                              )}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                              <option value="G-Meet">Google Meet</option>
                              <option value="Zoom">Zoom</option>
                              <option value="Teams">Microsoft Teams</option>
                              <option value="Phone">Phone Call</option>
                              <option value="In-Person">In-Person</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`services.${index}.price`}>
                              Price ($){" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`services.${index}.price`}
                              type="number"
                              min="0"
                              {...formik.getFieldProps(
                                `services.${index}.price`,
                              )}
                              className={
                                (formik.touched.services?.[index]?.price &&
                                  (formik.errors.services?.[index] as any)
                                    ?.price) ||
                                (formik.submitCount > 0 &&
                                  (formik.errors.services?.[index] as any)
                                    ?.price)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.services?.[index]?.price &&
                              formik.errors.services?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.services?.[index])) && (
                              <p className="text-sm text-destructive">
                                {(formik.errors.services[index] as any)?.price}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`services.${index}.duration`}>
                              Duration (mins){" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`services.${index}.duration`}
                              type="number"
                              min="1"
                              {...formik.getFieldProps(
                                `services.${index}.duration`,
                              )}
                              className={
                                (formik.touched.services?.[index]?.duration &&
                                  (formik.errors.services?.[index] as any)
                                    ?.duration) ||
                                (formik.submitCount > 0 &&
                                  (formik.errors.services?.[index] as any)
                                    ?.duration)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.services?.[index]?.duration &&
                              formik.errors.services?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.services?.[index])) && (
                              <p className="text-sm text-destructive">
                                {
                                  (formik.errors.services[index] as any)
                                    ?.duration
                                }
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`services.${index}.sessionCount`}>
                              Sessions{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`services.${index}.sessionCount`}
                              type="number"
                              min="1"
                              {...formik.getFieldProps(
                                `services.${index}.sessionCount`,
                              )}
                              className={
                                (formik.touched.services?.[index]
                                  ?.sessionCount &&
                                  (formik.errors.services?.[index] as any)
                                    ?.sessionCount) ||
                                (formik.submitCount > 0 &&
                                  (formik.errors.services?.[index] as any)
                                    ?.sessionCount)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.services?.[index]?.sessionCount &&
                              formik.errors.services?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.services?.[index])) && (
                              <p className="text-sm text-destructive">
                                {
                                  (formik.errors.services[index] as any)
                                    ?.sessionCount
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        {formik.values.services.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newServices = formik.values.services.filter(
                                (_, i) => i !== index,
                              );
                              formik.setFieldValue("services", newServices);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Service
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      formik.setFieldValue("services", [
                        ...formik.values.services,
                        {
                          name: "",
                          price: 0,
                          duration: 60,
                          sessionCount: 1,
                          platform: "G-Meet",
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Client Reviews</CardTitle>
                  <CardDescription>
                    Add and manage client reviews and testimonials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formik.values.reviews.map((review, index) => (
                    <Card key={index} className="p-4 border">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`reviews.${index}.clientName`}>
                              Client Name{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`reviews.${index}.clientName`}
                              placeholder="e.g., Jane Smith"
                              value={review.clientName}
                              onChange={(e) => {
                                const newReviews = [...formik.values.reviews];
                                newReviews[index].clientName = e.target.value;
                                formik.setFieldValue("reviews", newReviews);
                              }}
                              className={
                                (formik.touched.reviews?.[index]?.clientName &&
                                  (formik.errors.reviews?.[index] as any)
                                    ?.clientName) ||
                                (formik.submitCount > 0 &&
                                  (formik.errors.reviews?.[index] as any)
                                    ?.clientName)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.reviews?.[index]?.clientName &&
                              formik.errors.reviews?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.reviews?.[index])) && (
                              <p className="text-sm text-destructive">
                                {
                                  (formik.errors.reviews[index] as any)
                                    ?.clientName
                                }
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`reviews.${index}.clientTitle`}>
                              Client Title{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`reviews.${index}.clientTitle`}
                              placeholder="e.g., CEO at Tech Company"
                              value={review.clientTitle}
                              onChange={(e) => {
                                const newReviews = [...formik.values.reviews];
                                newReviews[index].clientTitle = e.target.value;
                                formik.setFieldValue("reviews", newReviews);
                              }}
                              className={
                                (formik.touched.reviews?.[index]?.clientTitle &&
                                  (formik.errors.reviews?.[index] as any)
                                    ?.clientTitle) ||
                                (formik.submitCount > 0 &&
                                  (formik.errors.reviews?.[index] as any)
                                    ?.clientTitle)
                                  ? "border-destructive"
                                  : ""
                              }
                            />
                            {((formik.touched.reviews?.[index]?.clientTitle &&
                              formik.errors.reviews?.[index]) ||
                              (formik.submitCount > 0 &&
                                formik.errors.reviews?.[index])) && (
                              <p className="text-sm text-destructive">
                                {
                                  (formik.errors.reviews[index] as any)
                                    ?.clientTitle
                                }
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`reviews.${index}.rating`}>
                              Rating <span className="text-destructive">*</span>
                            </Label>
                            <select
                              id={`reviews.${index}.rating`}
                              value={review.rating}
                              onChange={(e) => {
                                const newReviews = [...formik.values.reviews];
                                newReviews[index].rating = Number.parseInt(
                                  e.target.value,
                                );
                                formik.setFieldValue("reviews", newReviews);
                              }}
                              className="w-full px-3 py-2 border border-input rounded-md bg-background"
                            >
                              <option value={5}>5 Stars - Excellent</option>
                              <option value={4}>4 Stars - Very Good</option>
                              <option value={3}>3 Stars - Good</option>
                              <option value={2}>2 Stars - Fair</option>
                              <option value={1}>1 Star - Poor</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`reviews.${index}.createdAt`}>
                              Review Date
                            </Label>
                            <Input
                              id={`reviews.${index}.createdAt`}
                              type="date"
                              value={
                                review.createdAt
                                  ? new Date(review.createdAt)
                                      .toISOString()
                                      .split("T")[0]
                                  : ""
                              }
                              onChange={(e) => {
                                const newReviews = [...formik.values.reviews];
                                newReviews[index].createdAt = e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : undefined;
                                formik.setFieldValue("reviews", newReviews);
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`reviews.${index}.comment`}>
                            Review Comment{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            id={`reviews.${index}.comment`}
                            placeholder="Write the review comment..."
                            value={review.comment}
                            onChange={(e) => {
                              const newReviews = [...formik.values.reviews];
                              newReviews[index].comment = e.target.value;
                              formik.setFieldValue("reviews", newReviews);
                            }}
                            className={
                              (formik.touched.reviews?.[index]?.comment &&
                                (formik.errors.reviews?.[index] as any)
                                  ?.comment) ||
                              (formik.submitCount > 0 &&
                                (formik.errors.reviews?.[index] as any)
                                  ?.comment)
                                ? "border-destructive"
                                : ""
                            }
                            rows={3}
                          />
                          <p className="text-sm text-muted-foreground">
                            {review.comment.length} characters
                          </p>
                          {((formik.touched.reviews?.[index]?.comment &&
                            formik.errors.reviews?.[index]) ||
                            (formik.submitCount > 0 &&
                              formik.errors.reviews?.[index])) && (
                            <p className="text-sm text-destructive">
                              {(formik.errors.reviews[index] as any)?.comment}
                            </p>
                          )}
                        </div>

                        {/* Review Images */}
                        <div className="space-y-2">
                          <Label>Review Images</Label>
                          <p className="text-sm text-muted-foreground">
                            Add images showcasing the service or results
                          </p>
                          {(review.reviewImages || [{ url: "", alt: "" }]).map(
                            (img, imgIndex) => (
                              <div
                                key={imgIndex}
                                className="space-y-2 border p-2 rounded-md"
                              >
                                <div className="flex gap-2 items-start">
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      placeholder="https://example.com/review-image.jpg"
                                      value={img.url}
                                      onChange={(e) => {
                                        const newReviews = [
                                          ...formik.values.reviews,
                                        ];
                                        if (!newReviews[index].reviewImages) {
                                          newReviews[index].reviewImages = [
                                            { url: "", alt: "" },
                                          ];
                                        }
                                        newReviews[index].reviewImages![
                                          imgIndex
                                        ].url = e.target.value;
                                        formik.setFieldValue(
                                          "reviews",
                                          newReviews,
                                        );
                                      }}
                                      className={
                                        (getTouchedArray<
                                          FormikTouched<{ url: string; alt: string }>
                                        >(
                                          getTouchedArray<FormikTouched<Review>>(
                                            formik.touched.reviews,
                                          )[index]?.reviewImages,
                                        )[imgIndex]?.url &&
                                          (
                                            formik.errors.reviews?.[
                                              index
                                            ] as any
                                          )?.reviewImages?.[imgIndex]?.url) ||
                                        (formik.submitCount > 0 &&
                                          (
                                            formik.errors.reviews?.[
                                              index
                                            ] as any
                                          )?.reviewImages?.[imgIndex]?.url)
                                          ? "border-destructive"
                                          : ""
                                      }
                                    />
                                    {((getTouchedArray<
                                      FormikTouched<{ url: string; alt: string }>
                                    >(
                                      getTouchedArray<FormikTouched<Review>>(
                                        formik.touched.reviews,
                                      )[index]?.reviewImages,
                                    )[imgIndex]?.url &&
                                      (formik.errors.reviews?.[index] as any)
                                        ?.reviewImages?.[imgIndex]?.url) ||
                                      (formik.submitCount > 0 &&
                                        (formik.errors.reviews?.[index] as any)
                                          ?.reviewImages?.[imgIndex]?.url)) && (
                                      <p className="text-sm text-destructive">
                                        {
                                          (
                                            formik.errors.reviews?.[
                                              index
                                            ] as any
                                          )?.reviewImages?.[imgIndex]?.url
                                        }
                                      </p>
                                    )}
                                    <Input
                                      placeholder="Image description (Alt Text)"
                                      value={img.alt}
                                      onChange={(e) => {
                                        const newReviews = [
                                          ...formik.values.reviews,
                                        ];
                                        if (!newReviews[index].reviewImages) {
                                          newReviews[index].reviewImages = [
                                            { url: "", alt: "" },
                                          ];
                                        }
                                        newReviews[index].reviewImages![
                                          imgIndex
                                        ].alt = e.target.value;
                                        formik.setFieldValue(
                                          "reviews",
                                          newReviews,
                                        );
                                      }}
                                      className={
                                        (getTouchedArray<
                                          FormikTouched<{ url: string; alt: string }>
                                        >(
                                          getTouchedArray<FormikTouched<Review>>(
                                            formik.touched.reviews,
                                          )[index]?.reviewImages,
                                        )[imgIndex]?.alt &&
                                          (
                                            formik.errors.reviews?.[
                                              index
                                            ] as any
                                          )?.reviewImages?.[imgIndex]?.alt) ||
                                        (formik.submitCount > 0 &&
                                          (
                                            formik.errors.reviews?.[
                                              index
                                            ] as any
                                          )?.reviewImages?.[imgIndex]?.alt)
                                          ? "border-destructive"
                                          : ""
                                      }
                                    />
                                    {((getTouchedArray<
                                      FormikTouched<{ url: string; alt: string }>
                                    >(
                                      getTouchedArray<FormikTouched<Review>>(
                                        formik.touched.reviews,
                                      )[index]?.reviewImages,
                                    )[imgIndex]?.alt &&
                                      (formik.errors.reviews?.[index] as any)
                                        ?.reviewImages?.[imgIndex]?.alt) ||
                                      (formik.submitCount > 0 &&
                                        (formik.errors.reviews?.[index] as any)
                                          ?.reviewImages?.[imgIndex]?.alt)) && (
                                      <p className="text-sm text-destructive">
                                        {
                                          (
                                            formik.errors.reviews?.[
                                              index
                                            ] as any
                                          )?.reviewImages?.[imgIndex]?.alt
                                        }
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const newReviews = [
                                        ...formik.values.reviews,
                                      ];
                                      newReviews[index].reviewImages =
                                        newReviews[index].reviewImages?.filter(
                                          (_, i) => i !== imgIndex,
                                        ) || [];
                                      formik.setFieldValue(
                                        "reviews",
                                        newReviews,
                                      );
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ),
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newReviews = [...formik.values.reviews];
                              if (!newReviews[index].reviewImages) {
                                newReviews[index].reviewImages = [];
                              }
                              newReviews[index].reviewImages!.push({
                                url: "",
                                alt: "",
                              });
                              formik.setFieldValue("reviews", newReviews);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Image
                          </Button>

                          {/* Image Previews */}
                          {review.reviewImages &&
                            review.reviewImages.some(
                              (img) => img.url.trim() !== "",
                            ) && (
                              <div className="mt-4">
                                <Label className="text-sm">
                                  Image Previews
                                </Label>
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  {review.reviewImages
                                    .filter((img) => img.url.trim() !== "")
                                    .map((img, imgIdx) => (
                                      <div
                                        key={imgIdx}
                                        className="relative group"
                                      >
                                        <img
                                          src={img.url || "/placeholder.svg"}
                                          alt={
                                            img.alt ||
                                            `Review image ${imgIdx + 1}`
                                          }
                                          className="w-full h-24 object-cover rounded-lg border-2 border-border"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                          {img.alt || "No alt text"}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                        </div>

                        {formik.values.reviews.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              const newReviews = formik.values.reviews.filter(
                                (_, i) => i !== index,
                              );
                              formik.setFieldValue("reviews", newReviews);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Review
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      formik.setFieldValue("reviews", [
                        ...formik.values.reviews,
                        {
                          clientName: "",
                          clientTitle: "",
                          rating: 5,
                          comment: "",
                          reviewImages: [],
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Review
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* FAQs Tab */}
            <TabsContent value="faqs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Add FAQs related to this consultant
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
                  className="flex-1 text-white"
                >
                  {formik.isSubmitting
                    ? "Saving..."
                    : mode === "create"
                      ? "Create Consultant"
                      : "Update Consultant"}
                </Button>
                <Link href="/consultants" className="flex-1">
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
