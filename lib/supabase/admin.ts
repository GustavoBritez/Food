import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente Supabase Admin con SERVICE_ROLE_KEY.
 * EXCLUSIVO para operaciones backend de servidor (Webhooks de Mercado Pago, activación de prueba, tareas de sistema).
 * Este cliente BYPASSEA las políticas RLS y posee permisos totales de lectura y escritura.
 * NUNCA debe ser importado en componentes de cliente ni expuesto en el bundle del navegador.
 */
export function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno del servidor.'
    );
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
