import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatosPlan } from '../exportar/exportador'
import { todo } from './planes'

/** Lee del servidor todo lo de un plan (la oficina lo ve entero por RLS). */
export async function cargarDatosPlan(db: Pick<SupabaseClient, 'from'>, plan: { id: string; nombre: string }): Promise<DatosPlan> {
  const q = (tabla: string, cols: string, filtro: (c: any) => any, orden = 'id') =>
    todo<any>((a, b) => filtro(db.from(tabla).select(cols)).order(orden).range(a, b))
  const [muestras, parametros, mediciones, descripciones, fotos, perfiles] = await Promise.all([
    q('muestras', '*', (c) => c.eq('plan_id', plan.id)),
    q('muestra_parametros', 'muestra_id,parametro,es_insitu,muestras!inner(plan_id)', (c) => c.eq('muestras.plan_id', plan.id)),
    q('mediciones', '*,muestras!inner(plan_id)', (c) => c.eq('muestras.plan_id', plan.id)),
    q('descripciones_punto', 'muestra_id,texto,version,muestras!inner(plan_id)', (c) => c.eq('muestras.plan_id', plan.id)),
    q('fotos', '*,muestras!inner(plan_id)', (c) => c.eq('muestras.plan_id', plan.id)),
    q('perfiles', 'id,nombre', (c) => c),
  ])
  return {
    plan, muestras, parametros, mediciones, descripciones, fotos,
    usuarios: Object.fromEntries(perfiles.map((p: any) => [p.id, p.nombre || p.id])),
  }
}
