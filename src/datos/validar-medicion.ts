import type { Gps, ParametroInsitu } from './db-local'

/** "7,2" o "7.2" → 7.2; cualquier otra cosa → null. */
export function parsearValor(texto: string): number | null {
  const t = texto.trim().replace(',', '.')
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(t)) return null
  return Number(t)
}

/** Validaciones suaves: advierten, no bloquean. */
export function advertenciaRango(valor: number, p: ParametroInsitu | undefined): string | null {
  return p && ((p.minimo != null && valor < p.minimo) || (p.maximo != null && valor > p.maximo))
    ? `Valor fuera del rango plausible (${p.minimo ?? '…'} a ${p.maximo ?? '…'} ${p.unidad})` : null
}

export function advertenciaGps(gps: Gps | null, umbralGps: number): string | null {
  if (!gps) return 'Sin señal GPS: la medición quedó sin coordenadas'
  return gps.precision_m > umbralGps ? `Precisión del GPS de ${Math.round(gps.precision_m)} m, peor que ${umbralGps} m` : null
}

export const advertencias = (valor: number, p: ParametroInsitu | undefined, gps: Gps | null, umbralGps: number) =>
  [advertenciaRango(valor, p), advertenciaGps(gps, umbralGps)].filter((x): x is string => x !== null)
