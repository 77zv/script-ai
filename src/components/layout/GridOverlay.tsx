'use client';

export default function GridOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {/* Optional: Add grid lines at content boundaries */}
      <div className="absolute left-[10%] top-0 bottom-0 w-px bg-gray-200 opacity-50" />
      <div className="absolute right-[10%] top-0 bottom-0 w-px bg-gray-200 opacity-50" />
      <div className="absolute top-[10%] left-0 right-0 h-px bg-gray-200 opacity-50" />
      <div className="absolute bottom-[10%] left-0 right-0 h-px bg-gray-200 opacity-50" />
    </div>
  );
}
