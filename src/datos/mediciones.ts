import { equipoId, local, metaGet, type DescripcionLocal, type FotoLocal, type Gps, type MedicionLocal } from './db-local'
import { parsearValor } from './validar-medicion'

const ahora = () => new Date().toISOString()

async function sello(usuario_id: string, gps: Gps | null) {
  return {
    hora_telefono: ahora(),
    desfase_reloj_s: (await metaGet<number>('desfase_reloj_s')) ?? null,
    lat: gps?.lat ?? null, lon: gps?.lon ?? null, precision_m: gps?.precision_m ?? null,
    usuario_id, equipo_id: await equipoId(), version_app: __VERSION_APP__, sincronizado: 0,
  }
}

/** Las muestras compuestas se miden por alícuota (columna Tipo del plan). */
export const esCompuesta = (m: { tipo: string | null }) => m.tipo?.trim().toLowerCase() === 'compuesta'

/** Clave de una medición dentro de su muestra: el parámetro, y la alícuota si la muestra es compuesta. */
export const claveMedicion = (parametro: string, alicuota?: number | null) => (alicuota ? `${parametro}\n${alicuota}` : parametro)

/** Dos integrantes pueden registrar el mismo dato desde teléfonos distintos: con la misma versión gana la lectura más reciente. */
export const elegirVigente = <T extends { version: number; hora_telefono?: string }>(a: T | undefined, b: T) =>
  !a || b.version > a.version || (b.version === a.version && (b.hora_telefono ?? '') > (a.hora_telefono ?? '')) ? b : a

/** Medición vigente (mayor versión; si empatan, la más reciente) de cada parámetro (y alícuota) de una muestra, por claveMedicion. */
export async function vigentes(muestra_id: string) {
  const todas = await local.mediciones.where('muestra_id').equals(muestra_id).toArray()
  const m = new Map<string, MedicionLocal>()
  for (const x of todas) {
    const k = claveMedicion(x.parametro, x.alicuota)
    m.set(k, elegirVigente(m.get(k), x))
  }
  return m
}

interface Entrada { muestra_id: string; parametro: string; alicuota?: number | null; valor: string; unidad: string; usuario_id: string; gps: Gps | null }

/** Primera medición de un parámetro. Queda cerrada: cambiarla es una corrección. */
export async function guardarMedicion(e: Entrada) {
  const n = parsearValor(e.valor)
  if (n === null) throw new Error('El valor debe ser un número')
  const s = await sello(e.usuario_id, e.gps)
  // Revisar y escribir en una sola transacción: dos envíos simultáneos no duplican.
  return local.transaction('rw', local.mediciones, async () => {
    if ((await vigentes(e.muestra_id)).has(claveMedicion(e.parametro, e.alicuota))) throw new Error('Ese parámetro ya tiene medición; usa corrección')
    const r: MedicionLocal = {
      id: crypto.randomUUID(), muestra_id: e.muestra_id, parametro: e.parametro, alicuota: e.alicuota ?? null, valor: String(n), unidad: e.unidad,
      version: 1, reemplaza_a: null, motivo_correccion: null, ...s,
    }
    await local.mediciones.add(r)
    return r
  })
}

/** Versión nueva de una medición, con motivo obligatorio. Nunca modifica la anterior. */
export async function corregirMedicion(e: Entrada & { motivo: string }) {
  const n = parsearValor(e.valor)
  if (n === null) throw new Error('El valor debe ser un número')
  if (!e.motivo.trim()) throw new Error('El motivo de la corrección es obligatorio')
  const s = await sello(e.usuario_id, e.gps)
  return local.transaction('rw', local.mediciones, async () => {
    const previa = (await vigentes(e.muestra_id)).get(claveMedicion(e.parametro, e.alicuota))
    if (!previa) throw new Error('No hay medición que corregir')
    const r: MedicionLocal = {
      id: crypto.randomUUID(), muestra_id: e.muestra_id, parametro: e.parametro, alicuota: e.alicuota ?? null, valor: String(n), unidad: e.unidad,
      version: previa.version + 1, reemplaza_a: previa.id, motivo_correccion: e.motivo.trim(), ...s,
    }
    await local.mediciones.add(r)
    return r
  })
}

export async function descripcionVigente(muestra_id: string) {
  const d = await local.descripciones.where('muestra_id').equals(muestra_id).toArray()
  return d.reduce<DescripcionLocal | undefined>((acc, x) => elegirVigente(acc, x), undefined)
}

/** Primera descripción, o corrección (con motivo obligatorio) si ya había una. */
export async function guardarDescripcion(muestra_id: string, texto: string, usuario_id: string, motivo?: string) {
  if (!texto.trim()) throw new Error('La descripción está vacía')
  return local.transaction('rw', local.descripciones, async () => {
    const previa = await descripcionVigente(muestra_id)
    if (previa && !motivo?.trim()) throw new Error('El motivo de la corrección es obligatorio')
    const r: DescripcionLocal = {
      id: crypto.randomUUID(), muestra_id, texto: texto.trim(), hora_telefono: ahora(), usuario_id,
      version: previa ? previa.version + 1 : 1, reemplaza_a: previa?.id ?? null, motivo_correccion: previa ? motivo!.trim() : null, sincronizado: 0,
    }
    await local.descripciones.add(r)
    return r
  })
}

export async function guardarFoto(muestra_id: string, blob: Blob, gps: Gps | null, usuario_id: string) {
  const m = await local.muestras.get(muestra_id)
  if (!m) throw new Error('Muestra desconocida')
  const id = crypto.randomUUID()
  const r: FotoLocal = {
    id, muestra_id, blob, ruta_storage: `${m.plan_id}/${m.codigo}/${id}.jpg`, // por código de muestra
    hora_telefono: ahora(), lat: gps?.lat ?? null, lon: gps?.lon ?? null, usuario_id, sincronizado: 0,
  }
  await local.fotos.add(r)
  return r
}

/** Permite descartar una foto tomada por error antes de que se sincronice con el servidor. */
export async function eliminarFotoPendiente(id: string) {
  const f = await local.fotos.get(id)
  if (!f) return
  if (f.sincronizado !== 0) throw new Error('Una foto ya sincronizada con el servidor no se puede borrar')
  await local.fotos.delete(id)
}

/** pendiente → en_campo → cerrada. Una muestra cerrada no se reabre (sus datos se corrigen con versiones). */
export async function cambiarEstado(id: string, estado: 'en_campo' | 'cerrada') {
  const m = await local.muestras.get(id)
  if (!m || m.estado === 'cerrada' || m.estado === estado) return
  await local.muestras.update(id, { estado, estado_pendiente: 1 })
}
