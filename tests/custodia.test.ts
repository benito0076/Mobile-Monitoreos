import { readFileSync, writeFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, test } from 'vitest'
import { columnaDe, filaTipo, matrizDe } from '../src/exportar/custodia-mapa'
import { armarCustodia, llenarCustodia } from '../src/exportar/custodia-pdf'
import type { DatosPlan } from '../src/exportar/exportador'

describe('mapa de columnas FM-017', () => {
  test.each([
    ['Agua - DBO5 (BIOPOLAB)', 'DBO5'], ['Agua - DQO RB', 'DQO'], ['Agua - Aceites y Grasas (POT-SUP)', 'ACEITES Y GRASAS'],
    ['Agua - Cromo ICP', 'METALES'], ['Agua - Titanio por llama', 'METALES'], ['Agua - Zinc ICP', 'METALES'], ['Agua - Cromo Hexavalente', 'CROMO HEXAVALENTE'],
    ['AGUA - COMPUESTOS ORGÁNICOS VOLÁTILES-BTEX (BIOPOLAB)', 'BTEX'], ['AGUA - HIDROCARBUROS AROMÁTICOS POLICÍCLICOS (BIOPOLAB)', 'HAPS'],
    ['Agua - Fenoles Rango bajo', 'COMPUESTOS FENO.'], ['Cianuro Total', 'CIANUROS'], ['Agua - Fluoruro', 'FLUORUROS'], ['Agua - AOX', 'AOX'],
    ['Agua - FORMALDEHIDO (WR)', 'FORMALDEHIDO'], ['Agua - Sulfuros', 'SULFUROS'], ['Agua - Nitrógeno Total', 'NITROGENO TOTAL'],
    ['Agua - Acidez', 'VARIOS'], ['Agua - Nitrógeno Amoniacal', 'VARIOS'], ['Agua - Compuestos Orgánicos Semivolátiles', 'VARIOS'], ['Agua - Fósforo Total', 'VARIOS'],
    ['Agua - Sólidos Disueltos Totales', 'VARIOS'], ['Agua - Comunidades bentónicas de fondos blandos', 'BENTOS'], ['Agua - Ictiofauna', 'PECES'], ['Agua - Macrófitas Acuáticas', 'OTROS HIDRO'],
    ['Agua - Coliformes Totales NMP', 'COLIFORMES TOTALES'], ['Agua - Coliformes Termotolerantes (Fecales) NMP', 'COLIFORMES TERMOTOLERANTES'],
    ['Agua - Potasio total ICP', 'METALES'], ['Agua - Perifiton', 'PERIFITON'], ['Agua - Coliformes Termotolerantes', 'COLIFORMES TERMOTOLERANTES'],
  ])('%s → %s', (nombre, col) => expect(columnaDe(nombre)).toBe(col))

  test('matriz y tipo del plan', () => {
    expect(matrizDe('AGUA', 'Agua Residual no Doméstica')).toBe('ARnD')
    expect(matrizDe('AGUA', 'Agua Superficial')).toBe('A. SUP')
    expect([filaTipo('Integrada'), filaTipo('Compuesta'), filaTipo('Puntual'), filaTipo('Duplicado'), filaTipo(null)]).toEqual([0, 1, 2, 3, 2])
  })
})

describe('cadena de custodia', () => {
  const muestras = Array.from({ length: 9 }, (_, i) => ({
    id: `m${i}`, codigo: `1110${i}-26`, punto_texto: `Vertimiento Purga de lodos U 800/850 C${i} – punto de muestreo con nombre largo para probar el ajuste de línea`,
    fecha_planeada: '2026-10-17T14:38:00Z', tipo: i % 2 ? 'Compuesta' : 'Puntual', matriz: 'AGUA', submatriz: 'Agua Residual no Doméstica', estado: 'cerrada',
  }))
  const d: DatosPlan = {
    plan: { nombre: 'Muestreo 1128-26' }, muestras,
    parametros: muestras.flatMap((m) => ['Agua - pH Compuesto', 'Agua - DQO RB', 'Agua - Cromo ICP', 'Agua - Aceites y Grasas (POT-SUP)', 'Agua - Acidez', 'Cianuro Total']
      .map((parametro) => ({ muestra_id: m.id, parametro, es_insitu: parametro.includes('pH') }))),
    mediciones: [{ id: 'x', muestra_id: 'm0', parametro: 'Agua - pH Compuesto', valor: '7', unidad: '', hora_telefono: '2026-10-20T15:05:00Z', lat: null, lon: null, precision_m: null, usuario_id: 'u1', equipo_id: 'e', version: 1, reemplaza_a: null, motivo_correccion: null, marcada: false, motivo_marca: null }],
    descripciones: [], fotos: [], usuarios: { u1: 'Usuario Prueba' },
  }

  test('arma los datos: solo laboratorio, código del muestreo desde el nombre del plan, fechas de la medición y en blanco si no hay', () => {
    const c = armarCustodia(d, { cliente: 'ACME' })
    expect(c.ficha).toMatchObject({ cliente: 'ACME', codigo_muestreo: '1128-26' })
    expect(c.muestras[0].parametros).not.toContain('Agua - pH Compuesto')
    expect(c.muestras[0].inicio!.toISOString()).toBe('2026-10-20T15:05:00.000Z')
    expect([c.muestras[1].inicio, c.muestras[1].fin]).toEqual([null, null]) // sin mediciones: fecha y hora en blanco
    expect(c.responsables).toEqual(['Usuario Prueba'])
  })

  test('genera el PDF con una hoja por cada 7 muestras', async () => {
    const bytes = await llenarCustodia(readFileSync('public/fm-017.pdf'), armarCustodia(d, { cliente: 'ACME S.A.S.', cotizacion: 'COT-123', municipio: 'Barrancabermeja', departamento: 'Santander' }))
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
    if (process.env.CUSTODIA_SALIDA) writeFileSync(process.env.CUSTODIA_SALIDA, bytes)
  })
})
