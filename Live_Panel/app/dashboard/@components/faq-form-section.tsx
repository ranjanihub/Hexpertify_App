"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import type { FormikErrors, FormikProps, FormikTouched } from "formik";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQFormValues {
  faqs: FAQItem[];
}

interface FAQFormSectionProps<TValues extends FAQFormValues> {
  formik: FormikProps<TValues>;
}

export function FAQFormSection<TValues extends FAQFormValues>({
  formik,
}: FAQFormSectionProps<TValues>) {
  const faqs: FAQItem[] = formik.values.faqs || [];
  const faqTouched = formik.touched.faqs as
    | FormikTouched<FAQItem>[]
    | undefined;
  const faqErrors = formik.errors.faqs as
    | FormikErrors<FAQItem>[]
    | string
    | undefined;

  const getFaqError = (index: number, field: keyof FAQItem) => {
    if (!Array.isArray(faqErrors)) return undefined;

    const error = faqErrors[index];
    if (!error || typeof error === "string") return undefined;

    return error[field];
  };

  const isFaqTouched = (index: number, field: keyof FAQItem) => {
    if (!Array.isArray(faqTouched)) return false;

    const touched = faqTouched[index];
    return Boolean(touched?.[field]);
  };

  const handleAddFaq = () => {
    formik.setFieldValue("faqs", [...faqs, { question: "", answer: "" }]);
  };

  const handleRemoveFaq = (index: number) => {
    formik.setFieldValue(
      "faqs",
      faqs.filter((_: FAQItem, i: number) => i !== index),
    );
  };

  const handleFaqChange = (
    index: number,
    field: keyof FAQItem,
    value: string,
  ) => {
    const newFaqs = [...faqs];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    formik.setFieldValue("faqs", newFaqs);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq: FAQItem, index: number) => {
        const questionError = getFaqError(index, "question");
        const answerError = getFaqError(index, "answer");

        return (
          <Card key={index} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Question {index + 1}</h3>
              {faqs.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFaq(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`question-${index}`}>
                Question <span className="text-destructive">*</span>
              </Label>
              <Input
                id={`question-${index}`}
                placeholder="Enter the question"
                value={faq.question}
                onChange={(e) =>
                  handleFaqChange(index, "question", e.target.value)
                }
              />
              {questionError &&
                (isFaqTouched(index, "question") || formik.submitCount > 0) && (
                  <p className="text-sm text-destructive">{questionError}</p>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`answer-${index}`}>
                Answer <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={`answer-${index}`}
                placeholder="Enter the answer"
                value={faq.answer}
                onChange={(e) =>
                  handleFaqChange(index, "answer", e.target.value)
                }
                rows={4}
              />
              {answerError &&
                (isFaqTouched(index, "answer") || formik.submitCount > 0) && (
                  <p className="text-sm text-destructive">{answerError}</p>
                )}
            </div>
          </Card>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={handleAddFaq}
        className="w-full bg-transparent"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add FAQ
      </Button>
    </div>
  );
}
