import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, HandPlatter, QrCode, Smartphone } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default function HomePage({ searchParams }: Props) {
  // Si Supabase cae en la Site URL con el código del magic link, lo derivamos al callback.
  const code = typeof searchParams.code === 'string' ? searchParams.code : null;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/admin`);

  return (
    <div className="flex h-dvh max-h-dvh flex-col justify-between overflow-hidden bg-white select-none">
      {/* Header */}
      <header className="shrink-0 border-b border-black/[0.05] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Logo />
          <Link href="/login" className="btn-ghost">
            Ingresar
          </Link>
        </div>
      </header>

      {/* Hero y características en un único viewport */}
      <main className="flex flex-1 flex-col justify-center px-5 py-2 sm:py-4">
        <div className="mx-auto w-full max-w-4xl text-center">
          <div className="mb-2 sm:mb-3 inline-flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1 text-[12px] sm:text-[13px] font-medium text-muted">
            <QrCode className="h-3.5 w-3.5" /> Menú digital para bares y restaurantes
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-ink leading-tight">
            Tu menú digital.{' '}
            <span className="text-muted block sm:inline">En 2 minutos.</span>
          </h1>

          <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-[14px] sm:text-[16px] leading-relaxed text-muted">
            Cargá tus platos, imprimí el QR y listo. Tus clientes ven el menú en el celular,
            le muestran el pedido al mozo o te piden directo por WhatsApp.
          </p>

          <div className="mt-4 sm:mt-6 flex flex-row items-center justify-center gap-3">
            <Link href="/login" className="btn-primary h-11 px-6 text-[14px] sm:text-[15px]">
              Crear mi menú gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/p/demo" className="btn-secondary h-11 px-5 text-[14px] sm:text-[15px]">
              Ver un ejemplo
            </Link>
          </div>
        </div>

        {/* 3 Bloques destacados compactos para que entren sin scroll */}
        <div className="mx-auto mt-4 sm:mt-6 grid w-full max-w-4xl grid-cols-1 gap-2.5 sm:grid-cols-3">
          <article className="rounded-2xl bg-canvas p-3.5 sm:p-4 text-left transition hover:bg-black/[0.04]">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-ink shadow-soft">
              <HandPlatter className="h-4 w-4" />
            </span>
            <h2 className="mt-2 text-[14px] sm:text-[15px] font-semibold text-ink">En el local</h2>
            <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-muted">
              Escanean el QR, eligen y tocan <strong className="font-medium text-ink">Mostrar al mozo</strong>. Rápido y sin esperas.
            </p>
          </article>

          <article className="rounded-2xl bg-canvas p-3.5 sm:p-4 text-left transition hover:bg-black/[0.04]">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-whatsapp-dark shadow-soft">
              <WhatsAppIcon className="h-4 w-4" />
            </span>
            <h2 className="mt-2 text-[14px] sm:text-[15px] font-semibold text-ink">Desde afuera</h2>
            <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-muted">
              Link en Instagram o Maps. Tocan <strong className="font-medium text-ink">Pedir por WhatsApp</strong> con el pedido listo.
            </p>
          </article>

          <article className="rounded-2xl bg-ink p-3.5 sm:p-4 text-left text-white transition hover:bg-black">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-white">
              <Smartphone className="h-4 w-4" />
            </span>
            <h2 className="mt-2 text-[14px] sm:text-[15px] font-semibold">Cero comisiones</h2>
            <p className="mt-1 text-[12px] sm:text-[13px] leading-snug text-white/70">
              No procesamos pagos ni cobramos comisión. Vos cobrás como siempre en tu negocio.
            </p>
          </article>
        </div>
      </main>

      {/* Footer sin scroll con la firma solicitada */}
      <footer className="shrink-0 border-t border-black/[0.05] py-3 text-center text-[12px] sm:text-[13px] text-subtle">
        © 2026 · CodigoMecha
      </footer>
    </div>
  );
}
