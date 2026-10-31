import { zipSync } from 'fflate'
import type { SupabaseClient } from '@supabase/supabase-js'
import { local } from './db-local'

type Db = Pick<SupabaseClient, 'from' | 'storage'>

async function base64(b: Blob) {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

function deBase64(s: string): Uint8Array {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Toda la jornada guardada en el teléfono (confirmada o no) en un solo archivo JSON, fotos incluidas. */
export async function exportarJornada(): Promise<{ nombre: string; blob: Blob }> {
  const planes = await local.planes.toArray()
  const fotos = await Promise.all((await local.fotos.toArray()).map(async ({ blob, ...f }) => ({ ...f, jpeg_base64: await base64(blob) })))
  const datos = {
    exportado_en: new Date().toISOString(), version_app: __VERSION_APP__, planes,
    muestras: await local.muestras.toArray(),
    mediciones: await local.mediciones.toArray(),
    descripciones: await local.descripciones.toArray(),
    fotos,
  }
  const nombre = `jornada_${(planes.length === 1 ? planes[0].nombre : planes.length > 1 ? 'varios-planes' : 'sin-plan').replace(/[^\w-]+/g, '_')}_${datos.exportado_en.slice(0, 10)}.json`
  return { nombre, blob: new Blob([JSON.stringify(datos)], { type: 'application/json' }) }
}

export async function descargarJornada() {
  const { nombre, blob } = await exportarJornada()
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre })
  a.click(); URL.revokeObjectURL(a.href)
}

const LOCALES = ['sincronizado', 'error_sync', 'bajado_en', 'jpeg_base64', 'blob']
const limpiar = (r: Record<string, unknown>) => Object.fromEntries(Object.entries(r).filter(([k]) => !LOCALES.includes(k)))

export interface ResultadoImportacion {
  mediciones: number
  descripciones: number
  fotos: number
  muestras: number
  errores: string[]
}

/**
 * Importa en el servidor un archivo JSON generado por la «Exportación de emergencia» de un teléfono
 * (por ejemplo, cuando el plan se liberó o reasignó antes de que la comisión sincronizara).
 */
export async function importarJornada(db: Db, textoJson: string): Promise<ResultadoImportacion> {
  const j = JSON.parse(textoJson)
  if (!j || (!Array.isArray(j.mediciones) && !Array.isArray(j.descripciones) && !Array.isArray(j.fotos))) {
    throw new Error('El archivo no tiene el formato de una exportación de emergencia')
  }
  const res: ResultadoImportacion = { mediciones: 0, descripciones: 0, fotos: 0, muestras: 0, errores: [] }

  for (const [clave, tabla] of [['mediciones', 'mediciones'], ['descripciones', 'descripciones_punto']] as const) {
    const filas: any[] = Array.isArray(j[clave]) ? j[clave] : []
    const versiones = [...new Set(filas.map((f) => Number(f.version) || 1))].sort((a, b) => a - b)
    for (const v of versiones) {
      const grupo = filas.filter((f) => (Number(f.version) || 1) === v).map(limpiar)
      if (!grupo.length) continue
      const { error } = await db.from(tabla).upsert(grupo, { onConflict: 'id', ignoreDuplicates: true })
      if (!error) { res[clave] += grupo.length; continue }
      for (const f of grupo) {
        const r = await db.from(tabla).upsert([f], { onConflict: 'id', ignoreDuplicates: true })
        if (!r.error) res[clave]++
        else res.errores.push(`${tabla} ${f.id}: ${r.error.message}`)
      }
    }
  }

  for (const f of (Array.isArray(j.fotos) ? j.fotos : [])) {
    if (typeof f.jpeg_base64 === 'string' && typeof f.ruta_storage === 'string') {
      const bytes = deBase64(f.jpeg_base64)
      const sub = await db.storage.from('fotos').upload(f.ruta_storage, new Blob([bytes as BlobPart], { type: 'image/jpeg' }), { contentType: 'image/jpeg' })
      if (sub.error && !/already exists|duplicate/i.test(sub.error.message)) {
        res.errores.push(`foto ${f.id}: ${sub.error.message}`); continue
      }
    }
    const r = await db.from('fotos').upsert(limpiar(f), { onConflict: 'id', ignoreDuplicates: true })
    if (r.error) res.errores.push(`foto ${f.id}: ${r.error.message}`)
    else res.fotos++
  }

  for (const m of (Array.isArray(j.muestras) ? j.muestras : [])) {
    if (!m?.id || !m?.estado || m.estado === 'pendiente') continue
    const r = await db.from('muestras').update({ estado: m.estado }).eq('id', m.id)
    if (!r.error || /cerrada no se reabre/i.test(r.error.message)) res.muestras++
    else res.errores.push(`muestra ${m.codigo ?? m.id}: ${r.error.message}`)
  }

  return res
}

/** Descarga del bucket `fotos` todas las imágenes de un plan y las empaqueta en un archivo ZIP por código de muestra. */
export async function empaquetarFotosPlan(
  db: Pick<SupabaseClient, 'storage'>,
  planNombre: string,
  muestras: { id: string; codigo: string }[],
  fotos: { muestra_id: string; ruta_storage: string }[],
): Promise<{ nombre: string; bytes: Uint8Array; cantidad: number }> {
  const porMuestra = new Map(muestras.map((m) => [m.id, m.codigo]))
  const archivos: Record<string, Uint8Array> = {}
  let cantidad = 0
  for (const f of fotos) {
    const { data, error } = await db.storage.from('fotos').download(f.ruta_storage)
    if (error || !data) throw new Error(`No se pudo descargar ${f.ruta_storage}: ${error?.message ?? 'archivo vacío'}`)
    const codigo = (porMuestra.get(f.muestra_id) ?? 'sin-muestra').replace(/[^\w-]+/g, '_')
    const nombreArchivo = f.ruta_storage.split('/').pop() ?? `${cantidad + 1}.jpg`
    archivos[`${codigo}/${nombreArchivo}`] = new Uint8Array(await data.arrayBuffer())
    cantidad++
  }
  return {
    nombre: `${planNombre.replace(/[^\w-]+/g, '_')}_fotos.zip`,
    bytes: zipSync(archivos, { level: 0 }), // JPEG ya está comprimido
    cantidad,
  }
}
