import { local } from './db-local'

async function base64(b: Blob) {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

/** Toda la jornada guardada en el teléfono (confirmada o no) en un solo archivo JSON, fotos incluidas. */
export async function exportarJornada(): Promise<{ nombre: string; blob: Blob }> {
  const plan = await local.planes.toCollection().first()
  const fotos = await Promise.all((await local.fotos.toArray()).map(async ({ blob, ...f }) => ({ ...f, jpeg_base64: await base64(blob) })))
  const datos = {
    exportado_en: new Date().toISOString(), version_app: __VERSION_APP__, plan,
    muestras: await local.muestras.toArray(),
    mediciones: await local.mediciones.toArray(),
    descripciones: await local.descripciones.toArray(),
    fotos,
  }
  const nombre = `jornada_${(plan?.nombre ?? 'sin-plan').replace(/[^\w-]+/g, '_')}_${datos.exportado_en.slice(0, 10)}.json`
  return { nombre, blob: new Blob([JSON.stringify(datos)], { type: 'application/json' }) }
}

export async function descargarJornada() {
  const { nombre, blob } = await exportarJornada()
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre })
  a.click(); URL.revokeObjectURL(a.href)
}
