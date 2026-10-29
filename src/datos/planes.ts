import type { SupabaseClient } from '@supabase/supabase-js'
import { local, type MuestraParametroLocal } from './db-local'
import type { FichaCustodia } from '../exportar/custodia-pdf'

export interface PlanDisponible { id: string; nombre: string; comision_id: string | null; comision_id_2?: string | null; creado_en: string; ficha?: FichaCustodia }
type Db = Pick<SupabaseClient, 'from' | 'rpc'>

const PAGINA = 1000 // tope por defecto de PostgREST

export async function todo<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const filas: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    filas.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGINA) return filas
  }
}

/** Planes libres y el que ya tiene esta comisión (RLS filtra el resto). */
export function planesVisibles(db: Db) {
  return todo<PlanDisponible>((a, b) => db.from('planes').select('id,nombre,comision_id,comision_id_2,creado_en,ficha').order('creado_en').range(a, b))
}

/** Descarga el plan completo al teléfono, reemplazando lo anterior de ese plan en una sola transacción. */
export async function descargarPlan(db: Db, plan: { id: string; nombre: string }, comisionId: string) {
  const muestras = await todo<any>((a, b) => db.from('muestras').select('*').eq('plan_id', plan.id).order('codigo').range(a, b))
  const filas = await todo<any>((a, b) =>
    db.from('muestra_parametros').select('id,muestra_id,parametro,es_insitu,muestras!inner(plan_id)').eq('muestras.plan_id', plan.id).order('id').range(a, b))
  const parametros: MuestraParametroLocal[] = filas.map(({ muestras: _, ...p }) => p)
  const insitu = await todo<any>((a, b) => db.from('parametros_insitu').select('*').range(a, b))
  const config = await todo<any>((a, b) => db.from('configuracion').select('*').range(a, b))
  // Lo que ya registró el compañero (o este mismo usuario desde otro teléfono): así los dos ven lo mismo y pueden corregirlo.
  const delPlan = (tabla: string, cols: string) =>
    todo<any>((a, b) => db.from(tabla).select(`${cols},muestras!inner(plan_id)`).eq('muestras.plan_id', plan.id).order('id').range(a, b))
  const mediciones = await delPlan('mediciones', 'id,muestra_id,parametro,alicuota,valor,unidad,hora_telefono,desfase_reloj_s,lat,lon,precision_m,usuario_id,equipo_id,version_app,version,reemplaza_a,motivo_correccion')
  const descripciones = await delPlan('descripciones_punto', 'id,muestra_id,texto,hora_telefono,usuario_id,version,reemplaza_a,motivo_correccion')

  await local.transaction('rw', [local.planes, local.muestras, local.muestraParametros, local.parametrosInsitu, local.config, local.mediciones, local.descripciones], async () => {
    const previas = await local.muestras.where('plan_id').equals(plan.id).toArray()
    const pendientes = new Map(previas.filter((m) => m.estado_pendiente).map((m) => [m.id, m]))
    for (const m of muestras) if (pendientes.has(m.id)) Object.assign(m, { estado: pendientes.get(m.id)!.estado, estado_pendiente: 1 })
    const ids = previas.map((m) => m.id)
    await local.muestraParametros.where('muestra_id').anyOf(ids).delete()
    await local.muestras.where('plan_id').equals(plan.id).delete()
    await local.planes.put({ id: plan.id, nombre: plan.nombre, comision_id: comisionId, descargado_en: new Date().toISOString() })
    await local.muestras.bulkPut(muestras)
    await local.muestraParametros.bulkPut(parametros)
    await local.parametrosInsitu.clear(); await local.parametrosInsitu.bulkPut(insitu)
    await local.config.clear(); await local.config.bulkPut(config.map((c) => ({ clave: c.clave, valor: Number(c.valor) })))
    // Solo se agrega lo que falta: lo que ya está en este teléfono (incluido lo pendiente de enviar) no se toca.
    const bajado_en = new Date().toISOString()
    for (const [tabla, filas] of [[local.mediciones, mediciones], [local.descripciones, descripciones]] as const) {
      const ya = await (tabla as any).bulkGet(filas.map((f) => f.id))
      await (tabla as any).bulkAdd(filas.filter((_, i) => !ya[i]).map(({ muestras: _, ...f }) => ({ ...f, sincronizado: 1, bajado_en })))
    }
  })
  return muestras.length
}

/** Elige el plan (requiere conexión). 'tomado' = otra comisión lo tomó antes; no se escribe nada local. */
export async function tomarPlan(db: Db, plan: { id: string; nombre: string }, comisionId: string): Promise<'ok' | 'tomado'> {
  const { data, error } = await db.rpc('tomar_plan', { p_plan: plan.id })
  if (error) throw new Error(error.message)
  if (!data) return 'tomado'
  await descargarPlan(db, plan, comisionId)
  return 'ok'
}
