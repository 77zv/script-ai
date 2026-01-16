"use client";

import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Nav() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  const handleDashboardClick = (e: React.MouseEvent) => {
    if (pathname === '/dashboard') {
      // If already on dashboard, navigate with reset param to trigger state reset
      e.preventDefault();
      router.push('/dashboard?reset=true');
    }
    // Otherwise, let the Link handle navigation normally
  };

  // Animate dropdown in/out
  useEffect(() => {
    if (!dropdownMenuRef.current) return;

    if (isDropdownOpen) {
      // Animate in
      gsap.fromTo(
        dropdownMenuRef.current,
        {
          opacity: 0,
          y: -10,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
        }
      );
    } else {
      // Animate out
      gsap.to(dropdownMenuRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.15,
        ease: "power2.in",
      });
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSignOut = () => {
    setIsDropdownOpen(false);
    signOut();
  };

  return (
    <nav className="w-full bg-transparent pt-[1vh] pb-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold font-gfs-didot text-black">
          Scripting
        </Link>
        <div className="flex items-center gap-4">
          {isPending ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : session?.user ? (
            <>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-sm text-black hover:opacity-70 transition-opacity cursor-pointer"
                >
                  {session.user.name || session.user.email}
                </button>
                {isDropdownOpen && (
                  <div
                    ref={dropdownMenuRef}
                    className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden"
                    style={{ opacity: 0 }}
                  >
                    <Link
                      href="/onboarding"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    >
                      Onboarding
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
              <Link 
                href="/dashboard"
                onClick={handleDashboardClick}
                className="px-4 py-2 bg-black text-white rounded-full text-sm hover:opacity-90 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px]"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link 
                href="/sign-in"
                className="text-sm text-black hover:opacity-70 transition-opacity"
              >
                Sign In
              </Link>
              <Link 
                href="/dashboard"
                onClick={handleDashboardClick}
                className="px-4 py-2 bg-black text-white rounded-full text-sm hover:opacity-90 transition-all relative shadow-[0_4px_0_0_rgba(0,0,0,0.5)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.5)] active:translate-y-[2px]"
              >
                Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}


