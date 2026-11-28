"use client";

import { useEffect, useState } from "react";
import LoaderScene from "./LoaderScene";

/**
 * Route loading screen (app/loading.tsx): the same scene as the first-visit intro. How long a page takes is
 * unknown, so the ring creeps towards 95% and the screen is replaced as soon as the page is ready.
 */
const Loader = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setProgress(95 * (1 - Math.exp(-(now - start) / 1400)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <LoaderScene variant="route" progress={progress} />;
};

export default Loader;
