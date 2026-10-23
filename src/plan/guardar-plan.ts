import type { SupabaseClient } from '@supabase/supabase-js'
import type { MuestraPlan } from './leer-excel'

/** Guarda plan, muestras y parámetros en una sola transacción (función SQL cargar_plan). Devuelve el id del plan. */
export async function guardarPlan(db: Pick<SupabaseClient, 'rpc'>, nombre: string, archivo: string, muestras: MuestraPlan[]) {
  const { data, error } = await db.rpc('cargar_plan', { p_nombre: nombre, p_archivo: archivo, p_muestras: muestras })
  if (error) throw new Error(error.message)
  return data as string
}
