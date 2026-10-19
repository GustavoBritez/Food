import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-ink', className)}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {/* Cloche / Carta icon */}
          <path d="M2 18h20" />
          <path d="M20 18v-2a8 8 0 0 0-16 0v2" />
          <path d="M12 4v2" />
          <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span className="text-[17px] font-bold tracking-tight">
        Carta App
      </span>
    </span>
  );
}
