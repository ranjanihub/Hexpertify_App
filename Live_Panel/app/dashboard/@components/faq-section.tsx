"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
  onFaqChange: (index: number, field: keyof FAQItem, value: string) => void;
  onAddFaq: () => void;
  onRemoveFaq: (index: number) => void;
}

export function FAQSection({
  faqs,
  onFaqChange,
  onAddFaq,
  onRemoveFaq,
}: FAQSectionProps) {
  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <Card key={index} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Question {index + 1}</h3>
            {faqs.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFaq(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`question-${index}`}>Question</Label>
            <Input
              id={`question-${index}`}
              placeholder="Enter the question"
              value={faq.question}
              onChange={(e) => onFaqChange(index, "question", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`answer-${index}`}>Answer</Label>
            <Textarea
              id={`answer-${index}`}
              placeholder="Enter the answer"
              value={faq.answer}
              onChange={(e) => onFaqChange(index, "answer", e.target.value)}
              rows={4}
            />
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={onAddFaq}
        className="w-full bg-transparent"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add FAQ
      </Button>
    </div>
  );
}
