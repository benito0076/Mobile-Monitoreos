import { parsearValor } from './validar-medicion'

/**
 * Parámetros que en campo se miden con varias lecturas por alícuota: el caudal por método volumétrico es un volumen y un tiempo.
 * Cada lectura se guarda como una medición normal (con sus versiones, GPS y sincronización) con el nombre «Parámetro | Lectura»,
 * así que el servidor no necesita cambios. La hora de la alícuota es la de la medición.
 * ponytail: lista fija en código; pasarla a la tabla de parámetros in situ si aparece un segundo parámetro de este tipo.
 */
export interface Lectura { sufijo: string; unidad: string }
export const LECTURAS: Record<string, Lectura[]> = {
  'Agua - Caudal Compuesto': [{ sufijo: 'Volumen', unidad: 'L' }, { sufijo: 'Tiempo', unidad: 's' }], // volumen en L y tiempo en s → caudal en L/s
}

export const SEPARADOR = ' | '
export const nombreLectura = (base: string, l: Lectura) => `${base.trim()}${SEPARADOR}${l.sufijo}`

/** Lo que se pide en campo para un parámetro del plan. `nombre` es con el que se guarda la medición. */
export interface Item { nombre: string; base: string; etiqueta: string; unidad?: string }

/** Parámetros del plan → lo que se mide: los de varias lecturas se reemplazan por sus lecturas; el resto queda igual. */
export function itemsDe(params: string[]): Item[] {
  return params.flatMap((p): Item[] => {
    const lecturas = LECTURAS[p.trim()]
    return lecturas
      ? lecturas.map((l) => ({ nombre: nombreLectura(p, l), base: p, etiqueta: `${p.trim()} · ${l.sufijo}`, unidad: l.unidad }))
      : [{ nombre: p, base: p, etiqueta: p.trim() }]
  })
}

/** Caudal (L/s) = volumen (L) / tiempo (s). null si falta una lectura o el tiempo no es positivo. */
export function caudalLs(volumen: string | undefined, tiempo: string | undefined): number | null {
  const v = volumen === undefined ? null : parsearValor(volumen), t = tiempo === undefined ? null : parsearValor(tiempo)
  return v === null || t === null || t <= 0 ? null : Math.round((v / t) * 1000) / 1000
}
