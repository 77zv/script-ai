"use client";

import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';

export default function Nav() {
  const { data: session, isPending } = useSession();

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
              <span className="text-sm text-black">{session.user.name || session.user.email}</span>
              <button 
                onClick={() => signOut()}
                className="text-sm text-black hover:opacity-70 transition-opacity"
              >
                Sign Out
              </button>
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-black text-white rounded-full text-sm hover:opacity-90 transition-opacity"
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
                className="px-4 py-2 bg-black text-white rounded-full text-sm hover:opacity-90 transition-opacity"
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


