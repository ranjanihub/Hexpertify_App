import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions - HEXPERTIFY",
  description:
    "Read the terms and conditions for using HEXPERTIFY online consulting platform.",
  keywords: [
    "terms and conditions",
    "hexpertify",
    "user agreement",
    "terms of service",
  ],
  openGraph: {
    title: "Terms & Conditions - HEXPERTIFY",
    description:
      "Read the terms and conditions for using HEXPERTIFY online consulting platform.",
    type: "website",
  },
};

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
          Terms & Conditions
        </h1>

        <p className="text-sm text-gray-600 mb-8">
          By using Hexpertify's services, you agree to these terms and
          conditions.
        </p>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Eligibility:
            </h2>
            <p className="leading-relaxed">
              You must be 13 years or older to use our services. By agreeing,
              you confirm that all information provided is accurate and
              truthful.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Prohibited Use:
            </h2>
            <p className="leading-relaxed">
              Users must not misuse our platform, including but not limited to
              fraud, spamming, or infringing on others' rights. Any violation
              may result in account suspension or termination.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Changes to Terms:
            </h2>
            <p className="leading-relaxed">
              We reserve the right to update these terms at any time. We will
              notify users of significant changes via email.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Termination:
            </h2>
            <p className="leading-relaxed">
              We reserve the right to terminate accounts that violate these
              terms without prior notice.
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
        </div>
      </div>
    </div>
  );
}
