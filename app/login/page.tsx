import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Ingresar · Carta App',
  robots: { index: false },
};

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default function LoginPage({ searchParams }: Props) {
  const rawNext = typeof searchParams.next === 'string' ? searchParams.next : '/admin';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/admin';
  const error = typeof searchParams.error === 'string' ? searchParams.error : undefined;

  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-5">
      <header className="mx-auto flex h-14 w-full max-w-md items-center">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center pb-20">
        <div className="card w-full max-w-md p-7 sm:p-9">
          <h1 className="text-[28px] font-semibold tracking-tight">Ingresá a tu panel</h1>
          <p className="mt-2 text-[15px] text-muted">
            Te mandamos un link mágico a tu mail. Sin contraseñas.
          </p>
          <LoginForm next={next} error={error} />
        </div>
      </div>
    </main>
  );
}
