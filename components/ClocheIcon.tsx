import React from 'react';

interface ClocheIconProps {
  className?: string;
  size?: number;
}

export function ClocheIcon({ className = 'h-5 w-5', size }: ClocheIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Perilla superior / Knob */}
      <circle cx="12" cy="5.5" r="2.2" fill="currentColor" />
      {/* Cuello conector / Neck */}
      <rect x="11.1" y="7.3" width="1.8" height="1.8" fill="currentColor" />
      {/* Cúpula / Dome cloche */}
      <path
        d="M6 16.5V14.5C6 11.2 8.7 8.5 12 8.5C15.3 8.5 18 11.2 18 14.5V16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bandeja horizontal / Platter */}
      <rect x="3.8" y="16.5" width="16.4" height="2.2" rx="1.1" fill="currentColor" />
    </svg>
  );
}

interface DefaultStoreLogoProps {
  className?: string;
  iconClassName?: string;
}

export function DefaultStoreLogo({
  className = 'h-full w-full',
  iconClassName = 'h-1/2 w-1/2 text-white',
}: DefaultStoreLogoProps) {
  return (
    <div
      className={`flex items-center justify-center bg-neutral-900 text-white ${className}`}
    >
      <ClocheIcon className={iconClassName} />
    </div>
  );
}
