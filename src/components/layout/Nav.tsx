import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="w-full bg-transparent pt-[1vh] pb-6 px-8 sm:px-12 lg:px-16 xl:px-20">
      <div className="mx-auto max-w-4xl flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold font-gfs-didot text-black">
          Scripting
        </Link>
        <div className="flex items-center gap-4">
          <button className="text-sm text-black hover:opacity-70 transition-opacity">
            Sign In
          </button>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-black text-white rounded-full text-sm hover:opacity-90 transition-opacity"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}


