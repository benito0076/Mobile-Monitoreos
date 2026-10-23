import * as XLSX from 'xlsx'

// Forma compatible con la función SQL cargar_plan().
export interface MuestraPlan {
  codigo: string
  punto_texto: string
  punto_codigo: string | null
  tipo: string
  matriz: string
  submatriz: string
  fecha_planeada: string | null
  parametros: string[]
}

const PUNTO_CODIGO = /LAM\s*(\d+)\s*-\s*(\d+)/i
const texto = (v: unknown) => (v == null ? '' : String(v))

function codigoPunto(punto: string): string | null {
  const m = PUNTO_CODIGO.exec(punto)
  return m ? `LAM${m[1]}-${m[2]}` : null
}

// Excel guarda la hora local sin zona; el laboratorio opera en Colombia (UTC-5, sin horario de verano).
function fechaPlan(serial: unknown): string | null {
  if (typeof serial !== 'number') return null
  const ms = Date.UTC(1899, 11, 30) + Math.round(serial * 86400000) + 5 * 3600000
  return new Date(ms).toISOString()
}

/** Lee el .xls/.xlsx del plan: un bloque por muestra (fila de datos, vacía, "Parametro", lista). */
export function leerPlan(datos: ArrayBuffer | Uint8Array): MuestraPlan[] {
  const libro = XLSX.read(datos, { type: 'array' })
  const hoja = libro.Sheets['Sheet1'] ?? libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: '' })
  const muestras: MuestraPlan[] = []
  let actual: MuestraPlan | null = null

  for (const f of filas.slice(1)) {
    const codigo = texto(f[0])
    if (codigo.trim()) {
      const punto = texto(f[1])
      actual = {
        codigo, // exacto: es la llave con Sampler
        punto_texto: punto,
        punto_codigo: codigoPunto(punto),
        tipo: texto(f[2]),
        matriz: texto(f[7]),
        submatriz: texto(f[9]),
        fecha_planeada: fechaPlan(f[4]),
        parametros: [],
      }
      muestras.push(actual)
    } else if (actual && texto(f[1]).trim() && texto(f[1]) !== 'Parametro') {
      actual.parametros.push(texto(f[1])) // exacto: algunos traen espacio final
    }
  }
  return muestras
}
