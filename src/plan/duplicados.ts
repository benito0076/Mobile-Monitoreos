import type { SupabaseClient } from '@supabase/supabase-js'
import { todo } from '../datos/planes'

export interface Repetido { plan: string; codigos: string[] }
type Db = Pick<SupabaseClient, 'from'>

/** Agrupa por plan los códigos de muestra que ya existen en el servidor. */
export function agruparRepetidos(filas: { codigo: string; planes: { nombre: string } | null }[]): Repetido[] {
  const por = new Map<string, Set<string>>()
  for (const f of filas) {
    const plan = f.planes?.nombre ?? '(plan sin nombre)'
    por.set(plan, (por.get(plan) ?? new Set()).add(f.codigo))
  }
  return [...por].map(([plan, c]) => ({ plan, codigos: [...c].sort() })).sort((a, b) => b.codigos.length - a.codigos.length)
}

/** Códigos del archivo que ya están cargados en algún plan (la oficina ve todos por RLS). */
export async function buscarRepetidos(db: Db, codigos: string[]): Promise<Repetido[]> {
  const filas: { codigo: string; planes: { nombre: string } | null }[] = []
  for (let i = 0; i < codigos.length; i += 100) {
    const lote = codigos.slice(i, i + 100)
    filas.push(...(await todo<any>((a, b) => db.from('muestras').select('codigo,planes(nombre)').in('codigo', lote).order('id').range(a, b))))
  }
  return agruparRepetidos(filas)
}

export async function existePlanConNombre(db: Db, nombre: string): Promise<boolean> {
  const { data, error } = await db.from('planes').select('id').eq('nombre', nombre.trim()).limit(1)
  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0
}

export function textoRepetido(r: Repetido, total: number) {
  const ej = r.codigos.slice(0, 3).join(', ') + (r.codigos.length > 3 ? '…' : '')
  return `${r.codigos.length} de ${total} códigos ya están en el plan «${r.plan}» (${ej})`
}
