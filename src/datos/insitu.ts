import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParametroInsitu } from './db-local'
import { parsearValor } from './validar-medicion'

type Db = Pick<SupabaseClient, 'from' | 'rpc'>

export interface BorradorInsitu { nombre: string; unidad: string; minimo: string; maximo: string; obligatorio: boolean }

const numero = (t: string, etiqueta: string) => {
  if (!t.trim()) return null
  const n = parsearValor(t)
  if (n === null) throw new Error(`${etiqueta} debe ser un número (o dejarlo vacío)`)
  return n
}

/** Texto de los campos → fila de la tabla. Vacío = sin límite. Los rangos solo advierten, no bloquean. */
export function aFilaInsitu(b: BorradorInsitu): ParametroInsitu {
  if (!b.nombre) throw new Error('Elige el parámetro')
  const minimo = numero(b.minimo, 'El mínimo'), maximo = numero(b.maximo, 'El máximo')
  if (minimo !== null && maximo !== null && minimo > maximo) throw new Error('El mínimo no puede ser mayor que el máximo')
  return { nombre: b.nombre, unidad: b.unidad.trim(), minimo, maximo, obligatorio: b.obligatorio }
}

const falla = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

export async function listarInsitu(db: Db) {
  const { data, error } = await db.from('parametros_insitu').select('*').order('nombre')
  falla(error); return data as ParametroInsitu[]
}
export async function guardarInsitu(db: Db, fila: ParametroInsitu) {
  falla((await db.from('parametros_insitu').upsert(fila, { onConflict: 'nombre' })).error)
}
export async function quitarInsitu(db: Db, nombre: string) {
  falla((await db.from('parametros_insitu').delete().eq('nombre', nombre)).error)
}
/** Nombres exactos (con sus espacios) de los parámetros de los planes cargados. */
export async function nombresParametros(db: Db) {
  const { data, error } = await db.rpc('nombres_parametros'); falla(error)
  return data as { parametro: string; es_insitu: boolean }[]
}
/** Vuelve a marcar los planes ya cargados con la lista actual; devuelve cuántos parámetros cambiaron. */
export async function reaplicarInsitu(db: Db) {
  const { data, error } = await db.rpc('reaplicar_insitu'); falla(error)
  return data as number
}
