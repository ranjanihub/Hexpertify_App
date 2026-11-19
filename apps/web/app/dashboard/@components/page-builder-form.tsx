"use client";

import React, { useState } from "react";
import { Formik, Form, FieldArray, ErrorMessage } from "formik";
import { Trash2, Plus, Save, Loader2 } from "lucide-react";
import { savePageAction } from "../actions";
import * as Yup from "yup";
import { toast } from "sonner";

// UI Components
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const PageValidationSchema = Yup.object().shape({
  identifier: Yup.string().required("Identifier (Slug) is required"),
  notificationTitle: Yup.string()
    .max(120, "Notification title must be 120 characters or less")
    .nullable()
    .optional(),

  carouselImages: Yup.array()
    .of(
      Yup.object().shape({
        url: Yup.string()
          .url("Must be a valid URL")
          .required("URL is required"),
        alt: Yup.string().optional(),
      }),
    )
    .default([]),

  seoMeta: Yup.object().shape({
    metaTitle: Yup.string().required("Meta Title is required"),
    metaDescription: Yup.string().required("Meta Description is required"),
    metaKeywords: Yup.array().of(
      Yup.string().required("Keyword cannot be empty"),
    ),
    ogTitle: Yup.string()
      .max(60, "OG title must be 60 characters or less")
      .nullable(),
    ogDescription: Yup.string()
      .max(200, "OG description must be 200 characters or less")
      .nullable(),
    ogImage: Yup.string().url("Must be a valid URL").nullable(),
    ogImageAlt: Yup.string().nullable().optional(),
  }),

  faqs: Yup.array().of(
    Yup.object().shape({
      question: Yup.string().required("Question is required"),
      answer: Yup.string().required("Answer is required"),
    }),
  ),

  testimonials: Yup.array().of(
    Yup.object().shape({
      author: Yup.string().required("Author name is required"),
      content: Yup.string().required("Testimonial content is required"),
      authorImageUrl: Yup.string().url("Must be a valid URL"),
      authorImageAltText: Yup.string().optional(),
    }),
  ),
});

const defaultValues = {
  identifier: "home",
  notificationTitle: "",
  carouselImages: [],
  seoMeta: {
    metaTitle: "",
    metaDescription: "",
    metaKeywords: [],
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    ogImageAlt: "",
  },
  faqs: [],
  testimonials: [],
};

interface PageFormProps {
  initialData?: any;
}

export default function PageBuilderForm({ initialData }: PageFormProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    const result = await savePageAction(values);
    setLoading(false);

    result.success
      ? toast.success("Saved Successfully!")
      : toast.error("Error Saving Data");
  };

  const mergedValues = {
    ...defaultValues,
    ...initialData,
    notificationTitle:
      initialData?.notificationTitle || defaultValues.notificationTitle,
    seoMeta: {
      ...defaultValues.seoMeta,
      ...(initialData?.seoMeta || {}),
      ogImageAlt: initialData?.seoMeta?.ogImageAlt || "",
    },
    carouselImages: (initialData?.carouselImageUrls || []).map(
      (url: string, index: number) => ({
        url,
        alt: initialData?.carouselImageAltTexts?.[index] || "",
        carouselImageIsMobileFlags:
          initialData?.carouselImageIsMobileFlags?.[index] || false,
      }),
    ),
    faqs: initialData?.faqs || defaultValues.faqs,
    // Map testimonials back to form format (Schema: authorName/quote -> Form: author/content)
    testimonials: (initialData?.testimonials || []).map((t: any) => ({
      author: t.authorName || t.author || "",
      content: t.quote || t.content || "",
      authorProfessional: t.authorProfessional || "",
      authorImageUrl: t.authorImageUrl || "",
      authorImageAltText: t.authorImageAltText || "",
      authorEmail: t.authorEmail || "",
    })),
    __tempKeyword: "",
  };

  return (
    <div className="py-8 px-4">
      <Formik
        initialValues={mergedValues}
        validationSchema={PageValidationSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
        }) => (
          <Form className="space-y-8 pb-24">
            {/* GENERAL SETTINGS */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Page Identifier (Slug)</Label>
                  <Input
                    name="identifier"
                    value={values.identifier}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled
                  />
                  <ErrorMessage
                    name="identifier"
                    component="div"
                    className="text-sm text-red-500"
                  />
                </div>

                <div>
                  <Label>Notification Title</Label>
                  <Input
                    name="notificationTitle"
                    value={values.notificationTitle}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Title used for notifications"
                  />
                  <ErrorMessage
                    name="notificationTitle"
                    component="div"
                    className="text-sm text-red-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* CAROUSEL IMAGES */}
            <Card>
              <CardHeader>
                <CardTitle>Carousel Images</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldArray name="carouselImages">
                  {({ push, remove }) => (
                    <div className="space-y-4">
                      {values.carouselImages.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex gap-2 items-start border p-2 rounded-md"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              name={`carouselImages.${index}.url`}
                              value={item.url}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              placeholder="Image URL (https://...)"
                            />
                            <Input
                              name={`carouselImages.${index}.alt`}
                              value={item.alt}
                              onChange={handleChange}
                              onBlur={handleBlur}
                              placeholder="Alt Text (Description)"
                            />
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`carouselImages.${index}.carouselImageIsMobileFlags`}
                                name={`carouselImages.${index}.carouselImageIsMobileFlags`}
                                checked={
                                  item.carouselImageIsMobileFlags || false
                                }
                                onCheckedChange={(checked) =>
                                  setFieldValue(
                                    `carouselImages.${index}.carouselImageIsMobileFlags`,
                                    checked,
                                  )
                                }
                              />
                              <label
                                htmlFor={`carouselImages.${index}.carouselImageIsMobileFlags`}
                                className="text-sm cursor-pointer"
                              >
                                Is Mobile
                              </label>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => push({ url: "", alt: "" })}
                        className="w-full border-dashed"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Image
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </CardContent>
            </Card>

            {/* SEO METADATA */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title */}
                <div>
                  <Label>Meta Title</Label>
                  <Input
                    name="seoMeta.metaTitle"
                    value={values.seoMeta.metaTitle}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <ErrorMessage
                    name="seoMeta.metaTitle"
                    component="div"
                    className="text-sm text-red-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    name="seoMeta.metaDescription"
                    value={values.seoMeta.metaDescription}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <ErrorMessage
                    name="seoMeta.metaDescription"
                    component="div"
                    className="text-sm text-red-500"
                  />
                </div>

                {/* Keywords */}
                <div>
                  <Label className="mb-2 block">Keywords</Label>

                  <FieldArray name="seoMeta.metaKeywords">
                    {({ push, remove }) => (
                      <div className="space-y-3">
                        {/* Pills */}
                        <div className="flex flex-wrap gap-2">
                          {values.seoMeta.metaKeywords.map(
                            (keyword: string, index: number) => (
                              <div
                                key={index}
                                className="flex items-center bg-secondary text-secondary-foreground px-3 py-1 rounded-full border text-sm"
                              >
                                <span className="mr-2">{keyword}</span>
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="font-bold hover:text-destructive"
                                >
                                  ×
                                </button>
                              </div>
                            ),
                          )}
                        </div>

                        {/* Textbox to add keyword */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add keyword..."
                            value={values.__tempKeyword || ""}
                            onChange={(e) =>
                              setFieldValue("__tempKeyword", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (values.__tempKeyword?.trim()) {
                                  push(values.__tempKeyword.trim());
                                  setFieldValue("__tempKeyword", "");
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (values.__tempKeyword?.trim()) {
                                push(values.__tempKeyword.trim());
                                setFieldValue("__tempKeyword", "");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    )}
                  </FieldArray>
                </div>

                {/* Open Graph (Social Media) */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4">
                    Open Graph (Social Media)
                  </h3>
                  <div className="space-y-4">
                    {/* OG Title */}
                    <div>
                      <Label>OG Title</Label>
                      <Input
                        name="seoMeta.ogTitle"
                        value={values.seoMeta.ogTitle}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Title for social media sharing"
                      />
                      <ErrorMessage
                        name="seoMeta.ogTitle"
                        component="div"
                        className="text-sm text-red-500"
                      />
                    </div>

                    {/* OG Description */}
                    <div>
                      <Label>OG Description</Label>
                      <Textarea
                        name="seoMeta.ogDescription"
                        value={values.seoMeta.ogDescription}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Description for social media sharing"
                      />
                      <ErrorMessage
                        name="seoMeta.ogDescription"
                        component="div"
                        className="text-sm text-red-500"
                      />
                    </div>

                    {/* OG Image */}
                    <div>
                      <Label>OG Image URL</Label>
                      <Input
                        name="seoMeta.ogImage"
                        value={values.seoMeta.ogImage}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="https://example.com/og-image.jpg"
                      />
                      <ErrorMessage
                        name="seoMeta.ogImage"
                        component="div"
                        className="text-sm text-red-500"
                      />
                    </div>

                    {/* OG Image Alt */}
                    <div>
                      <Label>OG Image Alt Text</Label>
                      <Input
                        name="seoMeta.ogImageAlt"
                        value={values.seoMeta.ogImageAlt}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Description of OG image"
                      />
                      <ErrorMessage
                        name="seoMeta.ogImageAlt"
                        component="div"
                        className="text-sm text-red-500"
                      />
                    </div>

                    {values.seoMeta.ogImage && (
                      <div className="mt-2">
                        <Label className="text-sm">Preview</Label>
                        <div className="mt-1 border rounded-lg p-2 bg-muted/20">
                          <img
                            src={values.seoMeta.ogImage}
                            alt={
                              values.seoMeta.ogImageAlt || "OG Image preview"
                            }
                            className="w-full max-w-md h-auto object-cover rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ SECTION */}
            <Card>
              <CardHeader>
                <CardTitle>FAQs</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldArray name="faqs">
                  {({ push, remove }) => (
                    <div className="space-y-6">
                      {values.faqs.map((faq: any, index: number) => (
                        <div
                          key={index}
                          className="relative grid gap-4 p-4 border rounded-lg bg-muted/20"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <div>
                            <Label>Question</Label>
                            <Input
                              name={`faqs.${index}.question`}
                              value={faq.question}
                              onChange={handleChange}
                            />
                          </div>
                          <div>
                            <Label>Answer</Label>
                            <Textarea
                              name={`faqs.${index}.answer`}
                              value={faq.answer}
                              onChange={handleChange}
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => push({ question: "", answer: "" })}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add FAQ
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </CardContent>
            </Card>

            {/* TESTIMONIALS */}
            <Card>
              <CardHeader>
                <CardTitle>Testimonials</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldArray name="testimonials">
                  {({ push, remove }) => (
                    <div className="space-y-6">
                      {values.testimonials.map((t: any, index: number) => (
                        <div
                          key={index}
                          className="relative grid gap-4 p-4 border rounded-lg bg-muted/20"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Author Name</Label>
                              <Input
                                name={`testimonials.${index}.author`}
                                value={t.author}
                                onChange={handleChange}
                                placeholder="John Doe"
                              />
                            </div>
                            <div>
                              <Label>Profession</Label>
                              <Input
                                name={`testimonials.${index}.authorProfessional`}
                                value={t.authorProfessional}
                                onChange={handleChange}
                                placeholder="CEO, TechCorp"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Author Email</Label>
                              <Input
                                name={`testimonials.${index}.authorEmail`}
                                value={t.authorEmail}
                                onChange={handleChange}
                                placeholder="john@example.com"
                              />
                            </div>
                            <div>
                              <Label>Author Image URL</Label>
                              <Input
                                name={`testimonials.${index}.authorImageUrl`}
                                value={t.authorImageUrl}
                                onChange={handleChange}
                                placeholder="https://..."
                              />
                            </div>
                            <div>
                              <Label>Author Image Alt Text</Label>
                              <Input
                                name={`testimonials.${index}.authorImageAltText`}
                                value={t.authorImageAltText}
                                onChange={handleChange}
                                placeholder="Description of author"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Content</Label>
                            <Textarea
                              name={`testimonials.${index}.content`}
                              value={t.content}
                              onChange={handleChange}
                              placeholder="Great service..."
                            />
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          push({
                            author: "",
                            content: "",
                            authorProfessional: "",
                            authorImageUrl: "",
                            authorEmail: "",
                          })
                        }
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Testimonial
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </CardContent>
            </Card>

            {/* FOOTER SAVE BUTTON */}
            <div className=" flex justify-end md:pl-64">
              <Button
                type="submit"
                size="lg"
                className="w-full md:w-auto !text-white"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {loading ? "Saving..." : "Save Page Data"}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
