import Link from 'next/link';
import { Flame } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function MenuNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-5xl">🍽️</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Este menú no existe</h1>
      <p className="mt-2 max-w-sm text-[15px] text-muted">
        Puede que el link esté mal escrito o que el comercio haya cambiado su dirección.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/menu-principal" className="btn-primary">
          <Flame className="h-4 w-4 text-rose-400 fill-current" />
          <span>Ir al Menú Principal</span>
        </Link>
        <Link href="/" className="btn-secondary bg-white">
          <Logo />
        </Link>
      </div>
    </main>
  );
}
