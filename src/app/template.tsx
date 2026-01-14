"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const previousPathnameRef = useRef<string>(pathname);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const isRouteChange = previousPathnameRef.current !== pathname;

    if (isRouteChange) {
      // Animate out previous page
      gsap.to(container, {
        opacity: 0,
        y: -10,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => {
          // Animate in new page
          gsap.fromTo(
            container,
            {
              opacity: 0,
              y: 20,
            },
            {
              opacity: 1,
              y: 0,
              duration: 0.4,
              ease: "power2.out",
            }
          );
        },
      });
    } else {
      // Initial load - just animate in
      gsap.fromTo(
        container,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        }
      );
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <div ref={containerRef} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
