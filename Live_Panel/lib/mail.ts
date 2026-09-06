"use server";
import nodemailer from "nodemailer";

type MailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use true for 465, false for 587
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_EMAIL_PASSWORD,
  },
});

export async function sendMail({
  to,
  subject,
  html,
  text,
  from = process.env.MAIL_FROM,
}: MailOptions) {
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Mail send failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
