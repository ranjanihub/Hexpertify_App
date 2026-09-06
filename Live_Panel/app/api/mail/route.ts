import { NextResponse } from "next/server";

import { sendMail } from "@/lib/mail";

type MailRequestBody = {
  to?: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
};

function isValidRecipient(to: unknown): to is string | string[] {
  if (typeof to === "string") {
    return to.trim().length > 0;
  }

  return (
    Array.isArray(to) &&
    to.length > 0 &&
    to.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

export async function POST(request: Request) {
  let body: MailRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { to, subject, html, text, from } = body;

  if (!isValidRecipient(to)) {
    return NextResponse.json(
      { success: false, error: "Recipient is required" },
      { status: 400 },
    );
  }

  if (!subject?.trim()) {
    return NextResponse.json(
      { success: false, error: "Subject is required" },
      { status: 400 },
    );
  }

  if (!html?.trim()) {
    return NextResponse.json(
      { success: false, error: "HTML content is required" },
      { status: 400 },
    );
  }

  const result = await sendMail({
    to,
    subject,
    html,
    text,
    from,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
