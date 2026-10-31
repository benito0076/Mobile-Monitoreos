// Cadena de custodia FM-017 v17: escribe los datos sobre el PDF original del laboratorio (public/fm-017.pdf) para conservar el formato controlado.
// Las coordenadas (puntos PDF, origen arriba-izquierda) se midieron sobre ese PDF; si el formato cambia de versión hay que revisarlas.
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { COLUMNAS, columnaDe, filaTipo, matrizDe, type Matriz } from './custodia-mapa'
import type { DatosPlan } from './exportador'

export interface FichaCustodia {
  cliente?: string; codigo_muestreo?: string; cotizacion?: string; municipio?: string; departamento?: string
  direccion?: string; contacto?: string; telefono?: string; telefono_campo?: string // solo los usa el PDT
}
export interface MuestraCustodia { codigo: string; punto: string; tipo: string | null; matriz: Matriz; parametros: string[]; inicio: Date | null; fin: Date | null }
export interface DatosCustodia { proyecto: string; ficha: FichaCustodia; muestras: MuestraCustodia[]; responsables: string[] }

const ALTO = 612
const MUESTRAS_POR_HOJA = 7
const FILA = 8.15, BLOQUE = 4 * FILA, TOPE = 188.15
const COL_X = [421, 430, 439, 448, 457, 466, 475, 484, 493, 505, 521, 533.7, 542.2, 550.7, 559.3, 567.8, 576.3, 584.8, 593.4, 601.9, 610.4, 618.9, 627.4, 636, 644.5, 653, 661.5, 670, 678.6, 687.1, 695.6, 704.1, 712.7, 721.2]
const CASILLA_MATRIZ: Record<Matriz, [number, number]> = {
  'ARD': [40.7, 49.1], 'ARnD': [66.4, 81.1], 'A. SUP': [110.3, 125], 'A. SUB': [154.2, 169.9], 'A. POT': [201, 215.8], 'PISCINA': [259.6, 274.3],
  'A. LLUVIA': [311.3, 323.8], 'A. CRUDA': [367.9, 377.9], 'SUELO': [399.4, 410.3], 'SEDIMENTOS MARINOS': [475, 484.1],
  'SEDIMENTOS CONTINENTALES': [567.8, 576.5], 'RESIDUOS': [610.4, 636.1], 'OTRO': [661.5, 771.7],
}
// Campos del encabezado: [x inicial, ancho] sobre su línea (y de la línea = 93.4)
const CAMPOS: Record<'cliente' | 'proyecto' | 'codigo_muestreo' | 'cotizacion' | 'municipio' | 'departamento', [number, number]> = {
  cliente: [67, 87], proyecto: [216, 142], codigo_muestreo: [421.5, 44], cotizacion: [534, 42], municipio: [645, 33], departamento: [713, 58],
}

const dos = (n: number) => String(n).padStart(2, '0')
// El laboratorio opera en Colombia (UTC-5, sin horario de verano): se formatea siempre en hora de Colombia.
const enColombia = (d: Date) => new Date(d.getTime() - 5 * 3600_000)
const fecha = (d: Date) => { const c = enColombia(d); return `${dos(c.getUTCDate())}/${dos(c.getUTCMonth() + 1)}/${c.getUTCFullYear()}` }
const hora = (d: Date) => { const c = enColombia(d); return `${dos(c.getUTCHours())}:${dos(c.getUTCMinutes())}` }

/** Arma lo que el formato necesita a partir de los datos del plan; solo parámetros de laboratorio (los in situ no van en la custodia). */
export function armarCustodia(d: DatosPlan, ficha: FichaCustodia = {}): DatosCustodia {
  const muestras = d.muestras.slice().sort((a, b) => a.codigo.localeCompare(b.codigo)).map((m): MuestraCustodia => {
    const horas = d.mediciones.filter((x) => x.muestra_id === m.id).map((x) => Date.parse(x.hora_telefono)).sort((a, b) => a - b)
    return {
      codigo: m.codigo, punto: m.punto_texto, tipo: m.tipo, matriz: matrizDe(m.matriz, m.submatriz),
      parametros: d.parametros.filter((p) => p.muestra_id === m.id && !p.es_insitu).map((p) => p.parametro),
      // Sin mediciones reportadas, fecha y hora quedan en blanco (la fecha planeada no se usa)
      inicio: horas.length ? new Date(horas[0]) : null, fin: horas.length ? new Date(horas[horas.length - 1]) : null,
    }
  })
  const quienes = [...new Set(d.mediciones.map((x) => x.usuario_id).filter((u): u is string => !!u))].map((u) => d.usuarios[u] ?? u)
  // «Código del muestreo»: el que la oficina escribió, o el número que lleva el nombre del plan (p. ej. «Muestreo 1128-26»)
  const codigo = ficha.codigo_muestreo?.trim() || d.plan.nombre.match(/\d+-\d{2}/)?.[0] || ''
  return { proyecto: d.plan.nombre, ficha: { ...ficha, codigo_muestreo: codigo }, muestras, responsables: quienes }
}

export async function llenarCustodia(plantilla: ArrayBuffer | Uint8Array, datos: DatosCustodia): Promise<Uint8Array> {
  const origen = await PDFDocument.load(plantilla)
  const salida = await PDFDocument.create()
  const normal = await salida.embedFont(StandardFonts.Helvetica)
  const negrita = await salida.embedFont(StandardFonts.HelveticaBold)
  const soportados = new Set(normal.getCharacterSet())
  const limpio = (t: string) => [...t.replace(/\s+/g, ' ').trim()].map((c) => (soportados.has(c.codePointAt(0)!) ? c : '?')).join('')

  const hojas = Math.max(1, Math.ceil(datos.muestras.length / MUESTRAS_POR_HOJA))
  for (let h = 0; h < hojas; h++) {
    const [pagina] = await salida.copyPages(origen, [0])
    salida.addPage(pagina)
    const y = (arriba: number) => ALTO - arriba
    /** Texto en una línea, reducido hasta que quepa en `ancho`. */
    const texto = (t: string, x: number, base: number, ancho: number, tam = 6, f: PDFFont = normal, centrado = false) => {
      t = limpio(t); if (!t) return
      while (tam > 3.5 && f.widthOfTextAtSize(t, tam) > ancho) tam -= 0.25
      const w = f.widthOfTextAtSize(t, tam)
      pagina.drawText(t, { x: centrado ? x + (ancho - w) / 2 : x, y: y(base), size: tam, font: f, color: rgb(0, 0, 0) })
    }
    const equis = (x0: number, x1: number, base: number) => texto('X', x0, base, x1 - x0, 7, negrita, true)

    // Encabezado
    for (const k of ['cliente', 'codigo_muestreo', 'cotizacion', 'municipio', 'departamento'] as const)
      texto(datos.ficha[k] ?? '', CAMPOS[k][0], 93, CAMPOS[k][1])
    texto(datos.proyecto, CAMPOS.proyecto[0], 93, CAMPOS.proyecto[1])
    equis(66.6, 86.8, 111.4) // Muestreado por: Ambienciq Ingenieros S.A.S
    for (const m of new Set(datos.muestras.map((x) => x.matriz))) equis(...CASILLA_MATRIZ[m], 125.4)

    // Muestras de esta hoja
    datos.muestras.slice(h * MUESTRAS_POR_HOJA, (h + 1) * MUESTRAS_POR_HOJA).forEach((m, b) => {
      const arriba = TOPE + b * BLOQUE
      texto(m.codigo, 25.6, arriba + BLOQUE / 2 + 2, 40.7, 6.5, negrita, true)
      // Punto de muestreo: en varias líneas dentro de su celda (120 pt de ancho)
      let tam = 6, lineas: string[] = []
      for (; tam >= 4; tam -= 0.5) {
        lineas = []
        let l = ''
        for (const w of limpio(m.punto).split(' ')) {
          if (l && normal.widthOfTextAtSize(`${l} ${w}`, tam) > 116) { lineas.push(l); l = w } else l = l ? `${l} ${w}` : w
        }
        if (l) lineas.push(l)
        if (lineas.length * (tam + 1) <= BLOQUE - 2) break
      }
      const alto = lineas.length * (tam + 1)
      lineas.forEach((l, i) => texto(l, 112, arriba + (BLOQUE - alto) / 2 + (i + 1) * (tam + 1) - 1, 116, tam))
      // Fechas y hora van en la fila del tipo de muestra (sus celdas están divididas por fila)
      const fila = arriba + filaTipo(m.tipo) * FILA
      if (m.inicio) { texto(fecha(m.inicio), 274.3, fila + 6.2, 37, 5.5, normal, true); texto(hora(m.inicio), 348.5, fila + 6.2, 29.4, 5.5, normal, true) }
      if (m.fin) texto(fecha(m.fin), 311.3, fila + 6.2, 37.2, 5.5, normal, true)
      for (const c of new Set(m.parametros.map(columnaDe))) { const i = COLUMNAS.indexOf(c); equis(COL_X[i], COL_X[i + 1], fila + 6.2) }
    })

    // Pie: quién muestreó y entrega. La recepción en laboratorio queda en blanco.
    const nombres = datos.responsables.join(', ')
    texto(nombres, 83, 436.4, 274)
    texto(nombres, 70, 458.1, 280)
  }
  return salida.save()
}
