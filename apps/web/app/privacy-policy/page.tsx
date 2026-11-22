import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - HEXPERTIFY",
  description:
    "Read our Privacy Policy to understand how HEXPERTIFY collects, uses, and protects your personal information.",
  keywords: ["privacy policy", "hexpertify", "data protection", "user privacy"],
  openGraph: {
    title: "Privacy Policy - HEXPERTIFY",
    description:
      "Read our Privacy Policy to understand how HEXPERTIFY collects, uses, and protects your personal information.",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
          Privacy Policy
        </h1>

        <div className="space-y-8 text-gray-700">
          {/* 1 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Data Collection
            </h2>
            <p className="leading-relaxed">
              We collect information such as name, email, and mobile number for
              service-related purposes. Additional data such as payment
              information may be required for completing transactions.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Data Usage
            </h2>
            <p className="leading-relaxed">
              The information collected is used to improve our services, enhance
              your experience, and communicate important updates. We may also
              utilize anonymized data for analytics and insights.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Data Protection
            </h2>
            <p className="leading-relaxed">
              We implement security measures to safeguard your data. However, no
              method of transmission over the internet is completely secure.
              Users are encouraged to use strong and unique passwords for better
              protection.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Third-Party Sharing
            </h2>
            <p className="leading-relaxed">
              We do not sell your personal information. In certain cases, we may
              share your data with trusted service providers for operational
              needs. These providers operate under strict confidentiality
              agreements.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              User Rights
            </h2>
            <p className="leading-relaxed">
              You have the right to access, update, or request deletion of your
              personal data. You may also opt out of marketing communications at
              any time through your account settings or by contacting us
              directly.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Cookies</h2>
            <p className="leading-relaxed">
              Our platform uses cookies to enhance user experience. You may
              choose to manage or disable cookies through your browser settings.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Contact Information
            </h2>
            <p className="leading-relaxed">For more information, contact:</p>
            <div className="mt-3">
              <p className="leading-relaxed">
                Email:{" "}
                <a
                  href="mailto:contact@hexpertify.com"
                  className="text-purple-700 hover:underline"
                >
                  contact@hexpertify.com
                </a>
              </p>
              <p className="leading-relaxed">
                Phone:{" "}
                <a
                  href="tel:+918618209518"
                  className="text-purple-700 hover:underline"
                >
                  +91 86182 09518
                </a>
              </p>
            </div>
          </section>

          {/* Refund Policy */}
        </div>
      </div>
    </div>
  );
}
