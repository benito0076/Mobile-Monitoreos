import { describe, expect, test } from 'vitest'
import { caudalLs, itemsDe } from '../src/datos/subparametros'
import { construirExportacion, type DatosPlan } from '../src/exportar/exportador'

describe('parámetros de varias lecturas (caudal compuesto: volumen y tiempo)', () => {
  test('el caudal compuesto se pide como volumen (L) y tiempo (s); el resto de parámetros no cambia', () => {
    expect(itemsDe(['pH', 'Agua - Caudal Compuesto'])).toEqual([
      { nombre: 'pH', base: 'pH', etiqueta: 'pH' },
      { nombre: 'Agua - Caudal Compuesto | Volumen', base: 'Agua - Caudal Compuesto', etiqueta: 'Agua - Caudal Compuesto · Volumen', unidad: 'L' },
      { nombre: 'Agua - Caudal Compuesto | Tiempo', base: 'Agua - Caudal Compuesto', etiqueta: 'Agua - Caudal Compuesto · Tiempo', unidad: 's' },
    ])
    expect(itemsDe(['Agua - Temperatura '])).toEqual([{ nombre: 'Agua - Temperatura ', base: 'Agua - Temperatura ', etiqueta: 'Agua - Temperatura' }]) // conserva el nombre exacto
    expect(itemsDe(['Agua - Caudal Compuesto ']).map((i) => i.nombre)).toEqual(['Agua - Caudal Compuesto | Volumen', 'Agua - Caudal Compuesto | Tiempo']) // con espacio final
  })

  test('caudal = volumen / tiempo; vacío si falta una lectura o el tiempo no es positivo', () => {
    expect(caudalLs('30', '12')).toBe(2.5)
    expect(caudalLs('1,5', '3')).toBe(0.5)
    expect(caudalLs('10', '3')).toBe(3.333)
    expect([caudalLs('30', '0'), caudalLs('30', '-2'), caudalLs('x', '2'), caudalLs(undefined, '2'), caudalLs('30', undefined)]).toEqual([null, null, null, null, null])
  })

  test('el Excel de Sampler trae una fila por lectura y alícuota, con su unidad', () => {
    const m = { id: 'm1', codigo: '11001-26', punto_texto: 'Vertimiento', tipo: 'Compuesta', matriz: 'AGUA', submatriz: 'ARD', estado: 'cerrada' }
    const med = (id: string, parametro: string, alicuota: number, valor: string, unidad: string, hora: string): DatosPlan['mediciones'][number] => ({
      id, muestra_id: 'm1', parametro, alicuota, valor, unidad, hora_telefono: hora, lat: null, lon: null, precision_m: null, usuario_id: null, equipo_id: null,
      version: 1, reemplaza_a: null, motivo_correccion: null, marcada: false, motivo_marca: null,
    })
    const d: DatosPlan = {
      plan: { nombre: 'P' }, muestras: [m], parametros: [{ muestra_id: 'm1', parametro: 'Agua - Caudal Compuesto', es_insitu: true }],
      mediciones: [
        med('a', 'Agua - Caudal Compuesto | Volumen', 1, '30', 'L', '2026-11-04T13:00:00.000Z'), med('b', 'Agua - Caudal Compuesto | Tiempo', 1, '12', 's', '2026-11-04T13:00:20.000Z'),
        med('c', 'Agua - Caudal Compuesto | Volumen', 2, '28', 'L', '2026-11-04T14:00:00.000Z'), med('d', 'Agua - Caudal Compuesto | Tiempo', 2, '10', 's', '2026-11-04T14:00:15.000Z'),
      ],
      descripciones: [], fotos: [], usuarios: {},
    }
    expect(construirExportacion(d).resultados.map((f) => [f['Parametro'], f['Alicuota'], f['Valor'], f['Unidad'], f['Fecha y hora toma']])).toEqual([
      ['Agua - Caudal Compuesto | Volumen', 1, '30', 'L', '2026-11-04T13:00:00.000Z'], ['Agua - Caudal Compuesto | Tiempo', 1, '12', 's', '2026-11-04T13:00:20.000Z'],
      ['Agua - Caudal Compuesto | Volumen', 2, '28', 'L', '2026-11-04T14:00:00.000Z'], ['Agua - Caudal Compuesto | Tiempo', 2, '10', 's', '2026-11-04T14:00:15.000Z'],
    ])
  })
})
