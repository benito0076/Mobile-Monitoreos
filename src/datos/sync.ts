import type { SupabaseClient } from '@supabase/supabase-js'
import { RETENCION_DIAS } from '../config'
import { local } from './db-local'

type Db = Pick<SupabaseClient, 'from' | 'storage'>
type Fila = Record<string, unknown>
interface Opciones { esperaMs?: number; lote?: number }

export interface Resultado {
  enviados: { mediciones: number; descripciones: number; fotos: number; muestras: number; envios: number }
  errores: string[]
  sinConexion: boolean
}

class SinConexion extends Error {}
// Los errores de PostgREST/Storage traen código; un fallo de red no.
const esRed = (e: { code?: string; statusCode?: string } | null) => !!e && !e.code && !e.statusCode

/** Reintenta con espera creciente solo los fallos de red; el resto se devuelve para tratarlo. */
async function pedir<T extends { error: any }>(fn: () => PromiseLike<T>, esperaMs: number): Promise<T> {
  for (let intento = 0; ; intento++) {
    const r = await fn()
    if (!esRed(r.error)) return r
    if (intento === 2) throw new SinConexion(r.error.message)
    await new Promise((ok) => setTimeout(ok, esperaMs * 2 ** intento))
  }
}

export async function pendientes() {
  const [mediciones, descripciones, fotos, muestras, envios, enviosMuestras] = await Promise.all([
    local.mediciones.where('sincronizado').equals(0).count(),
    local.descripciones.where('sincronizado').equals(0).count(),
    local.fotos.where('sincronizado').equals(0).count(),
    local.muestras.filter((m) => !!m.estado_pendiente).count(),
    local.envios.where('sincronizado').equals(0).count(),
    local.envioMuestras.where('sincronizado').equals(0).count(),
  ])
  return { mediciones, descripciones, fotos, muestras, envios: envios + enviosMuestras, total: mediciones + descripciones + fotos + muestras + envios + enviosMuestras }
}

type Versionado = { id: string; version: number; reemplaza_a?: string | null; sincronizado: number; error_sync?: string }
const LOCALES = ['sincronizado', 'error_sync', 'bajado_en']
const limpio = (r: object): Fila => Object.fromEntries(Object.entries(r).filter(([k]) => !LOCALES.includes(k)))

/**
 * Envía los pendientes de una tabla con upsert sobre el UUID (reintentar nunca duplica). Orden por versión:
 * cada corrección llega después de la que reemplaza. Solo se marca sincronizado lo que el servidor confirmó.
 * Si una versión es rechazada, las correcciones que la reemplazan se omiten en esta corrida para no fallar en cascada.
 */
async function enviar<T extends Versionado>(db: Db, tabla: string, filas: T[], marcar: (ids: string[]) => Promise<unknown>, fallo: (id: string, msg: string) => Promise<unknown>, o: Required<Opciones>, errores: string[]) {
  let enviados = 0
  const rechazados = new Set<string>()
  const subir = (lote: T[]) => pedir(() => db.from(tabla).upsert(lote.map(limpio), { onConflict: 'id', ignoreDuplicates: true }), o.esperaMs)
  const porVersion = [...new Set(filas.map((f) => f.version))].sort((a, b) => a - b)
  for (const v of porVersion) {
    const grupo: T[] = []
    for (const f of filas.filter((x) => x.version === v)) {
      if (f.reemplaza_a && rechazados.has(f.reemplaza_a)) {
        rechazados.add(f.id)
        const msg = 'Pendiente de que se corrija la versión anterior rechazada'
        await fallo(f.id, msg)
        errores.push(`${tabla} ${f.id}: ${msg}`)
      } else {
        grupo.push(f)
      }
    }
    for (let i = 0; i < grupo.length; i += o.lote) {
      const lote = grupo.slice(i, i + o.lote)
      const { error } = await subir(lote)
      if (!error) { await marcar(lote.map((f) => f.id)); enviados += lote.length; continue }
      // Rechazo del servidor: se aísla la fila culpable para que no frene al resto.
      for (const f of lote) {
        const r = await subir([f])
        if (!r.error) { await marcar([f.id]); enviados++ }
        else { rechazados.add(f.id); await fallo(f.id, r.error.message); errores.push(`${tabla} ${f.id}: ${r.error.message}`) }
      }
    }
  }
  return enviados
}

async function subirFotos(db: Db, o: Required<Opciones>, errores: string[]) {
  let enviados = 0
  for (const f of await local.fotos.where('sincronizado').equals(0).toArray()) {
    const sub = await pedir(() => db.storage.from('fotos').upload(f.ruta_storage, f.blob, { contentType: 'image/jpeg' }), o.esperaMs)
    if (sub.error && !/already exists|duplicate/i.test(sub.error.message)) { // ya subida en un intento anterior = confirmada
      await local.fotos.update(f.id, { error_sync: sub.error.message }); errores.push(`foto ${f.id}: ${sub.error.message}`); continue
    }
    const { blob: _, ...fila } = f
    const r = await pedir(() => db.from('fotos').upsert(limpio(fila), { onConflict: 'id', ignoreDuplicates: true }), o.esperaMs)
    if (r.error) { await local.fotos.update(f.id, { error_sync: r.error.message }); errores.push(`foto ${f.id}: ${r.error.message}`); continue }
    await local.fotos.update(f.id, { sincronizado: 1, error_sync: undefined }); enviados++
  }
  return enviados
}

let enCurso: Promise<Resultado> | null = null

/** Sincroniza todo lo pendiente. Si ya hay una en curso (botón + evento "online"), devuelve esa misma. */
export function sincronizar(db: Db, opciones: Opciones = {}): Promise<Resultado> {
  return (enCurso ??= ejecutar(db, { esperaMs: 1000, lote: 200, ...opciones }).finally(() => { enCurso = null }))
}

async function ejecutar(db: Db, o: Required<Opciones>): Promise<Resultado> {
  const res: Resultado = { enviados: { mediciones: 0, descripciones: 0, fotos: 0, muestras: 0, envios: 0 }, errores: [], sinConexion: false }
  const marcar = (t: 'mediciones' | 'descripciones') => (ids: string[]) =>
    (local[t] as any).where('id').anyOf(ids).modify({ sincronizado: 1, error_sync: undefined })
  const fallo = (t: 'mediciones' | 'descripciones') => (id: string, msg: string) => (local[t] as any).update(id, { error_sync: msg })
  try {
    for (const t of ['mediciones', 'descripciones'] as const) {
      const filas = await (local[t] as any).where('sincronizado').equals(0).toArray()
      res.enviados[t] = await enviar(db, t === 'mediciones' ? 'mediciones' : 'descripciones_punto', filas, marcar(t), fallo(t), o, res.errores)
    }
    res.enviados.fotos = await subirFotos(db, o, res.errores)
    // El estado va al final: una muestra no figura cerrada en el servidor antes de que lleguen sus datos.
    for (const m of await local.muestras.filter((x) => !!x.estado_pendiente).toArray()) {
      const r = await pedir(() => db.from('muestras').update({ estado: m.estado }).eq('id', m.id).select('id'), o.esperaMs)
      if (r.error && /cerrada no se reabre/i.test(r.error.message)) {
        // El otro integrante de la comisión ya cerró esta muestra en el servidor: adoptamos el estado cerrado y limpiamos el pendiente.
        await local.muestras.update(m.id, { estado: 'cerrada', estado_pendiente: 0 })
        res.enviados.muestras++
      } else if (r.error || !r.data?.length) {
        res.errores.push(`muestra ${m.codigo}: ${r.error?.message ?? 'el servidor no la actualizó (¿plan reasignado?)'}`)
      } else {
        await local.muestras.update(m.id, { estado_pendiente: 0 }); res.enviados.muestras++
      }
    }
    await enviarEnvios(db, o, res)
  } catch (e) {
    if (!(e instanceof SinConexion)) throw e
    res.sinConexion = true
  }
  return res
}

/** Envíos al laboratorio: primero el envío y después sus muestras (que ya llegaron cerradas). Reintentar nunca duplica. */
async function enviarEnvios(db: Db, o: Required<Opciones>, res: Resultado) {
  for (const e of await local.envios.where('sincronizado').equals(0).toArray()) {
    const r = await pedir(() => db.from('envios').upsert(limpio(e), { onConflict: 'id', ignoreDuplicates: true }), o.esperaMs)
    if (r.error) { await local.envios.update(e.id, { error_sync: r.error.message }); res.errores.push(`envío ${e.fecha}: ${r.error.message}`); continue }
    await local.envios.update(e.id, { sincronizado: 1, error_sync: undefined }); res.enviados.envios++
  }
  for (const u of await local.envioMuestras.where('sincronizado').equals(0).toArray()) {
    if ((await local.envios.get(u.envio_id))?.sincronizado !== 1) continue // el envío aún no llegó
    const r = await pedir(() => db.from('envio_muestras').upsert(limpio(u), { onConflict: 'envio_id,muestra_id', ignoreDuplicates: true }), o.esperaMs)
    if (r.error) {
      const m = /duplicate|unique|envio_muestras_muestra_id_key/i.test(r.error.message) ? 'La muestra ya va en otro envío; avisa a la oficina' : r.error.message
      await local.envioMuestras.update(u.muestra_id, { error_sync: m }); res.errores.push(`envío de la muestra ${u.muestra_id}: ${m}`); continue
    }
    await local.envioMuestras.update(u.muestra_id, { sincronizado: 1, error_sync: undefined })
  }
}

/** Borra lo ya confirmado que tenga más de RETENCION_DIAS días; lo pendiente nunca se borra. */
export async function purgarConfirmados(dias = RETENCION_DIAS, ahora = Date.now()) {
  const limite = new Date(ahora - dias * 86400000).toISOString()
  for (const t of [local.mediciones, local.descripciones, local.fotos] as any[])
    await t.where('sincronizado').equals(1).filter((r: { hora_telefono: string; bajado_en?: string }) => (r.bajado_en ?? r.hora_telefono) < limite).delete()
}
