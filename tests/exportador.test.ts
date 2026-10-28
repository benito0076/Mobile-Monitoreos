import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { describe, expect, test } from 'vitest'
import { leerPlan } from '../src/plan/leer-excel'
import { construirExportacion, exportarPlan, type DatosPlan } from '../src/exportar/exportador'

const med = (o: Partial<DatosPlan['mediciones'][number]>): DatosPlan['mediciones'][number] => ({
  id: 'x', muestra_id: 'm1', parametro: 'pH', valor: '7', unidad: 'u', hora_telefono: '2026-10-23T10:00:00Z', lat: 7.1, lon: -73.1, precision_m: 8,
  usuario_id: 'u1', equipo_id: 'e1', version: 1, reemplaza_a: null, motivo_correccion: null, marcada: false, motivo_marca: null, ...o,
})
const pequeno: DatosPlan = {
  plan: { nombre: 'Plan 1' },
  muestras: [
    { id: 'm2', codigo: '10501-26', punto_texto: 'B', tipo: 'Puntual', matriz: 'AGUA', submatriz: 'S', estado: 'pendiente' },
    { id: 'm1', codigo: '10500-26', punto_texto: 'A', tipo: 'Puntual', matriz: 'AGUA', submatriz: 'S', estado: 'cerrada' },
  ],
  parametros: [
    { muestra_id: 'm1', parametro: 'pH', es_insitu: true }, { muestra_id: 'm1', parametro: 'Agua - Temperatura ', es_insitu: true },
    { muestra_id: 'm1', parametro: 'Agua - Acidez', es_insitu: false }, { muestra_id: 'm2', parametro: 'pH', es_insitu: true },
  ],
  mediciones: [
    med({ id: 'a', valor: '7', version: 1 }),
    med({ id: 'b', valor: '7.4', version: 2, reemplaza_a: 'a', motivo_correccion: 'lectura', marcada: true, motivo_marca: 'Reloj desfasado' }),
    med({ id: 'c', parametro: 'Agua - Temperatura ', valor: '21', unidad: '°C' }),
  ],
  descripciones: [{ muestra_id: 'm1', texto: 'v1', version: 1 }, { muestra_id: 'm1', texto: 'Orilla norte', version: 2 }],
  fotos: [
    { muestra_id: 'm1', ruta_storage: 'p1/10500-26/f2.jpg', hora_telefono: '2026-10-23T10:05:00Z', lat: null, lon: null },
    { muestra_id: 'm1', ruta_storage: 'p1/10500-26/f1.jpg', hora_telefono: '2026-10-23T10:01:00Z', lat: 7.1, lon: -73.1 },
  ],
  usuarios: { u1: 'Comisión Norte' },
}

describe('exportador: muestras compuestas', () => {
  const d: DatosPlan = {
    ...pequeno,
    muestras: [{ id: 'c1', codigo: '11103-26', punto_texto: 'Vertimiento', tipo: 'Compuesta', matriz: 'AGUA', submatriz: 'S', estado: 'en_campo' }],
    parametros: [{ muestra_id: 'c1', parametro: 'pH', es_insitu: true }, { muestra_id: 'c1', parametro: 'T', es_insitu: true }],
    mediciones: [
      med({ id: 'a1', muestra_id: 'c1', alicuota: 1, valor: '7' }), med({ id: 'a2', muestra_id: 'c1', alicuota: 1, parametro: 'T', valor: '20' }),
      med({ id: 'b1', muestra_id: 'c1', alicuota: 2, valor: '7.2' }),
      med({ id: 'b2', muestra_id: 'c1', alicuota: 2, valor: '7.3', version: 2, reemplaza_a: 'b1', motivo_correccion: 'lectura' }),
    ],
    descripciones: [], fotos: [],
  }
  const r = construirExportacion(d).resultados

  test('una fila por parámetro y alícuota; lo no medido de una alícuota sale vacío', () => {
    expect(r.map((x) => [x['Alicuota'], x['Parametro'], x['Valor']])).toEqual([[1, 'pH', '7'], [1, 'T', '20'], [2, 'pH', '7.3'], [2, 'T', null]])
  })

  test('el historial distingue la alícuota', () => {
    expect(construirExportacion(d).historial.filter((h) => h['Parametro'] === 'pH').map((h) => [h['Alicuota'], h['Version']])).toEqual([[1, 1], [2, 1], [2, 2]])
  })
})

describe('exportador', () => {
  const e = construirExportacion(pequeno)

  test('no exporta columna de identificador aparte: el punto va completo', () => {
    expect(Object.keys(e.resultados[0])).toContain('Punto')
    expect(Object.keys(e.resultados[0]).some((k) => /identificador/i.test(k))).toBe(false)
  })

  test('una fila por muestra y parámetro in situ, ordenadas por código; los de laboratorio no salen', () => {
    expect(e.resultados.map((r) => [r['Codigo muestra'], r['Parametro']])).toEqual([
      ['10500-26', 'pH'], ['10500-26', 'Agua - Temperatura '], ['10501-26', 'pH'],
    ])
    expect(e.resultados.every((r) => r['In situ'] === 'Si' && r['Alicuota'] === null)).toBe(true) // puntuales: sin alícuota
  })

  test('usa la versión vigente, deja vacío lo no medido y arrastra marca, muestreador y descripción', () => {
    const [ph, temp, sinMedir] = e.resultados
    expect(ph).toMatchObject({ Valor: '7.4', Version: 2, Marcada: 'Si', 'Motivo marca': 'Reloj desfasado', Muestreador: 'Comisión Norte', 'Descripcion del punto': 'Orilla norte', 'Estado muestra': 'cerrada' })
    expect(temp).toMatchObject({ Valor: '21', Unidad: '°C', Marcada: 'No' })
    expect(sinMedir.Valor).toBeNull()
  })

  test('fotos por código de muestra y historial con todas las versiones', () => {
    expect(e.fotos.map((f) => [f['Codigo muestra'], f['Archivo']])).toEqual([['10500-26', 'p1/10500-26/f1.jpg'], ['10500-26', 'p1/10500-26/f2.jpg']])
    expect(e.historial.filter((h) => h['Parametro'] === 'pH').map((h) => [h['Version'], h['Valor'], h['Motivo correccion']])).toEqual([[1, '7', null], [2, '7.4', 'lectura']])
  })

  test('el archivo xlsx tiene las 3 hojas y conserva los nombres exactos', () => {
    const { nombre, bytes } = exportarPlan(pequeno)
    expect(nombre).toBe('Plan_1.xlsx')
    const libro = XLSX.read(bytes, { type: 'array' })
    expect(libro.SheetNames).toEqual(['Resultados', 'Fotos', 'Historial'])
    const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(libro.Sheets['Resultados'])
    expect(filas).toHaveLength(3)
    expect(filas.map((f) => f['Parametro'])).toContain('Agua - Temperatura ')
  })
})

describe('con el plan de ejemplo', () => {
  test('75 filas: de 738 parámetros solo salen los 5 in situ de cada una de las 15 muestras', () => {
    const IN_SITU = ['pH', 'Agua - Temperatura ', 'Agua - Oxígeno Disuelto ', 'Agua - Conductividad a 25°C In Situ - Puntual', 'Agua - Caudal > 2 m3/s y < 10 m3/s']
    const m = leerPlan(readFileSync('fixtures/Prueba_Items.xls'))
    const ids = m.map((x, i) => ({ ...x, id: `m${i}`, estado: 'pendiente' }))
    const r = construirExportacion({
      plan: { nombre: 'Prueba' }, usuarios: {}, mediciones: [], descripciones: [], fotos: [],
      muestras: ids, parametros: ids.flatMap((x) => x.parametros.map((p) => ({ muestra_id: x.id, parametro: p, es_insitu: IN_SITU.includes(p) }))),
    })
    expect(r.resultados).toHaveLength(15 * 5)
    expect(new Set(r.resultados.map((x) => x['Codigo muestra'])).size).toBe(15)
  })
})
