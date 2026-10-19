'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[Carta App PWA] Service Worker registrado:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Carta App PWA] Error al registrar Service Worker:', err);
        });
    }
  }, []);

  return null;
}
