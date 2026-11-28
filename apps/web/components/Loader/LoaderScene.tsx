"use client";

import { useEffect, useState } from "react";

/** The Hexpertify logo, cropped to its edges (same file the panels' sign-in loader uses) */
const LOGO_SRC = "/hexpertify-logo-tight.png";

function useClock() {
  const [clock, setClock] = useState("");
  useEffect(() => {
    const format = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: true, timeZoneName: "short" });
    const tick = () => setClock(format.format(new Date()).toUpperCase());
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return clock;
}

/**
 * The full-screen loading scene: drifting purple blobs, the logo rising into view, a ring that
 * fills with the progress (bottom left) and a spinning cube badge (bottom right). Styles: app/styles/loader.css.
 */
export default function LoaderScene({
  progress,
  variant,
  leaving = false,
}: {
  /** 0–100 */
  progress: number;
  variant: "intro" | "route";
  /** Plays the exit (letters lift, screen wipes up) */
  leaving?: boolean;
}) {
  const clock = useClock();

  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const ready = pct >= 100;

  return (
    <div
      className={`hxl hxl-${variant}${leaving ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
    >
      <span className="sr-only">{ready ? "Hexpertify is ready" : "Loading Hexpertify"}</span>

      <div className="hxl-blobs" aria-hidden="true">
        <span className="hxl-blob hxl-blob-a" />
        <span className="hxl-blob hxl-blob-b" />
        <span className="hxl-blob hxl-blob-c" />
      </div>

      <div className="hxl-top hxl-fade" aria-hidden="true">
        <span className="hxl-mono">
          H<i>/</i>X
        </span>
        <span className="hxl-clock">{clock}</span>
        <span className="hxl-nav">
          Experts<i>/</i>Sessions
        </span>
        <span className="hxl-dot" />
      </div>

      <span className="hxl-side hxl-side-l hxl-fade" aria-hidden="true" suppressHydrationWarning>
        hexpertify ©{new Date().getFullYear()}
      </span>
      <span className="hxl-side hxl-side-r hxl-fade" aria-hidden="true">
        {ready ? "welcome" : "loading"}
      </span>

      <div className="hxl-center" aria-hidden="true">
        <div className="hxl-word">
          <span className="hxl-logo">
            {/* eslint-disable-next-line @next/next/no-img-element -- must paint before hydration, no optimiser round trip */}
            <img src={LOGO_SRC} alt="" width={652} height={199} fetchPriority="high" decoding="async" draggable={false} />
          </span>
        </div>
        <p className="hxl-meta hxl-fade">
          Experts. Verified<i>/</i>Sessions. Online
        </p>
        <div className="hxl-row hxl-fade">
          <p>Verified experts for therapy, careers and more, one video call away.</p>
          <span className={`hxl-pill${ready ? " is-ready" : ""}`}>
            {ready ? "Enter" : "Loading"}
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M2 8 8 2M3.5 2H8v4.5" />
            </svg>
          </span>
        </div>
      </div>

      <div className="hxl-counter" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle className="hxl-ring-track" cx="50" cy="50" r="49" />
          <circle
            className="hxl-ring-arc"
            cx="50"
            cy="50"
            r="49"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - pct}
            transform="rotate(-90 50 50)"
          />
          <line className="hxl-ring-cross" x1="24" y1="76" x2="76" y2="24" />
        </svg>
        <span className="hxl-counter-label top">Loading</span>
        <span className="hxl-num now">{String(pct).padStart(2, "0")}</span>
        <span className="hxl-num total">100</span>
        <span className="hxl-counter-label bottom">Percent</span>
      </div>

      <p className="hxl-hello hxl-fade" aria-hidden="true">
        Hi, we&apos;re Hexpertify. Verified experts, one call away, whenever you need them.
      </p>

      <div className="hxl-badge" aria-hidden="true">
        <div className="hxl-cube">
          <span className="f1" />
          <span className="f2" />
          <span className="f3" />
          <span className="f4" />
          <span className="f5" />
          <span className="f6" />
        </div>
      </div>
    </div>
  );
}
