import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSubmitBlogOutline } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Send } from "lucide-react";

const formSchema = z.object({
  proposedTitle: z.string().min(5, "Title must be at least 5 characters."),
  keyPoints: z.string().min(10, "Please list a few key points."),
  targetAudience: z.string().min(3, "Please describe the audience."),
  keywords: z.string().min(3, "Please provide keywords."),
  notes: z.string().optional(),
});

export default function BlogOutline() {
  const { toast } = useToast();
  const submitOutline = useSubmitBlogOutline();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      proposedTitle: "Integrating Mindfulness into Daily CBT Interventions",
      keyPoints: "1. Introduction to Mindfulness-Based Cognitive Therapy (MBCT)\n2. 5-minute grounding exercises for acute panic\n3. Body scan techniques for physical stress tension\n4. Maintaining longitudinal patient adherence",
      targetAudience: "Adult clients managing chronic anxiety and stress",
      keywords: "mindfulness, MBCT, anxiety, grounding, coping",
      notes: "Includes downloadable client tracking sheet outline.",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      proposedTitle: values.proposedTitle,
      keyPoints: values.keyPoints.split('\n').filter(p => p.trim() !== ''),
      targetAudience: values.targetAudience,
      keywords: values.keywords.split(',').map(k => k.trim()),
      notes: values.notes || null,
    };

    submitOutline.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Outline submitted successfully", description: "Our editorial team will review it shortly." });
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to submit outline.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6 pb-10 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit an Outline</h1>
        <p className="text-muted-foreground mt-1">Propose an article idea before writing the full draft.</p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-secondary/30 pb-4 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Article Proposal
          </CardTitle>
          <CardDescription>Submitting an outline ensures your topic aligns with our current content needs.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="proposedTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., 5 Signs of Burnout You Might Be Ignoring" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keyPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key Points to Cover</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Point 1...&#10;Point 2...&#10;Point 3..." 
                        className="min-h-[120px] resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Put each point on a new line.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="targetAudience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Young professionals, Parents" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Keywords (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="burnout, stress, work-life" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes for Editors</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any specific research you plan to cite?" 
                        className="min-h-[80px] resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" className="bg-primary text-white" disabled={submitOutline.isPending}>
                  {submitOutline.isPending ? "Submitting..." : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Outline
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
