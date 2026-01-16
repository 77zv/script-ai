'use client';

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [heroReady, setHeroReady] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

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
            {/* Subtitle above title */}
            <div className="flex w-full flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              {/* Mobile: combined text */}
              <h1 className="text-4xl font-bold sm:hidden sm:text-5xl lg:text-6xl">
                Go Viral without
              </h1>
              {/* Desktop / larger screens: split text */}
              <h1 className="hidden text-4xl font-bold sm:block sm:text-5xl lg:text-6xl">
                Go Viral
              </h1>
              <h1 className="hidden text-4xl font-bold sm:block sm:text-5xl lg:text-6xl">
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
              <h1 className="hidden text-4xl font-bold sm:block sm:text-5xl lg:text-6xl sm:w-1/3 lg:w-1/4 lg:text-right">
                (videos)
              </h1>
            </div>

            <div className="mt-4 w-full sm:mt-6">
              <p className="text-base text-gray-500 sm:text-lg lg:text-xl">
                Good artists copy, great artists steal viral content ideas
              </p>
            </div>

            <div className="mt-6 w-full sm:mt-8">
              <Button
                onClick={() => router.push(session?.user ? "/dashboard" : "/sign-in")}
                size="lg"
                className="px-8 py-3 text-base sm:text-lg"
              >
                Get Started
              </Button>
            </div>
          </div>
        </section>
    </>
  );
}
