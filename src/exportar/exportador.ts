// ÚNICO módulo que decide la forma del archivo final. El formato es provisional: se ajustará con el guion de Sampler.
// Para cambiarlo basta con editar COLUMNAS / construirExportacion / aLibro; nada más depende de la forma del archivo.
import * as XLSX from 'xlsx'
import { elegirVigente as vigente } from '../datos/mediciones'

export interface DatosPlan {
  plan: { nombre: string }
  muestras: { id: string; codigo: string; punto_texto: string; fecha_planeada?: string | null; tipo: string | null; matriz: string | null; submatriz: string | null; estado: string }[]
  parametros: { muestra_id: string; parametro: string; es_insitu: boolean }[]
  mediciones: { id: string; muestra_id: string; parametro: string; alicuota?: number | null; valor: string; unidad: string; hora_telefono: string; lat: number | null; lon: number | null; precision_m: number | null; usuario_id: string | null; equipo_id: string | null; version: number; reemplaza_a: string | null; motivo_correccion: string | null; marcada: boolean; motivo_marca: string | null }[]
  descripciones: { muestra_id: string; texto: string; version: number; hora_telefono?: string }[]
  fotos: { muestra_id: string; ruta_storage: string; hora_telefono: string; lat: number | null; lon: number | null }[]
  usuarios: Record<string, string> // id → nombre
}

type Fila = Record<string, string | number | boolean | null>

export interface Exportacion { resultados: Fila[]; fotos: Fila[]; historial: Fila[] }

/**
 * Una fila por muestra y parámetro IN SITU (valor vigente; vacío si aún no se midió); en muestras compuestas, una por
 * cada alícuota registrada (columna Alicuota). Además, fotos por código y el historial
 * de versiones. Los parámetros de laboratorio no se exportan: el módulo Instrumental de Sampler solo necesita los de campo.
 */
export function construirExportacion(d: DatosPlan): Exportacion {
  const porMuestra = new Map(d.muestras.map((m) => [m.id, m]))
  const vig = new Map<string, DatosPlan['mediciones'][number]>()
  for (const x of d.mediciones) { const k = `${x.muestra_id}\n${x.parametro}\n${x.alicuota ?? ''}`; vig.set(k, vigente(vig.get(k), x)) }
  const desc = new Map<string, DatosPlan['descripciones'][number]>()
  for (const x of d.descripciones) desc.set(x.muestra_id, vigente(desc.get(x.muestra_id), x))
  const alicuotasDe = (id: string) => {
    const a = [...new Set(d.mediciones.filter((x) => x.muestra_id === id).map((x) => x.alicuota ?? null))].sort((p, q) => (p ?? 0) - (q ?? 0))
    return a.length ? a : [null]
  }
  const quien = (id: string | null) => (id ? d.usuarios[id] ?? id : null)

  const resultados = d.muestras
    .slice().sort((a, b) => a.codigo.localeCompare(b.codigo))
    .flatMap((m) => alicuotasDe(m.id).flatMap((a) => d.parametros.filter((p) => p.muestra_id === m.id && p.es_insitu).map((p): Fila => {
      const x = vig.get(`${m.id}\n${p.parametro}\n${a ?? ''}`)
      return {
        'Codigo muestra': m.codigo, 'Punto': m.punto_texto,
        'Tipo': m.tipo, 'Matriz': m.matriz, 'Submatriz': m.submatriz, 'Estado muestra': m.estado,
        'Parametro': p.parametro, 'Alicuota': a, 'In situ': p.es_insitu ? 'Si' : 'No',
        'Valor': x?.valor ?? null, 'Unidad': x?.unidad || null, 'Fecha y hora toma': x?.hora_telefono ?? null,
        'Latitud': x?.lat ?? null, 'Longitud': x?.lon ?? null, 'Precision GPS (m)': x?.precision_m ?? null,
        'Version': x?.version ?? null, 'Marcada': x ? (x.marcada ? 'Si' : 'No') : null, 'Motivo marca': x?.motivo_marca ?? null,
        'Muestreador': quien(x?.usuario_id ?? null), 'Equipo': x?.equipo_id ?? null,
        'Descripcion del punto': desc.get(m.id)?.texto ?? null,
      }
    })))

  const fotos = d.fotos
    .map((f): Fila => ({ 'Codigo muestra': porMuestra.get(f.muestra_id)?.codigo ?? '?', 'Archivo': f.ruta_storage, 'Fecha y hora': f.hora_telefono, 'Latitud': f.lat, 'Longitud': f.lon }))
    .sort((a, b) => String(a['Codigo muestra']).localeCompare(String(b['Codigo muestra'])) || String(a['Fecha y hora']).localeCompare(String(b['Fecha y hora'])))

  const historial = d.mediciones
    .map((x): Fila => ({
      'Codigo muestra': porMuestra.get(x.muestra_id)?.codigo ?? '?', 'Parametro': x.parametro, 'Alicuota': x.alicuota ?? null, 'Version': x.version, 'Valor': x.valor,
      'Fecha y hora': x.hora_telefono, 'Muestreador': quien(x.usuario_id), 'Motivo correccion': x.motivo_correccion,
    }))
    .sort((a, b) => String(a['Codigo muestra']).localeCompare(String(b['Codigo muestra'])) || String(a['Parametro']).localeCompare(String(b['Parametro'])) || Number(a['Alicuota'] ?? 0) - Number(b['Alicuota'] ?? 0) || Number(a['Version']) - Number(b['Version']))

  return { resultados, fotos, historial }
}

export function aLibro(e: Exportacion): XLSX.WorkBook {
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(e.resultados), 'Resultados')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(e.fotos, { header: ['Codigo muestra', 'Archivo', 'Fecha y hora', 'Latitud', 'Longitud'] }), 'Fotos')
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(e.historial, { header: ['Codigo muestra', 'Parametro', 'Alicuota', 'Version', 'Valor', 'Fecha y hora', 'Muestreador', 'Motivo correccion'] }), 'Historial')
  return libro
}

/** Archivo final del plan, listo para descargar. */
export function exportarPlan(d: DatosPlan): { nombre: string; bytes: ArrayBuffer } {
  const bytes = XLSX.write(aLibro(construirExportacion(d)), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return { nombre: `${d.plan.nombre.replace(/[^\w-]+/g, '_')}.xlsx`, bytes }
}
