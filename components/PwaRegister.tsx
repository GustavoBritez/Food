'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[LaCarta PWA] Service Worker registrado:', reg.scope);
        })
        .catch((err) => {
          console.warn('[LaCarta PWA] Error al registrar Service Worker:', err);
        });
    }
  }, []);

  return null;
}
