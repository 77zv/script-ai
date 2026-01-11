'use client';

interface GridOverlayProps {
  children: React.ReactNode;
}

export default function GridOverlay({ children }: GridOverlayProps) {
  return (
    <div className="relative min-h-screen bg-[#FEFAEF] px-[10%] pt-[5%] pb-[10%]">
      {/* Grid lines at content boundaries (inner edges of padding) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-0 bottom-0 w-px bg-gray-200 opacity-50" />
        <div className="absolute right-[10%] top-0 bottom-0 w-px bg-gray-200 opacity-50" />
        <div className="absolute top-[5%] left-0 right-0 h-px bg-gray-200 opacity-50" />
        <div className="absolute bottom-[10%] left-0 right-0 h-px bg-gray-200 opacity-50" />
      </div>
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
