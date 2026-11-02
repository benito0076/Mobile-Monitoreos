// Genera y descarga la cadena de custodia (FM-017) de un envío. Sirve igual en el teléfono (sin conexión: la plantilla
// queda guardada con la app) y en el panel de oficina.
import type { DatosEnvio, FichaCustodia } from './custodia-pdf'
import type { DatosPlan } from './exportador'

export function descargarBlob(blob: Blob, nombre: string) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre })
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

export async function descargarCustodiaEnvio(datos: DatosPlan, ficha: FichaCustodia, tecnicos: string[], envio: DatosEnvio) {
  const [plantilla, { armarCustodia, llenarCustodia }] = await Promise.all([
    fetch('/fm-017.pdf').then((r) => { if (!r.ok) throw new Error('No se pudo leer la plantilla FM-017'); return r.arrayBuffer() }),
    import('./custodia-pdf'), // pdf-lib solo se baja al generar el PDF
  ])
  const bytes = await llenarCustodia(plantilla, armarCustodia(datos, ficha, { tecnicos, envio }))
  descargarBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${datos.plan.nombre.replace(/[^\w-]+/g, '_')}_FM-017_${envio.fecha}.pdf`)
}
