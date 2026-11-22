"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight } from "lucide-react";
import { hexpertify } from "@/asset/images";

// The panels' font (admin, consultant and client use Plus Jakarta Sans)
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

const BALLS = 5;
const LABELS = ["", "4", "0", "4", ""];
/** Swing stiffness (g/L in rad/s²): about a 1.6 s period at any screen size */
const STIFFNESS = 15;
const MAX_ANGLE = 1.15;
const SUBSTEPS = 10;
const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));

/**
 * A pendulum cradle in the brand purple. Drag a ball out and let go: the balls knock into each other and swing
 * like a real cradle (dragging an inner ball takes the balls beside it along). It swings once on its own when
 * the page opens and again after it has been still for a while. With reduced motion it draws one still frame.
 */
function useCradle(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const theta = new Array(BALLS).fill(0);
    const omega = new Array(BALLS).fill(0);
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let drag: { index: number; prev: number; vel: number } | null = null;
    let hover = -1;
    let touched = false;
    let stillSince = last;
    let autoSide = -1;
    // Automatic lift: raise the end ball, then let it go
    let lift: { index: number; start: number; to: number } | null = reduceMotion
      ? null
      : { index: 0, start: last + 1200, to: -0.75 };

    const geometry = () => {
      const desktop = w >= 1024;
      const r = desktop ? Math.min(w * 0.024, h * 0.045, 34) : Math.min(w * 0.065, 26);
      const cx = desktop ? w * 0.72 : w / 2;
      const top = desktop ? h * 0.2 : Math.max(96, h * 0.12);
      const length = desktop ? Math.min(h * 0.4, 300) : Math.min(h * 0.24, 200);
      const anchors = Array.from({ length: BALLS }, (_, i) => cx + (i - (BALLS - 1) / 2) * 2 * r);
      return { r, cx, top, length, anchors };
    };

    const ballAt = (i: number, g = geometry()) => ({
      x: g.anchors[i] + g.length * Math.sin(theta[i]),
      y: g.top + g.length * Math.cos(theta[i]),
    });

    const hitBall = (px: number, py: number) => {
      const g = geometry();
      for (let i = 0; i < BALLS; i++) {
        const b = ballAt(i, g);
        if (Math.hypot(px - b.x, py - b.y) <= g.r * 1.25) return i;
      }
      return -1;
    };

    /** Balls that move with a dragged/lifted ball: everything on the side it is pulled towards */
    const groupOf = (index: number, angle: number) =>
      angle < 0 ? Array.from({ length: index + 1 }, (_, i) => i) : Array.from({ length: BALLS - index }, (_, i) => index + i);

    const holdGroup = (index: number, angle: number) => {
      const group = groupOf(index, angle);
      for (let i = 0; i < BALLS; i++) {
        theta[i] = group.includes(i) ? angle : 0;
        omega[i] = 0;
      }
    };

    const step = (dt: number) => {
      const g = geometry();
      const h1 = dt / SUBSTEPS;
      for (let s = 0; s < SUBSTEPS; s++) {
        for (let i = 0; i < BALLS; i++) {
          omega[i] += -STIFFNESS * Math.sin(theta[i]) * h1;
          omega[i] *= 1 - 0.06 * h1; // air drag
          theta[i] += omega[i] * h1;
        }
        // Equal-mass elastic knocks between neighbours (a few passes so momentum runs through the row)
        for (let pass = 0; pass < 4; pass++) {
          for (let i = 0; i < BALLS - 1; i++) {
            const a = g.anchors[i] + g.length * Math.sin(theta[i]);
            const b = g.anchors[i + 1] + g.length * Math.sin(theta[i + 1]);
            const overlap = 2 * g.r - (b - a);
            if (overlap > 0.01) {
              const correction = overlap / 2 / g.length;
              theta[i] -= correction;
              theta[i + 1] += correction;
              if (omega[i] > omega[i + 1]) {
                const t = omega[i];
                omega[i] = omega[i + 1] * 0.997;
                omega[i + 1] = t * 0.997;
              }
            }
          }
        }
      }
    };

    const draw = () => {
      const g = geometry();
      ctx.clearRect(0, 0, w, h);

      // Soft glow behind the cradle
      const glow = ctx.createRadialGradient(g.cx, g.top + g.length * 0.75, g.r, g.cx, g.top + g.length * 0.75, g.length * 1.3);
      glow.addColorStop(0, "rgba(94, 43, 226, 0.16)");
      glow.addColorStop(1, "rgba(94, 43, 226, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Shadows on the floor
      const floor = g.top + g.length + g.r * 2.6;
      for (let i = 0; i < BALLS; i++) {
        const b = ballAt(i, g);
        const lifted = (b.y - (g.top + g.length)) / g.length; // 0 at rest, negative when raised
        const spread = 1 + Math.abs(lifted) * 1.8;
        ctx.beginPath();
        ctx.ellipse(b.x, floor, g.r * 0.95 * spread, g.r * 0.22 * spread, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(42, 8, 122, ${0.14 / spread})`;
        ctx.fill();
      }

      // Top bar
      const barW = (BALLS - 1) * 2 * g.r + g.r * 5;
      const barH = Math.max(8, g.r * 0.42);
      const bar = ctx.createLinearGradient(0, g.top - barH, 0, g.top);
      bar.addColorStop(0, "#5e2be2");
      bar.addColorStop(1, "#2a0a7a");
      ctx.beginPath();
      ctx.roundRect(g.cx - barW / 2, g.top - barH, barW, barH, barH / 2);
      ctx.fillStyle = bar;
      ctx.shadowColor = "rgba(42, 8, 122, 0.25)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Strings and balls
      for (let i = 0; i < BALLS; i++) {
        const b = ballAt(i, g);
        ctx.beginPath();
        ctx.moveTo(g.anchors[i], g.top);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(69, 11, 200, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(g.anchors[i], g.top, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#2a0a7a";
        ctx.fill();
      }
      for (let i = 0; i < BALLS; i++) {
        const b = ballAt(i, g);
        const active = drag?.index === i || hover === i;
        const fill = ctx.createRadialGradient(b.x - g.r * 0.35, b.y - g.r * 0.4, g.r * 0.1, b.x, b.y, g.r);
        fill.addColorStop(0, active ? "#b39cff" : "#9b7bff");
        fill.addColorStop(0.55, "#5e2be2");
        fill.addColorStop(1, "#450bc8");
        ctx.beginPath();
        ctx.arc(b.x, b.y, g.r, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.shadowColor = "rgba(69, 11, 200, 0.35)";
        ctx.shadowBlur = active ? 26 : 18;
        ctx.fill();
        ctx.shadowBlur = 0;
        // Shine
        ctx.beginPath();
        ctx.ellipse(b.x - g.r * 0.32, b.y - g.r * 0.42, g.r * 0.3, g.r * 0.17, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
        ctx.fill();
        if (LABELS[i]) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.font = `800 ${Math.round(g.r * 0.8)}px ${jakarta.style.fontFamily}`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(LABELS[i], b.x, b.y + g.r * 0.04);
        }
      }

      // Hint until the visitor has tried it
      if (!touched) {
        ctx.fillStyle = "rgba(69, 11, 200, 0.55)";
        ctx.font = `600 ${w < 640 ? 12 : 13}px ${jakarta.style.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Drag a ball and let go", g.cx, floor + g.r * 1.4);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (lift && now >= lift.start) {
        const t = (now - lift.start) / 650;
        holdGroup(lift.index, lift.to * ease(t));
        if (t >= 1) lift = null; // let go
      } else if (!drag) {
        step(dt);
      }

      // Swing again on its own after a quiet spell (until the visitor takes over)
      const energy = theta.reduce((sum, a, i) => sum + Math.abs(a) + Math.abs(omega[i]) * 0.2, 0);
      if (energy > 0.02 || drag || lift) stillSince = now;
      else if (!touched && now - stillSince > 2500) {
        autoSide = -autoSide;
        lift = { index: autoSide < 0 ? 0 : BALLS - 1, start: now, to: autoSide * 0.75 };
      }

      draw();
      raf = requestAnimationFrame(tick);
    };

    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const setCursor = (value: string) => {
      document.documentElement.style.cursor = value;
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("a, button")) return;
      const p = local(e);
      const index = hitBall(p.x, p.y);
      if (index < 0) return;
      e.preventDefault();
      touched = true;
      lift = null;
      drag = { index, prev: theta[index], vel: 0 };
      setCursor("grabbing");
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      if (!drag) {
        hover = hitBall(p.x, p.y);
        setCursor(hover >= 0 ? "grab" : "");
        return;
      }
      const g = geometry();
      const angle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, Math.atan2(p.x - g.anchors[drag.index], Math.max(1, p.y - g.top))));
      drag.vel = drag.vel * 0.6 + ((angle - drag.prev) / 0.016) * 0.4;
      drag.prev = angle;
      holdGroup(drag.index, angle);
    };
    const onUp = () => {
      if (!drag) return;
      // Let go with the hand's own speed (kept gentle)
      const release = Math.max(-5, Math.min(5, drag.vel));
      const group = groupOf(drag.index, theta[drag.index]);
      for (const i of group) omega[i] = release;
      drag = null;
      setCursor(hover >= 0 ? "grab" : "");
    };
    const blockTouchScroll = (e: TouchEvent) => {
      if (drag) e.preventDefault();
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (!reduceMotion) {
      window.addEventListener("pointerdown", onDown);
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("touchmove", blockTouchScroll, { passive: false });
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("touchmove", blockTouchScroll);
      setCursor("");
    };
  }, [canvasRef]);
}

/** Text that fades in letter by letter (screen readers get the plain text) */
function Reveal({ text, start = 0, step = 16 }: { text: string; start?: number; step?: number }) {
  let index = 0;
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, w) => (
          <span key={w} className="inline-block whitespace-nowrap">
            {word.split("").map((ch, c) => (
              <span key={c} className="hx404-letter" style={{ animationDelay: `${start + index++ * step}ms` }}>
                {ch}
              </span>
            ))}
            {w < words.length - 1 && <span className="inline-block">&nbsp;</span>}
          </span>
        ))}
      </span>
    </>
  );
}

/**
 * The website's 404: an interactive pendulum cradle in the brand purple.
 * `fullScreen` is the stand-alone page (with the logo); inside a layout with the site header it fills the
 * space under the header.
 */
export default function NotFoundScene({ fullScreen = true }: { fullScreen?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCradle(canvasRef);
  const logo = typeof hexpertify === "string" ? hexpertify : (hexpertify as { src?: string })?.src;

  return (
    <div
      className={`${jakarta.className} relative isolate flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_70%_45%,#efe9ff_0%,#f8f6ff_45%,#ffffff_100%)] ${
        fullScreen ? "min-h-screen" : "min-h-[calc(100vh-110px)]"
      }`}
    >
      <style>{`
        .hx404-letter { display: inline-block; opacity: 0; transform: translateY(0.35em); filter: blur(6px);
          animation: hx404-in 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .hx404-fade { opacity: 0; animation: hx404-in 900ms cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes hx404-in { to { opacity: 1; transform: none; filter: none; } }
        @media (prefers-reduced-motion: reduce) {
          .hx404-letter, .hx404-fade { animation: none; opacity: 1; transform: none; filter: none; }
        }
      `}</style>

      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full touch-none" />

      {fullScreen && logo && (
        <header className="relative z-20 px-5 pt-5 lg:px-10 lg:pt-7">
          <Link href="/" aria-label="Go to Hexpertify home page" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="Hexpertify" className="h-10 w-auto md:h-12" />
          </Link>
        </header>
      )}

      <section className="container pointer-events-none relative z-10 mx-auto flex flex-1 items-end px-5 lg:items-center lg:px-10">
        <div className="pointer-events-auto flex w-full flex-col gap-6 pb-[8vh] lg:max-w-[46%] lg:pb-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#450bc8]">
            <Reveal text="Error 404 · Page not found" step={12} />
          </p>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 lg:text-6xl">
            <Reveal text="Oops! This page is missing." start={250} step={22} />
          </h1>

          <p className="hx404-fade max-w-md text-lg font-medium leading-relaxed text-slate-500" style={{ animationDelay: "900ms" }}>
            The page you&apos;re looking for doesn&apos;t exist.
          </p>

          <div className="hx404-fade flex flex-wrap items-center gap-4 pt-2" style={{ animationDelay: "1100ms" }}>
            <Link
              href="/"
              className="group relative isolate inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-[padding] duration-[450ms] ease-[cubic-bezier(0.625,0.05,0,1)] hover:pr-11 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#450bc8] before:absolute before:inset-0 before:-z-10 before:rounded-full before:bg-[#450bc8] before:transition-[inset,background-color] before:duration-[450ms] before:ease-[cubic-bezier(0.625,0.05,0,1)] hover:before:-inset-1 hover:before:bg-[#5e2be2] active:before:inset-0"
            >
              Back to home
              <ArrowRight
                aria-hidden="true"
                className="absolute right-4 h-4 w-4 -translate-x-2 opacity-0 transition-all duration-[450ms] ease-[cubic-bezier(0.625,0.05,0,1)] group-hover:translate-x-0 group-hover:opacity-100"
              />
            </Link>
            <Link
              href="/services"
              className="group inline-flex items-center gap-1.5 rounded-full px-2 py-3 text-sm font-semibold uppercase tracking-wider text-[#450bc8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#450bc8]"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1.5px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 group-hover:bg-[length:100%_1.5px]">
                Find a therapist
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
