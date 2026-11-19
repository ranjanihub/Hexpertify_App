import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSubmitBlogPost } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PenTool, Image as ImageIcon, Send } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title is too long."),
  category: z.string().min(1, "Please select a category."),
  tags: z.string().optional(),
  content: z.string().min(50, "Content must be at least 50 characters."),
  featuredImage: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

export default function BlogSubmit() {
  const { toast } = useToast();
  const submitPost = useSubmitBlogPost();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      tags: "",
      content: "",
      featuredImage: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      title: values.title,
      category: values.category,
      tags: values.tags ? values.tags.split(',').map(t => t.trim()) : [],
      content: values.content,
      featuredImage: values.featuredImage || null
    };

    submitPost.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Blog post submitted successfully", description: "Your post is now pending review." });
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to submit post.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submit Blog Post</h1>
        <p className="text-muted-foreground mt-1">Publish an article to the Hexpertify client portal.</p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-secondary/30 pb-4 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <PenTool className="w-5 h-5 text-primary" />
            Post Editor
          </CardTitle>
          <CardDescription>Articles should be evidence-based and written for a general audience.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Understanding the Mechanics of CBT" className="text-lg font-medium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Anxiety">Anxiety & Stress</SelectItem>
                          <SelectItem value="Depression">Depression</SelectItem>
                          <SelectItem value="Relationships">Relationships</SelectItem>
                          <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                          <SelectItem value="Therapy_Guide">Therapy Guide</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (comma separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="cbt, anxiety, coping" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="featuredImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Image URL (Optional)</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder="https://..." {...field} />
                        <Button type="button" variant="outline" size="icon" className="shrink-0"><ImageIcon className="w-4 h-4 text-muted-foreground" /></Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Article Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your article content here..." 
                        className="min-h-[300px] resize-y font-mono text-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>Supports Markdown formatting.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border">
                <Button type="button" variant="outline">Save Draft</Button>
                <Button type="submit" className="bg-primary text-white" disabled={submitPost.isPending}>
                  {submitPost.isPending ? "Submitting..." : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit for Review
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
