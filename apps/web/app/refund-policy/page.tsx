import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy - HEXPERTIFY",
  description:
    "Understand the refund eligibility, conditions, and process for HEXPERTIFY consultations.",
  keywords: [
    "refund policy",
    "hexpertify",
    "cancellation policy",
    "money back",
  ],
  openGraph: {
    title: "Refund Policy - HEXPERTIFY",
    description:
      "Understand the refund eligibility, conditions, and process for HEXPERTIFY consultations.",
    type: "website",
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900">
          Refund Policy
        </h1>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Cancellation, Rescheduling & Refund Policy
            </h2>
            <p className="leading-relaxed">
              At Hexpertify, we value the time and commitment of both clients
              and counsellors. To ensure a fair and smooth experience for
              everyone, the following cancellation, rescheduling, refund, and
              attendance policies apply to all sessions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Client Cancellation & Rescheduling
            </h2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                Clients may cancel or reschedule a session up to{" "}
                <strong>3 hours before the scheduled start time</strong>.
              </li>
              <li>
                Cancellations or rescheduling requests made less than{" "}
                <strong>3 hours before the scheduled session</strong> are not
                eligible for a refund or rescheduling.
              </li>
              <li>
                Clients who fail to attend a scheduled session without prior
                notice will be considered a <strong>no-show</strong> and will
                not be eligible for a refund or rescheduling.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Counsellor Cancellation & Rescheduling
            </h2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                Counsellors must provide at least{" "}
                <strong>3 hours' notice</strong> if they need to cancel or
                reschedule a session.
              </li>
              <li>
                If a counsellor cancels or reschedules a session with less than{" "}
                <strong>3 hours' notice</strong>, the client will receive a{" "}
                <strong>25% discount coupon</strong> applicable to a future
                session.
              </li>
              <li>
                If a counsellor fails to attend a scheduled session without
                prior notice, the client may choose between:
              </li>
              <li>
                A <strong>full refund</strong>, or
              </li>
              <li>
                <strong>Rescheduling the session at no additional cost</strong>.
              </li>
              <li>
                In addition, the client will receive a{" "}
                <strong>25% discount coupon</strong> applicable to a future
                session.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Late Arrival Policy
            </h2>
            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">
                  If the Client Arrives Late
                </h3>
                <ul className="list-disc space-y-2 pl-6 leading-relaxed">
                  <li>Sessions will end at the originally scheduled time.</li>
                  <li>
                    Additional time will not be provided to compensate for the
                    client's late arrival.
                  </li>
                  <li>The full session fee will remain applicable.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">
                  If the Counsellor Arrives Late
                </h3>
                <ul className="list-disc space-y-2 pl-6 leading-relaxed">
                  <li>
                    The session will be extended to ensure the client receives
                    the full booked duration (50 or 60 minutes, as applicable).
                  </li>
                  <li>
                    If extending the session is not possible, Hexpertify may
                    provide an appropriate alternative resolution, including
                    rescheduling.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Emergency Circumstances
            </h2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                If a client is unable to attend a session due to a genuine
                emergency and the cancellation occurs within the 3-hour notice
                period, the session will remain{" "}
                <strong>non-refundable and non-reschedulable</strong>.
              </li>
              <li>
                However, <strong>in emergency situations only</strong>,
                Hexpertify may, at its sole discretion and on a case-by-case
                basis, provide the client with a{" "}
                <strong>discount coupon ranging from 15% to 30%</strong> for a
                future session as a goodwill gesture.
              </li>
              <li>
                The applicable discount, if any, will be determined based on the
                circumstances of the case.
              </li>
              <li>The issuance of such discount coupons is not guaranteed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Refund Processing
            </h2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                Approved refunds will be processed to the original payment
                method within <strong>3–7 business days</strong>.
              </li>
              <li>
                Refund requests must be submitted within <strong>7 days</strong>{" "}
                of the affected session.
              </li>
              <li>
                Hexpertify reserves the right to request relevant information or
                supporting details before approving a refund request.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              Policy Updates
            </h2>
            <ul className="list-disc space-y-2 pl-6 leading-relaxed">
              <li>
                Hexpertify reserves the right to modify or update this policy at
                any time.
              </li>
              <li>
                Any changes will become effective upon publication on the
                platform.
              </li>
            </ul>
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
                  href="tel:918618209518"
                  className="text-purple-700 hover:underline"
                >
                  +91 8618209518
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
