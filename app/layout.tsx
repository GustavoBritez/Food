import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { PwaRegister } from '@/components/PwaRegister';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'LaCarta · Tu menú digital en 2 minutos',
    template: '%s · LaCarta',
  },
  description:
    'Creá el menú digital de tu bar o restaurante en 2 minutos con LaCarta. Tus clientes escanean el QR, le muestran el pedido al mozo o te piden por WhatsApp.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LaCarta',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${inter.variable} h-full`}>
      <body className="h-full min-h-dvh bg-white antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
