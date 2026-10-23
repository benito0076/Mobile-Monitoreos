import type { Gps, ParametroInsitu } from './db-local'

/** "7,2" o "7.2" → 7.2; cualquier otra cosa → null. */
export function parsearValor(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return null
  return Number(t)
}

/** Validaciones suaves: advierten, no bloquean. */
export function advertencias(valor: number, p: ParametroInsitu | undefined, gps: Gps | null, umbralGps: number): string[] {
  const a: string[] = []
  if (p && ((p.minimo != null && valor < p.minimo) || (p.maximo != null && valor > p.maximo)))
    a.push(`Valor fuera del rango plausible (${p.minimo ?? '…'} a ${p.maximo ?? '…'} ${p.unidad})`)
  if (!gps) a.push('Sin señal GPS: la medición quedará sin coordenadas')
  else if (gps.precision_m > umbralGps) a.push(`Precisión del GPS de ${Math.round(gps.precision_m)} m, peor que ${umbralGps} m`)
  return a
}
