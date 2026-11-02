// Envíos de muestras al laboratorio: cada envío lleva su cadena de custodia (FM-017) y cada muestra va en un solo envío.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DatosPlan } from '../exportar/exportador'
import { local, type EnvioLocal, type MuestraLocal } from './db-local'

export const MEDIOS_TRANSPORTE = [
  { valor: 'terrestre', etiqueta: 'Terrestre' }, { valor: 'aereo', etiqueta: 'Aéreo' }, { valor: 'acuatico', etiqueta: 'Acuático' },
] as const
/** Verificaciones de campo que pide el encabezado de la cadena de custodia. */
export const CONTROLES = [
  { clave: 'nivel', etiqueta: 'Marcación del nivel de las muestras' },
  { clave: 'preservacion', etiqueta: 'Verificación de la preservación en campo' },
  { clave: 'refrigeracion', etiqueta: 'Refrigeración en cada nevera' },
  { clave: 'rotulacion', etiqueta: 'Rotulación de las muestras' },
] as const

/** Fecha de hoy en hora local (AAAA-MM-DD), que es la que ve la comisión. */
export const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fechaLegible = (f: string) => f.split('-').reverse().join('/')

export interface NuevoEnvio {
  plan_id: string; muestraIds: string[]; fecha: string; usuario_id: string
  medio_transporte?: string | null; controles?: Record<string, boolean>; temperatura_testigo?: string | null
  observaciones?: string | null; entrega?: string | null
}

const vacio = (t?: string | null) => (t?.trim() ? t.trim() : null)

/** Muestras cerradas de un plan que todavía no van en ningún envío. */
export async function muestrasPorEnviar(plan_id: string): Promise<MuestraLocal[]> {
  const enviadas = new Set((await local.envioMuestras.toArray()).map((x) => x.muestra_id))
  return (await local.muestras.where('plan_id').equals(plan_id).sortBy('codigo')).filter((m) => m.estado === 'cerrada' && !enviadas.has(m.id))
}

/** Crea el envío en el teléfono (se sincroniza solo). Una muestra no puede ir en dos envíos. */
export async function crearEnvioLocal(n: NuevoEnvio): Promise<EnvioLocal> {
  if (!n.muestraIds.length) throw new Error('Elige al menos una muestra')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.fecha)) throw new Error('La fecha del envío no es válida')
  return local.transaction('rw', [local.envios, local.envioMuestras, local.muestras], async () => {
    const enviadas = new Map((await local.envioMuestras.bulkGet(n.muestraIds)).map((x, i) => [n.muestraIds[i], x]))
    for (const id of n.muestraIds) {
      const m = await local.muestras.get(id)
      if (!m || m.plan_id !== n.plan_id) throw new Error('La muestra no pertenece a este plan')
      if (m.estado !== 'cerrada') throw new Error(`La muestra ${m.codigo} no está cerrada`)
      const previo = enviadas.get(id)
      if (previo) {
        const e = await local.envios.get(previo.envio_id)
        throw new Error(`La muestra ${m.codigo} ya va en el envío del ${e ? fechaLegible(e.fecha) : 'otro día'}`)
      }
    }
    const e: EnvioLocal = {
      id: crypto.randomUUID(), plan_id: n.plan_id, fecha: n.fecha, hora_telefono: new Date().toISOString(), usuario_id: n.usuario_id,
      medio_transporte: vacio(n.medio_transporte), controles: n.controles ?? {}, temperatura_testigo: vacio(n.temperatura_testigo),
      observaciones: vacio(n.observaciones), entrega: vacio(n.entrega), sincronizado: 0,
    }
    await local.envios.add(e)
    await local.envioMuestras.bulkAdd(n.muestraIds.map((muestra_id) => ({ envio_id: e.id, muestra_id, sincronizado: 0 })))
    return e
  })
}

export interface EnvioVista { id: string; fecha: string; muestras: number; pendiente: boolean; error?: string }

/** Envíos vigentes (no anulados) de un plan, del más reciente al más antiguo. */
export async function enviosDelPlan(plan_id: string): Promise<EnvioVista[]> {
  const envios = (await local.envios.where('plan_id').equals(plan_id).toArray()).filter((e) => !e.anulado_en)
  const filas = await local.envioMuestras.where('envio_id').anyOf(envios.map((e) => e.id)).toArray()
  return envios.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora_telefono.localeCompare(a.hora_telefono)).map((e) => {
    const suyas = filas.filter((x) => x.envio_id === e.id)
    return { id: e.id, fecha: e.fecha, muestras: suyas.length, pendiente: e.sincronizado === 0 || suyas.some((x) => x.sincronizado === 0), error: e.error_sync ?? suyas.find((x) => x.error_sync)?.error_sync }
  })
}

/** Fecha del envío de cada muestra del plan que ya fue enviada (para mostrarlo en la lista). */
export async function fechaEnvioPorMuestra(plan_id: string): Promise<Map<string, string>> {
  const envios = new Map((await local.envios.where('plan_id').equals(plan_id).toArray()).filter((e) => !e.anulado_en).map((e) => [e.id, e.fecha]))
  const res = new Map<string, string>()
  for (const x of await local.envioMuestras.where('envio_id').anyOf([...envios.keys()]).toArray()) res.set(x.muestra_id, envios.get(x.envio_id)!)
  return res
}

/** Lo que necesita la cadena de custodia de un envío, armado con lo que hay en el teléfono. */
export async function datosDeEnvioLocal(envio_id: string) {
  const envio = await local.envios.get(envio_id)
  if (!envio) throw new Error('El envío no existe en este teléfono')
  const plan = await local.planes.get(envio.plan_id)
  const ids = (await local.envioMuestras.where('envio_id').equals(envio_id).toArray()).map((x) => x.muestra_id)
  const muestras = (await local.muestras.bulkGet(ids)).filter((m): m is MuestraLocal => !!m)
  const datos: DatosPlan = {
    plan: { nombre: plan?.nombre ?? '' },
    muestras: muestras.map((m) => ({ id: m.id, codigo: m.codigo, punto_texto: m.punto_texto, fecha_planeada: m.fecha_planeada, tipo: m.tipo, matriz: m.matriz, submatriz: m.submatriz, estado: m.estado })),
    parametros: (await local.muestraParametros.where('muestra_id').anyOf(ids).toArray()).map((p) => ({ muestra_id: p.muestra_id, parametro: p.parametro, es_insitu: p.es_insitu })),
    mediciones: (await local.mediciones.where('muestra_id').anyOf(ids).toArray()).map((x) => ({ ...x, marcada: false, motivo_marca: null })),
    descripciones: [], fotos: [], usuarios: {},
  }
  return { datos, ficha: plan?.ficha ?? {}, tecnicos: plan?.tecnicos ?? [], envio }
}

type Db = Pick<SupabaseClient, 'from'>
const PAGINA = 1000
async function todos<T>(consulta: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const filas: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    filas.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGINA) return filas
  }
}

/**
 * Trae los envíos del plan que hizo el compañero (o la oficina) y aplica las anulaciones. No pisa lo pendiente de este teléfono.
 * Si falla (sin señal o servidor sin esta función), el plan se descarga igual.
 */
export async function bajarEnvios(db: Db, plan_id: string) {
  try {
    const [envios, uniones] = await Promise.all([
      todos<any>((a, b) => db.from('envios').select('*').eq('plan_id', plan_id).order('id').range(a, b)),
      todos<any>((a, b) => db.from('envio_muestras').select('envio_id,muestra_id,muestras!inner(plan_id)').eq('muestras.plan_id', plan_id).order('muestra_id').range(a, b)),
    ])
    const bajado_en = new Date().toISOString()
    await local.transaction('rw', [local.envios, local.envioMuestras], async () => {
      for (const { hora_servidor: _, ...e } of envios) {
        const ya = await local.envios.get(e.id)
        if (!ya) await local.envios.add({ ...e, sincronizado: 1, bajado_en })
        else if (e.anulado_en && !ya.anulado_en) await local.envios.update(e.id, { anulado_en: e.anulado_en, sincronizado: 1 })
        if (e.anulado_en) await local.envioMuestras.where('envio_id').equals(e.id).delete()
      }
      const anulados = new Set(envios.filter((e: any) => e.anulado_en).map((e: any) => e.id))
      for (const { muestras: _, ...u } of uniones) {
        if (anulados.has(u.envio_id) || (await local.envioMuestras.get(u.muestra_id))) continue
        await local.envioMuestras.add({ ...u, sincronizado: 1, bajado_en })
      }
    })
  } catch {
    // Opcional: no debe impedir descargar o sincronizar el plan.
  }
}
