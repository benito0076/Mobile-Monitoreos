import type { SupabaseClient } from '@supabase/supabase-js'
import { metaSet } from './db-local'

/** Mide servidor − teléfono (s) y lo guarda; cada medición lleva el último valor medido con señal. */
export async function medirDesfase(db: Pick<SupabaseClient, 'rpc'>) {
  const t0 = Date.now()
  const { data, error } = await db.rpc('hora_servidor')
  const t1 = Date.now()
  if (error || !data) return
  await metaSet('desfase_reloj_s', (Date.parse(data) - (t0 + t1) / 2) / 1000)
}
