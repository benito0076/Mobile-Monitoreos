// PDT (Formato de planeación de monitoreos, FM-081): llena la plantilla Excel conservando su formato.
// La plantilla (public/fm-081.xlsx, ver scripts/preparar-plantilla-pdt.py) trae las filas modelo de cada bloque;
// aquí se repiten tantas veces como haga falta y se reescriben las celdas combinadas y los saltos de página.
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { agruparParametros, nombreCorto, type FilaPdt } from './alistamiento'
import { filaTipo } from './custodia-mapa'
import type { FichaCustodia } from './custodia-pdf'
import type { DatosPlan } from './exportador'

export interface DatosPdt {
  ficha: FichaCustodia; tecnicos: string[]
  matrices: { agua: boolean; suelos: boolean; sedimentos: boolean }
  tipos: { puntual: boolean; compuesto: boolean; integrado: boolean }
  objetivo: string; puntos: string[]
  fisicoquimicos: FilaPdt[]; hidrobiologicos: FilaPdt[]; insitu: string[]
}

const norm = (s: string | null) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Reúne lo que el PDT necesita del plan: puntos, matriz y tipo de muestreo, parámetros agrupados por preservación y los in situ. */
export function armarPdt(d: DatosPlan, ficha: FichaCustodia = {}, tecnicos: string[] = []): DatosPdt {
  const muestras = d.muestras.slice().sort((a, b) => a.codigo.localeCompare(b.codigo))
  const tipos = new Set(muestras.map((m) => filaTipo(m.tipo)))
  const hay = (re: RegExp) => muestras.some((m) => re.test(norm(m.matriz)))
  const unicos = (xs: string[]) => [...new Set(xs)]
  const { fisicoquimicos, hidrobiologicos } = agruparParametros(unicos(d.parametros.filter((p) => !p.es_insitu).map((p) => p.parametro)))
  const partes = [fisicoquimicos.length && 'físico-química', hidrobiologicos.length && 'hidrobiológica'].filter(Boolean)
  const codigo = ficha.codigo_muestreo?.trim() || d.plan.nombre.match(/\d+-\d{2}/)?.[0] || ''
  return {
    ficha: { ...ficha, codigo_muestreo: codigo }, tecnicos,
    matrices: { agua: hay(/agua/), suelos: hay(/suelo/), sedimentos: hay(/sedimento/) },
    tipos: { puntual: tipos.has(2), compuesto: tipos.has(1), integrado: tipos.has(0) },
    objetivo: `Realizar caracterización ${partes.join(' e ') || 'de campo'} de los puntos mencionados, según las condiciones del cliente.`,
    puntos: unicos(muestras.map((m) => m.punto_texto.trim())),
    fisicoquimicos, hidrobiologicos,
    insitu: unicos(d.parametros.filter((p) => p.es_insitu).map((p) => nombreCorto(p.parametro))).sort((a, b) => a.localeCompare(b, 'es')),
  }
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Escribe texto en una celda de la fila (conserva su estilo). */
function poner(fila: string, col: string, valor: string | undefined | null) {
  if (!valor) return fila
  return fila.replace(new RegExp(`<c r="(${col}\\d+)"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`), (_m, ref, a) =>
    `<c r="${ref}"${String(a).replace(/\s+t="[^"]*"/, '')} t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`)
}
const renumerar = (fila: string, n: number) => fila.replace(/<row r="\d+"/, `<row r="${n}"`).replace(/<c r="([A-Z]+)\d+"/g, `<c r="$1${n}"`)

// Ancho de las celdas combinadas (en caracteres de Excel) para estimar el alto de cada fila
const ANCHO = { B: 44.9, D: 38.7, F: 25.1, G: 33.3, I: 21.4, K: 41.6 }
const lineas = (t: string, ancho: number) => t.split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / (ancho * 0.85))), 0)
const altoDe = (celdas: [string | undefined, number][], minimo: number) =>
  Math.max(minimo, 11.5 * Math.max(...celdas.map(([t, w]) => lineas(t ?? '', w))) + 8)

const TEXTO_INSITU = 'IN SITU (En caso de no poder tomar alguno de estos parámetros, realizar la respectiva justificación en los formatos de campo).'
const OBS_INSITU = 'Se toma muestra y su respectivo duplicado'

export function llenarPdt(plantilla: Uint8Array, d: DatosPdt): Uint8Array {
  const zip = unzipSync(plantilla)
  const hoja = strFromU8(zip['xl/worksheets/sheet1.xml'])
  const ini = hoja.indexOf('<sheetData>') + 11, fin = hoja.indexOf('</sheetData>')
  const orig = new Map<number, string>()
  for (const m of hoja.slice(ini, fin).matchAll(/<row r="(\d+)"[^>]*?(?:\/>|>[\s\S]*?<\/row>)/g)) orig.set(+m[1], m[0])

  const filas: string[] = []
  const merges: string[] = []
  const nuevo = new Map<number, number>() // fila de la plantilla → fila nueva (solo las fijas)
  const fijo = (v: number, editar: (f: string) => string = (f) => f) => { nuevo.set(v, filas.length + 1); filas.push(renumerar(editar(orig.get(v)!), filas.length + 1)) }
  const generar = (modelo: number, editar: (f: string) => string, alto: number | null, combinar: (n: number) => string[]) => {
    const n = filas.length + 1
    let f = renumerar(editar(orig.get(modelo)!), n)
    if (alto) f = f.replace(/ ht="[\d.]+"/, ` ht="${alto}"`)
    filas.push(f); merges.push(...combinar(n))
  }
  const marca = (f: string, col: string, si: boolean) => (si ? poner(f, col, 'X') : f)
  const f = d.ficha

  // Encabezado: cliente, técnicos, objetivo, matriz y tipo de muestreo
  for (let v = 1; v <= 17; v++) fijo(v, (fila) => {
    if (v === 6) return poner(poner(fila, 'C', f.cliente), 'H', d.tecnicos.join(' - '))
    if (v === 7) return poner(poner(fila, 'C', f.direccion), 'H', f.telefono_campo)
    if (v === 8) return poner(poner(fila, 'C', f.contacto), 'H', f.codigo_muestreo)
    if (v === 9) return poner(poner(fila, 'C', f.telefono), 'H', f.cotizacion)
    if (v === 11) return poner(fila, 'B', d.objetivo)
    if (v === 13) return marca(fila, 'C', d.matrices.agua)
    if (v === 14) return marca(marca(fila, 'C', d.matrices.suelos), 'L', d.matrices.sedimentos)
    if (v === 15) return marca(marca(marca(fila, 'F', d.tipos.puntual), 'I', d.tipos.compuesto), 'L', d.tipos.integrado)
    return fila
  })

  // Puntos de monitoreo (las coordenadas y la altitud se completan en el Excel)
  const puntos = d.puntos.length ? d.puntos : ['']
  puntos.forEach((p, i) => generar(i === puntos.length - 1 ? 44 : 19, (fila) => poner(fila, 'B', p), null,
    (n) => [`B${n}:G${n}`, `H${n}:J${n}`, `K${n}:L${n}`]))
  for (let v = 45; v <= 53; v++) fijo(v)

  // Tablas de parámetros: una fila por grupo de preservación
  const tabla = (grupos: FilaPdt[], modelo: (i: number, n: number) => number) => grupos.forEach((g, i) => {
    const lista = g.parametros.join(', ')
    const celdas: [string, string][] = [['B', lista], ['D', g.minimo], ['F', g.grupo], ['G', g.preservante], ['I', g.material], ['K', g.observaciones]]
    generar(modelo(i, grupos.length), (fila) => celdas.reduce((acc, [col, valor]) => poner(acc, col, valor), fila),
      altoDe([[lista, ANCHO.B], [g.preservante, ANCHO.G], [g.material, ANCHO.I], [g.observaciones, ANCHO.K]], 30),
      (n) => [`B${n}:C${n}`, `D${n}:E${n}`, `G${n}:H${n}`, `I${n}:J${n}`, `K${n}:M${n}`])
  })
  if (d.fisicoquimicos.length) tabla(d.fisicoquimicos, () => 54)
  else tabla([{ parametros: [], grupo: '', minimo: '', preservante: '', material: '', observaciones: '' }], () => 54)
  if (d.hidrobiologicos.length) { fijo(60); tabla(d.hidrobiologicos, () => 61) }

  // Parámetros in situ: una fila por parámetro; el texto y la observación abarcan todas
  fijo(66)
  const insitu = d.insitu.length ? d.insitu : ['']
  const primera = filas.length + 1, ultima = primera + insitu.length - 1
  insitu.forEach((p, i) => generar(i === 0 ? 67 : i === insitu.length - 1 ? 70 : 68,
    (fila) => {
      fila = poner(fila, 'B', p)
      return i === 0 ? poner(poner(fila, 'F', TEXTO_INSITU), 'K', OBS_INSITU) : fila
    }, null,
    (n) => [`B${n}:E${n}`, ...(i === 0 ? [`F${primera}:J${ultima}`, `K${primera}:M${ultima}`] : [])]))

  // Observaciones generales y firmas
  for (let v = 71; v <= 81; v++) fijo(v, (fila) => {
    const i = v - 77
    return i === 0 || i === 1 ? (d.tecnicos[i] ? poner(fila, 'B', `Nombre responsable del muestreo:  ${d.tecnicos[i]}`) : fila) : fila
  })

  // Celdas combinadas de la plantilla que siguen vigentes (todas sus filas son fijas), movidas a su fila nueva
  for (const m of hoja.matchAll(/<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g)) {
    const a = nuevo.get(+m[2]), b = nuevo.get(+m[4])
    if (a && b) merges.push(`${m[1]}${a}:${m[3]}${b}`)
  }
  const total = filas.length
  const corte = nuevo.get(71)! - 1 // el logo y el encabezado de la segunda página empiezan en la fila 71 de la plantilla
  let xml = hoja.slice(0, ini) + filas.join('') + hoja.slice(fin)
  xml = xml.replace(/<mergeCells count="\d+">[\s\S]*?<\/mergeCells>/, `<mergeCells count="${merges.length}">${merges.map((r) => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>`)
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:N${total}"/>`).replace(/<brk id="\d+"/, `<brk id="${corte}"`)
  zip['xl/worksheets/sheet1.xml'] = strToU8(xml)
  zip['xl/drawings/drawing1.xml'] = strToU8(strFromU8(zip['xl/drawings/drawing1.xml']).replace(/<xdr:row>70<\/xdr:row>/, `<xdr:row>${corte}</xdr:row>`))
  zip['xl/workbook.xml'] = strToU8(strFromU8(zip['xl/workbook.xml']).replace(/\$N\$\d+/, `$N$${total}`))
  return zipSync(zip, { level: 6 })
}
