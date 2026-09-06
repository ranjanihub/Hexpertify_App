// SignupForm.tsx (Updated)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { registerUser } from "./actions";

export function SignupForm(props: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    // --- 1. Client-side password confirmation ---
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // --- 2. Call the server action ---
      const result = await registerUser(formData);

      // --- 3. Handle the result ---
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
        router.push("/login"); // Redirect to login after successful creation
      }
    } catch (error) {
      // This catches unexpected errors (e.g., network failure)
      console.error("Signup form error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* We use onSubmit to call our async handleSubmit function.
                  This gives us full control over loading states and toast messages.
                */}
        <form
          onSubmit={(e) => {
            e.preventDefault(); // Prevent default form submission
            handleSubmit(new FormData(e.currentTarget));
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
              <FieldDescription>We never share your email.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+91 1234567890"
              />
              <FieldDescription>
                Optional. Used for important notifications.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" name="password" type="password" required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirm">Confirm Password</FieldLabel>
              <Input id="confirm" name="confirm" type="password" required />
            </Field>

            <FieldGroup>
              <Field>
                <Button type="submit" className="text-white" disabled={loading}>
                  {loading ? "Creating..." : "Create Account"}
                </Button>

                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
