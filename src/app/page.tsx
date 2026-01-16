'use client';

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import Link from "next/link";

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
    <>
        {/* Hero section */}
        <section className="hero-section flex min-h-[50vh] w-full flex-col justify-center py-12 sm:py-16 lg:py-24">
          {/* starts hidden */}
          <div className="hero-inner flex flex-col items-start gap-4 opacity-0">
            {/* Main Headline */}
            <div className="flex flex-col items-start gap-1">
              {/* First line: "Go Viral without" */}
              <div className="flex items-baseline gap-6 sm:gap-8 lg:gap-10 flex-wrap">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black" style={{ fontFamily: "var(--font-gfs-didot)" }}>
                  Go
                </h1>
                <div className="-ml-3 sm:-ml-4 lg:-ml-5 mt-2 sm:mt-3 lg:mt-4" style={{ transform: 'translateY(36px) translateX(16x)' }}>
                  <Image
                    src="/viral1.png"
                    alt="Viral"
                    width={500}
                    height={250}
                    className="h-24 sm:h-32 lg:h-40 w-auto object-contain"
                    onLoadingComplete={() => setHeroReady(true)}
                  />
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black -ml-4 sm:-ml-5 lg:-ml-8" style={{ fontFamily: "var(--font-gfs-didot)" }}>
                  without
                </h1>
              </div>
              {/* Second line: [IMAGE] (videos) */}
              <div className="flex items-baseline gap-2 mt-2">
                <div className="flex-shrink-0">
                  <Image
                    src="/scripting.svg"
                    alt="Scripting"
                    width={800}
                    height={320}
                    className="h-32 sm:h-40 lg:h-48 w-auto object-contain"
                    onLoadingComplete={() => setHeroReady(true)}
                  />
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold italic text-black -ml-2 sm:-ml-3 lg:-ml-14" style={{ fontFamily: "var(--font-gfs-didot)" }}>
                  (videos)
                </h1>
              </div>
            </div>

            <div className="mt-2 w-full sm:mt-3 -translate-y-4 sm:-translate-y-6 lg:-translate-y-8">
              <p className="text-lg text-gray-500 sm:text-xl lg:text-2xl italic" style={{ fontFamily: "var(--font-gfs-didot)" }}>
                Good artists copy, great artists steal viral content ideas
              </p>
              <Link 
                href="/sign-in"
                className="mt-4 inline-block px-6 py-3 bg-black text-white rounded-full text-sm hover:opacity-90 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px]"
              >
                Get Started
              </Link>
            </div>
          </div>
        </section>
    </>
  );
}
