'use client';

interface GridOverlayProps {
  children: React.ReactNode;
}

export default function GridOverlay({ children }: GridOverlayProps) {
  return (
    <div className="relative min-h-screen bg-[#FEFAEF] px-[10%] pt-[5vh] pb-[10vh]">
      {/* Grid lines at content boundaries (inner edges of padding) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-0 bottom-0 w-px bg-gray-200 opacity-50" />
        <div className="absolute right-[10%] top-0 bottom-0 w-px bg-gray-200 opacity-50" />
        <div className="absolute top-[5vh] left-0 right-0 h-px bg-gray-200 opacity-50" />
        <div className="absolute bottom-[10vh] left-0 right-0 h-px bg-gray-200 opacity-50" />
      </div>
      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-4xl">
        {children}
      </div>
    </div>
  );
}
