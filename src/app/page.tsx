'use client';

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import Nav from "@/components/layout/Nav";
import Image from "next/image";
import GridOverlay from "@/components/layout/GridOverlay";

export default function Home() {
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    if (!heroReady) return; // wait until SVG is loaded

    const ctx = gsap.context(() => {
      // 1) make the hidden sections visible instantly
      gsap.set([".hero-inner"], { opacity: 1 });

      // 2) animate their children in
      const tl = gsap.timeline({
        defaults: {
          y: 20,
          duration: 0.6,
          ease: "power3.out",
        },
      });

      tl.from(".hero-inner > *", {
        opacity: 0,
        stagger: 0.15,
      });
    });

    return () => ctx.revert();
  }, [heroReady]);

  return (
    <GridOverlay>
      <Nav />

      <main className="mx-auto flex w-full max-w-4xl flex-col items-center px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Hero section */}
        <section className="hero-section flex min-h-[50vh] w-full flex-col justify-center py-12 sm:py-16 lg:py-24">
          {/* starts hidden */}
          <div className="hero-inner flex flex-col items-start gap-4 opacity-0">
            {/* Subtitle above title */}
            <div className="flex w-full flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              {/* Mobile: combined text */}
              <h1 className="text-2xl font-bold sm:hidden sm:text-3xl lg:text-4xl">
                Go Viral without
              </h1>
              {/* Desktop / larger screens: split text */}
              <h1 className="hidden text-2xl font-bold sm:block sm:text-3xl lg:text-4xl">
                Go Viral
              </h1>
              <h1 className="hidden text-2xl font-bold sm:block sm:text-3xl lg:text-4xl">
                without
              </h1>
            </div>

            <div className="mt-2 flex w-full flex-col items-start gap-3 sm:flex-row sm:items-end lg:gap-6">
              <div className="w-full sm:w-2/3 lg:w-3/4">
                <Image
                  src="/scripting.svg"
                  alt="Logo"
                  width={800}
                  height={800}
                  className="h-auto w-full"
                  onLoadingComplete={() => setHeroReady(true)}
                />
              </div>
              <h1 className="hidden text-2xl font-bold sm:block sm:text-3xl lg:text-4xl sm:w-1/3 lg:w-1/4 lg:text-right">
                (videos)
              </h1>
            </div>

            <div className="mt-4 w-full sm:mt-6">
              <p className="text-sm text-gray-500 sm:text-base">
                Good artists copy, great artists steal viral content ideas
              </p>
            </div>
          </div>
        </section>
      </main>
    </GridOverlay>
  );
}
