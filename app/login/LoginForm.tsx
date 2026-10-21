'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, KeyRound, Loader2, MailCheck, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'sending' | 'sent' | 'verifying' | 'error';

const ERRORS: Record<string, string> = {
  link: 'El link expiró o ya fue usado. Podés pedir uno nuevo o ingresar el código numérico de tu correo.',
};

export function LoginForm({ next, error }: { next: string; error?: string }) {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [status, setStatus] = useState<Status>(error ? 'error' : 'idle');
  const [message, setMessage] = useState(error ? ERRORS[error] ?? 'No pudimos iniciar sesión.' : '');
  const [cooldown, setCooldown] = useState(0);

  // Cuenta regresiva para respetar el rate limit de Supabase (60s entre envíos)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Envío de Magic Link (OTP)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || cooldown > 0) return;

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
      console.error('Error al enviar Magic Link:', error);
      setStatus('error');
      if (error.status === 429) {
        setCooldown(60);
        setMessage(
          'Supabase limitó los envíos por seguridad (máximo 1 solicitud cada 60s). Esperá que termine la cuenta regresiva.'
        );
      } else if (
        error.message?.toLowerCase().includes('confirmation email') ||
        error.message?.toLowerCase().includes('error sending')
      ) {
        setMessage(
          'Error del servidor de correo. Si usás Resend en modo de prueba, recordá que solo podés enviar correos a tu email registrado.'
        );
      } else {
        setMessage(error.message || 'No pudimos enviar el mail. Revisá la dirección.');
      }
      return;
    }

    setCooldown(60);
    setStatus('sent');
  }

  // Verificación de código numérico de 6 dígitos
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const cleanToken = otpCode.trim();
    if (!cleanToken) return;

    setStatus('verifying');
    setMessage('');

    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      console.error('Error al verificar código OTP:', error);
      setStatus('sent');
      setMessage('El código de 6 dígitos es incorrecto o venció. Revisá tu casilla de correo.');
      return;
    }

    if (data.session) {
      window.location.href = next || '/admin';
    }
  }

  // Pantalla cuando el correo ya fue enviado
  if (status === 'sent' || status === 'verifying') {
    return (
      <div className="mt-6 rounded-2xl bg-canvas p-5 text-center animate-fade-in border border-black/5">
        <MailCheck className="mx-auto h-9 w-9 text-emerald-600" />
        <h2 className="mt-3 text-[17px] font-bold text-ink">Revisá tu correo</h2>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          Te enviamos un enlace y un código numérico a <br />
          <strong className="text-ink font-semibold">{email}</strong>
        </p>
        <p className="mt-1 text-[11px] text-subtle">
          (Si no lo ves, revisá también la carpeta de <strong>Spam</strong> o <strong>Promociones</strong>).
        </p>

        {/* Opción alternativa: Código numérico de 6 dígitos */}
        <form onSubmit={handleVerifyOtp} className="mt-5 border-t border-black/[0.08] pt-4 text-left">
          <label htmlFor="otp-input" className="label text-[12px] flex items-center gap-1.5 font-semibold text-ink">
            <KeyRound className="h-3.5 w-3.5 text-emerald-600" /> O ingresá el código de 6 dígitos del mail:
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="otp-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              className="input font-mono tracking-widest text-center text-lg font-bold"
              autoFocus
            />
            <button
              type="submit"
              disabled={status === 'verifying' || !otpCode.trim()}
              className="btn-primary shrink-0 px-4"
            >
              {status === 'verifying' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </button>
          </div>
        </form>

        {message && <p className="mt-3 text-xs text-red-600 font-medium">{message}</p>}

        <div className="mt-5 flex flex-col items-center gap-2 border-t border-black/[0.08] pt-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={cooldown > 0 || status === 'verifying'}
            className="text-[12px] text-muted hover:text-ink disabled:opacity-50 flex items-center gap-1 font-medium"
          >
            <RefreshCw className={`h-3 w-3 ${cooldown > 0 ? 'animate-spin' : ''}`} />
            {cooldown > 0 ? `Reenviar enlace en ${cooldown}s` : '¿No llegó? Reenviar correo'}
          </button>

          <button
            type="button"
            className="btn-ghost text-xs text-subtle"
            onClick={() => {
              setStatus('idle');
              setMessage('');
              setOtpCode('');
            }}
          >
            Usar otro correo
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="label font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="gustavo.britez.alv@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>

      {status === 'error' && message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">
          <p className="font-semibold text-red-800">No pudimos enviar el link</p>
          <p className="mt-0.5">{message}</p>
        </div>
      )}

      <button
        type="submit"
        className="btn-primary w-full h-11"
        disabled={status === 'sending' || cooldown > 0}
      >
        {status === 'sending' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : cooldown > 0 ? (
          `Esperá ${cooldown}s para reintentar`
        ) : (
          <>
            Enviarme el link <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
