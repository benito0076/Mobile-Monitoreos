import { supabase } from './supabase'

const MAX_POR_SESION = 20 // ponytail: tope fijo contra bucles de errores; sin deduplicar
let enviados = 0

// Best-effort: si no hay sesión o conexión, el error se pierde (no se encola) y nunca lanza.
export async function reportarError(e: unknown) {
  if (enviados >= MAX_POR_SESION) return
  enviados++
  const err = e instanceof Error ? e : new Error(String(e))
  try {
    await supabase.from('errores_cliente').insert({
      mensaje: err.message.slice(0, 500), pila: err.stack?.slice(0, 4000),
      url: location.href.slice(0, 300), version_app: __VERSION_APP__,
    })
  } catch { /* nada que hacer */ }
}

export function vigilarErrores() {
  addEventListener('error', (ev) => void reportarError(ev.error ?? ev.message))
  addEventListener('unhandledrejection', (ev) => void reportarError(ev.reason))
}
