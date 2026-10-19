import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function MenuNotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-5xl">🍽️</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Este menú no existe</h1>
      <p className="mt-2 max-w-sm text-[15px] text-muted">
        Puede que el link esté mal escrito o que el comercio haya cambiado su dirección.
      </p>
      <Link href="/" className="btn-secondary mt-8 bg-white">
        <Logo />
      </Link>
    </main>
  );
}
