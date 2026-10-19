'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const ERRORS: Record<string, string> = {
  link: 'El link expiró o ya fue usado. Pedí uno nuevo (y abrilo en este mismo navegador).',
};

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>(error ? 'error' : 'idle');
  const [message, setMessage] = useState(error ? ERRORS[error] ?? 'No pudimos iniciar sesión.' : '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;

    setStatus('sending');
    setMessage('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: value,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(
        error.status === 429
          ? 'Pediste demasiados links. Esperá un minuto y probá de nuevo.'
          : 'No pudimos enviar el mail. Revisá la dirección.'
      );
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="mt-8 rounded-2xl bg-canvas p-5 text-center animate-fade-in">
        <MailCheck className="mx-auto h-8 w-8 text-ink" />
        <p className="mt-3 font-medium">Revisá tu mail</p>
        <p className="mt-1 text-sm text-muted">
          Te mandamos un link a <strong className="text-ink">{email}</strong>. Abrilo desde este
          mismo dispositivo.
        </p>
        <button type="button" className="btn-ghost mt-3" onClick={() => setStatus('idle')}>
          Usar otro mail
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-3">
      <label htmlFor="email" className="label">
        Email
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="vos@tubar.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input"
      />
      {status === 'error' && message && <p className="text-sm text-red-600">{message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={status === 'sending'}>
        {status === 'sending' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Enviarme el link <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
