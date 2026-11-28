"use client";

import { useEffect, useState } from "react";
import LoaderScene from "./LoaderScene";

const SEEN_KEY = "hx-intro-seen";

/**
 * Runs while the HTML is still being parsed (put it in <body> before <IntroLoader />). It decides whether the
 * intro plays, before the first paint, so returning visitors never see it flash: once per browser tab session,
 * never on the admin dashboard, never for crawlers.
 */
export const INTRO_LOADER_SCRIPT = `(function(){var d=document.documentElement;try{
if(/^\\/(dashboard|api)(\\/|$)/.test(location.pathname)||/bot|crawl|spider|slurp|preview/i.test(navigator.userAgent)||sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})){d.setAttribute("data-hx-intro","skip");return}
d.setAttribute("data-hx-intro","show");
}catch(e){d.setAttribute("data-hx-intro","skip")}})();`;

/** Shown for at least this long so the animation reads, and at most this long however slow the page is */
const MIN_MS = 1900;
const MAX_MS = 5000;
const EXIT_MS = 1350;

/**
 * The first-visit intro: the loading scene counts up while the page loads, then wipes away to reveal the site.
 * It is in the server HTML (hidden by CSS unless the inline script says "show"), so it covers the page from the
 * first paint.
 */
export default function IntroLoader() {
  const [phase, setPhase] = useState<"run" | "leave" | "done">("run");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-hx-intro") !== "show") {
      setPhase("done");
      return;
    }
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minMs = reduceMotion ? 600 : MIN_MS;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    let loaded = document.readyState === "complete";
    const onLoad = () => (loaded = true);
    window.addEventListener("load", onLoad);

    const start = performance.now();
    let last = start;
    let shown = 0;
    let raf = 0;
    let exitTimer = 0;

    const finish = () => {
      body.style.overflow = previousOverflow;
      root.setAttribute("data-hx-intro", "done");
      setPhase("done");
    };

    const tick = (now: number) => {
      const elapsed = now - start;
      const dt = now - last;
      last = now;
      const ready = (loaded && elapsed >= minMs) || elapsed >= MAX_MS;
      // Creeps towards 92% while loading, then runs to 100% once the page is ready
      const target = ready ? 100 : 92 * (1 - Math.exp(-elapsed / 900));
      shown += (target - shown) * (1 - Math.pow(ready ? 0.86 : 0.9, dt / 16.7));
      if (ready && shown > 99.5) {
        setProgress(100);
        setPhase("leave");
        exitTimer = window.setTimeout(finish, reduceMotion ? 350 : EXIT_MS);
        return;
      }
      setProgress(shown);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(exitTimer);
      window.removeEventListener("load", onLoad);
      body.style.overflow = previousOverflow;
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div className="hxl-intro">
      <LoaderScene variant="intro" progress={progress} leaving={phase === "leave"} />
    </div>
  );
}
