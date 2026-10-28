import type { MuestraPlan } from './leer-excel'

export interface Hallazgo {
  nivel: 'error' | 'aviso'
  codigo: string
  mensaje: string
}

// Caracteres de control, reemplazo (�), espacio de no separación y de ancho cero.
const RAROS = /[\u0000-\u001f\u007f� ​]/

/** Validaciones de la vista previa. Los errores impiden guardar; los avisos no. */
export function validarPlan(muestras: MuestraPlan[]): Hallazgo[] {
  const h: Hallazgo[] = []
  const vistos = new Set<string>()
  if (!muestras.length) h.push({ nivel: 'error', codigo: '-', mensaje: 'El archivo no tiene muestras' })

  for (const m of muestras) {
    const c = m.codigo
    if (vistos.has(c)) h.push({ nivel: 'error', codigo: c, mensaje: 'Código de muestra duplicado' })
    vistos.add(c)
    if (c !== c.trim() || RAROS.test(c)) h.push({ nivel: 'error', codigo: c, mensaje: 'El código tiene espacios o caracteres raros' })
    if (!m.parametros.length) h.push({ nivel: 'error', codigo: c, mensaje: 'Muestra sin parámetros' })
    if (new Set(m.parametros).size !== m.parametros.length) h.push({ nivel: 'error', codigo: c, mensaje: 'Parámetros repetidos' })
    if ([m.punto_texto, ...m.parametros].some((t) => RAROS.test(t))) h.push({ nivel: 'aviso', codigo: c, mensaje: 'Caracteres raros en el punto o en un parámetro' })
  }
  return h
}
