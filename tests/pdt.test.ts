import { readFileSync, writeFileSync } from 'node:fs'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, test } from 'vitest'
import { agruparParametros, agruparSolidos, claveDe, nombreCorto, tipoSolido } from '../src/exportar/alistamiento'
import { armarPdt, llenarPdt } from '../src/exportar/pdt'
import type { DatosPlan } from '../src/exportar/exportador'

describe('alistamiento: parámetro → grupo de preservación', () => {
  test.each([
    ['Agua - Aluminio ICP', 'METALES'], ['Agua - Arsénico ICP', 'METALES'], ['Agua - Titanio por llama', 'METALES'], ['Agua - Potasio total ICP', 'METALES'],
    ['Agua - Cromo ICP', 'METALES'], ['Agua - Cromo Hexavalente', 'CROMO_VI'], ['Agua - Cadmio disuelto', 'METALES_DISUELTOS'],
    ['Agua - Nitratos Sonda (RESIDUALES)', 'VARIOS'], ['Agua - Nitrito', 'VARIOS'], ['Agua - Sólidos Disueltos Totales', 'VARIOS'], ['Agua - Sólidos Suspendidos Totales', 'VARIOS'],
    ['Agua - Fluoruro', 'VARIOS'], ['Agua - Turbiedad', 'VARIOS'], ['Agua - Color Real', 'VARIOS'], ['Agua - RAS (Relación de Adsorción de Sodio)', 'VARIOS'],
    ['Agua - Amonio', 'DQO'], ['Agua - Nitrógeno Amoniacal', 'DQO'], ['Agua - DQO RB', 'DQO'], ['Agua - Dureza Total', 'DQO'], ['Agua - Nitrógeno Total', 'DQO'],
    ['Agua - Sólidos Sedimentables', 'SS'], ['Agua - DBO5 (BIOPOLAB)', 'DBO5'],
    ['Agua - Fósforo Reactivo Total (Leído como Ortofosfatos)', 'ORTOFOSFATOS'], ['Agua - Fósforo Total', 'FOSFORO'],
    ['Agua - Aceites y Grasas (POT-SUP)', 'ACEITES_GRASAS'], ['Agua - Hidrocarburos (pot-sup)', 'ACEITES_GRASAS'], ['Agua - Fenoles Rango bajo', 'FENOLES'],
    ['AGUA - COMPUESTOS FENÓLICOS (BIOPOLAB)', 'FENOLICOS_SUB'], ['AGUA - COMPUESTOS ORGÁNICOS VOLÁTILES-BTEX (BIOPOLAB)', 'BTEX'],
    ['Agua - Compuestos Orgánicos Semivolátiles', 'ORGANICOS_NO_HALOGENADOS'], ['AGUA - HIDROCARBUROS AROMÁTICOS POLICÍCLICOS (BIOPOLAB)', 'HAPS'],
    ['Cianuro Total', 'CIANURO'], ['Agua - AOX', 'AOX'], ['Agua - FORMALDEHIDO (WR)', 'FORMALDEHIDO'], ['Agua - Sulfuros', 'SULFUROS'],
    ['Agua - Coliformes Totales NMP', 'MICROBIOLOGICOS'], ['Agua - Coliformes Termotolerantes (Fecales) NMP', 'MICROBIOLOGICOS'],
    ['Agua - Comunidades bentónicas de fondos blandos (macrofauna y meiofauna) Fondos duros (epifauna)', 'BENTOS'], ['Agua - Ictiofauna', 'PECES'],
    ['Agua - Ictioplancton', 'ICTIOPLANCTON'], ['Agua - Perifiton', 'PERIFITON'], ['Agua - Fitoplancton', 'FITOPLANCTON'], ['Agua - Zooplancton', 'ZOOPLANCTON'],
    ['Agua - Macrófitas Acuáticas', 'MACROFITAS'], ['Agua - Raíces de macrófitas', 'MACROFITAS'], ['Agua - Sulfuro', 'SULFUROS'], ['Agua - Nitrógeno Orgánico', 'DQO'], ['Agua - Bicarbonatos, Carbonatos e Hidróxidos', 'VARIOS'], ['Agua - Conductividad', 'VARIOS'],
    ['Agua - Algo nuevo', 'POR_DEFINIR'],
  ])('%s → %s', (nombre, clave) => expect(claveDe(nombre)).toBe(clave))

  test('nombres legibles', () => {
    expect([nombreCorto('Agua - Cromo ICP'), nombreCorto('AGUA - COMPUESTOS FENÓLICOS (BIOPOLAB)'), nombreCorto('Agua - DQO RB'), nombreCorto('Agua - Hidrocarburos (pot-sup)'),
      nombreCorto('Agua - Fósforo Reactivo Total (Leído como Ortofosfatos)')]).toEqual(['Cromo', 'Compuestos fenólicos', 'DQO', 'Hidrocarburos', 'Fósforo Reactivo Total (Leído como Ortofosfatos)'])
  })

  test('una fila por grupo con sus parámetros; hidrobiológicos aparte; macrófitas bajo prensa', () => {
    const r = agruparParametros(['Agua - Cromo ICP', 'Agua - Zinc ICP', 'Agua - Acidez', 'Agua - Perifiton', 'Agua - Macrófitas Acuáticas'])
    expect(r.fisicoquimicos.map((f) => [f.grupo, f.parametros])).toEqual([['METALES', ['Cromo', 'Zinc']], ['VARIOS', ['Acidez']]])
    expect(r.hidrobiologicos.map((f) => f.grupo)).toEqual(['PERIFITON', 'MACRÓFITAS'])
    expect(r.hidrobiologicos[1]).toMatchObject({ material: 'Prensa', observaciones: 'Se trae bajo prensa si aplica' })
  })
})

describe('alistamiento: suelo, sedimento y lodo', () => {
  test('la matriz decide si es sólido; agua sigue por sus reglas', () => {
    expect([tipoSolido('SUELO', ''), tipoSolido('Sedimento', 'Sedimento continental'), tipoSolido('LODO', ''), tipoSolido('AGUA', 'Agua Superficial'), tipoSolido(null, null)]).toEqual(['suelo', 'sedimento', 'lodo', null, null])
  })

  test('suelo: grupos del laboratorio en gramos; subcontratados y sin fila quedan por definir', () => {
    const r = agruparSolidos(['Suelo - pH', 'Suelo - Conductividad Eléctrica', 'Suelo - Humedad', 'Suelo - Plomo', 'Suelo - Cadmio', 'Suelo - PSI (Porcentaje de sodio intercambiable)',
      'Suelo - Textura', 'Suelo - Densidad aparente', 'Suelo - Densidad real', 'Suelo - Grasas y aceites', 'Suelo - Coliformes Totales', 'Suelo - Fluoruros', 'Suelo - Arsénico', 'Suelo - Bases cambiables [Sodio]', 'Suelo - Aluminio intercambiable']
      .map((parametro) => ({ parametro, tipo: 'suelo' as const })))
    const por = Object.fromEntries(r.map((f) => [f.grupo, f]))
    expect(por['SUELO · GENERAL']).toMatchObject({ minimo: '300-500 g', material: 'Bolsa ziploc', observaciones: 'Máximo 30 días',
      parametros: ['Cadmio', 'Conductividad Eléctrica', 'Densidad real', 'Humedad', 'pH', 'Plomo', 'PSI (Porcentaje de sodio intercambiable)', 'Textura'] })
    expect(por['SUELO · DENSIDAD APARENTE'].parametros).toEqual(['Densidad aparente'])
    expect(por['SUELO · ACEITES Y GRASAS / HIDROCARBUROS']).toMatchObject({ minimo: '100 g', preservante: 'Refrigerar a 4 ± 2 °C', material: 'Frasco de vidrio boca ancha' })
    expect(por['SUELO · MICROBIOLÓGICOS']).toMatchObject({ preservante: 'Refrigerar a < 10 °C', observaciones: 'Analizar lo antes posible · Máximo 24 h' })
    expect(por['POR DEFINIR'].parametros).toEqual(['Aluminio intercambiable', 'Arsénico', 'Bases cambiables [Sodio]', 'Fluoruros'])
    expect(JSON.stringify(r)).not.toMatch(/HNO3|H2SO4/) // nada de preservas de agua en sólidos
  })

  test('suelo: intercambiables (Ca, Mg, K) y fósforo/nitrógeno total ya no quedan por definir', () => {
    const r = agruparSolidos(['Suelo - Calcio intercambiable', 'Suelo - Bases cambiables [Magnesio]', 'Suelo - Potasio Intercambiable', 'Suelo - Fósforo total', 'Suelo - Nitrógeno Total',
      'Suelo - Bases cambiables [Sodio]', 'Suelo - Aluminio intercambiable'].map((parametro) => ({ parametro, tipo: 'suelo' as const })))
    expect(r.map((f) => [f.grupo, f.minimo, f.material, f.parametros])).toEqual([
      ['SUELO · CALCIO INTERCAMBIABLE', '100 g', 'Frasco de vidrio', ['Calcio intercambiable']],
      ['SUELO · MAGNESIO INTERCAMBIABLE', '100 g', 'Frasco de vidrio', ['Bases cambiables [Magnesio]']],
      ['SUELO · POTASIO INTERCAMBIABLE', '100 g', 'Frasco de vidrio', ['Potasio Intercambiable']],
      ['SUELO · FÓSFORO Y NITRÓGENO TOTAL', '2000 g', 'Bolsa hermética', ['Fósforo total', 'Nitrógeno Total']],
      ['POR DEFINIR', 'Por definir', 'Por definir', ['Aluminio intercambiable', 'Bases cambiables [Sodio]']],
    ])
  })

  test('sedimento y lodo: tabla de almacenamiento; agua de poro aparte', () => {
    const r = agruparSolidos([{ parametro: 'Sedimento - Aceites y Grasas', tipo: 'sedimento' }, { parametro: 'Lodo - Hidrocarburos', tipo: 'lodo' },
      { parametro: 'Sedimento - Nitrógeno amoniacal en agua de poro', tipo: 'sedimento' }, { parametro: 'Sedimento - Plomo', tipo: 'sedimento' }])
    expect(r[0].preservante).toBe('Refrigerar a 4 ± 2 °C')
    expect(r.map((f) => [f.grupo, f.parametros])).toEqual([['SEDIMENTO Y LODO · ACEITES Y GRASAS / HIDROCARBUROS', ['Aceites y Grasas', 'Hidrocarburos']],
      ['SEDIMENTO · AGUA DE PORO', ['Nitrógeno amoniacal en agua de poro']], ['POR DEFINIR', ['Plomo']]])
  })
})

describe('PDT (FM-081)', () => {
  const muestras = Array.from({ length: 9 }, (_, i) => ({
    id: `m${i}`, codigo: `1110${i}-26`, punto_texto: `Vertimiento Purga de lodos U 800/850 C${i}`, tipo: i < 6 ? 'Compuesta' : 'Puntual', matriz: 'AGUA', submatriz: 'Agua Residual no Doméstica', estado: 'cerrada',
  }))
  const lab = ['Agua - Aluminio ICP', 'Agua - Cadmio ICP', 'Agua - Cromo ICP', 'Agua - Zinc ICP', 'Agua - Acidez', 'Agua - Cloruros', 'Agua - Nitratos Sonda (RESIDUALES)', 'Agua - DQO RB', 'Agua - Nitrógeno Amoniacal',
    'Agua - DBO5 (BIOPOLAB)', 'Agua - Aceites y Grasas (POT-SUP)', 'Agua - Fenoles Rango bajo', 'Agua - Sulfuros', 'AGUA - COMPUESTOS ORGÁNICOS VOLÁTILES-BTEX (BIOPOLAB)', 'Cianuro Total', 'Agua - Coliformes Totales NMP',
    'Agua - Perifiton', 'Agua - Ictioplancton', 'Agua - Macrófitas Acuáticas', 'Agua - Algo & <nuevo>']
  const insitu = ['Agua - pH Compuesto', 'Agua - Temperatura - Compuesto', 'Agua - Caudal Compuesto', 'Agua - Sólidos Sedimentables - Compuesto']
  const d: DatosPlan = {
    plan: { nombre: 'Muestreo 1128-26' }, muestras,
    parametros: muestras.flatMap((m) => [...lab.map((parametro) => ({ muestra_id: m.id, parametro, es_insitu: false })), ...insitu.map((parametro) => ({ muestra_id: m.id, parametro, es_insitu: true }))]),
    mediciones: [], descripciones: [], fotos: [], usuarios: {},
  }
  const ficha = { cliente: 'ACME S.A.S. & Cía', cotizacion: '1132-24-V3', direccion: 'Saldaña, Tolima', contacto: 'Zayda', telefono: '318', telefono_campo: '301 - 350' }
  const datos = armarPdt(d, ficha, ['Michael Campos', 'Javier Clavijo'])

  test('arma los datos del plan', () => {
    expect(datos).toMatchObject({ ficha: { codigo_muestreo: '1128-26' }, matrices: { agua: true, suelos: false }, tipos: { puntual: true, compuesto: true, integrado: false }, puntos: expect.any(Array) })
    expect(datos.puntos).toHaveLength(9)
    expect(datos.objetivo).toBe('Realizar caracterización físico-química e hidrobiológica de los puntos mencionados, según las condiciones del cliente.')
    expect(datos.insitu).toEqual(['Caudal Compuesto', 'pH Compuesto', 'Sólidos Sedimentables - Compuesto', 'Temperatura - Compuesto'])
    expect(datos.fisicoquimicos[0]).toMatchObject({ grupo: 'METALES', parametros: ['Aluminio', 'Cadmio', 'Cromo', 'Zinc'] })
  })

  test('genera un xlsx coherente: filas seguidas, celdas combinadas dentro de la hoja, sin restos del ejemplo', () => {
    const bytes = llenarPdt(readFileSync('public/fm-081.xlsx'), datos)
    if (process.env.PDT_SALIDA) writeFileSync(process.env.PDT_SALIDA, bytes)
    const z = unzipSync(bytes)
    const xml = strFromU8(z['xl/worksheets/sheet1.xml'])
    const filas = [...xml.matchAll(/<row r="(\d+)"/g)].map((m) => +m[1])
    expect(filas).toEqual(filas.map((_, i) => i + 1))
    const total = filas.length
    const combinadas = [...xml.matchAll(/<mergeCell ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"\/>/g)]
    expect(combinadas.length).toBe(+xml.match(/<mergeCells count="(\d+)"/)![1])
    expect(combinadas.every((m) => +m[2] <= +m[4] && +m[4] <= total)).toBe(true)
    // ninguna celda combinada se solapa con otra
    const ocupadas = new Set<string>()
    for (const m of combinadas) for (let r = +m[2]; r <= +m[4]; r++) for (let c = m[1].charCodeAt(0); c <= m[3].charCodeAt(0); c++) { const k = `${String.fromCharCode(c)}${r}`; expect(ocupadas.has(k)).toBe(false); ocupadas.add(k) }
    for (const texto of ['ACME S.A.S. &amp; Cía', '1132-24-V3', '1128-26', 'Michael Campos - Javier Clavijo', 'Vertimiento Purga de lodos U 800/850 C8', 'Aluminio, Cadmio, Cromo, Zinc', 'Se trae bajo prensa si aplica', 'Algo &amp; &lt;nuevo&gt;', 'Caudal Compuesto'])
      expect(xml).toContain(texto)
    expect(xml).not.toMatch(/Saldaña Tolima|Río Saldaña|CPT/)
    expect(strFromU8(z['xl/workbook.xml'])).toContain(`$N$${total}`)
    expect(strFromU8(z['xl/worksheets/sheet1.xml'])).toMatch(/<brk id="\d+"/)
  })

  test('sin parámetros ni puntos sigue siendo un archivo válido', () => {
    const vacio = llenarPdt(readFileSync('public/fm-081.xlsx'), armarPdt({ ...d, muestras: [], parametros: [] }))
    expect(strFromU8(unzipSync(vacio)['xl/worksheets/sheet1.xml'])).toContain('<row r="1"')
  })
})

test('un plan con agua y suelo: cada parámetro sigue la matriz de su muestra', () => {
  const base = { punto_texto: 'P1', tipo: 'Puntual', submatriz: '', estado: 'cerrada' }
  const d: DatosPlan = {
    plan: { nombre: 'Muestreo 2000-26' },
    muestras: [{ id: 'a', codigo: '20001-26', matriz: 'AGUA', ...base }, { id: 's', codigo: '20002-26', matriz: 'SUELO', ...base }],
    parametros: [{ muestra_id: 'a', parametro: 'Agua - Plomo ICP', es_insitu: false }, { muestra_id: 's', parametro: 'Suelo - Plomo', es_insitu: false }, { muestra_id: 's', parametro: 'Suelo - Humedad', es_insitu: false }],
    mediciones: [], descripciones: [], fotos: [], usuarios: {},
  }
  const r = armarPdt(d).fisicoquimicos
  expect(r.map((f) => [f.grupo, f.preservante, f.parametros])).toEqual([['METALES', 'Acidificar a pH < 2 con HNO3', ['Plomo']], ['SUELO · GENERAL', 'Temperatura ambiente, entregar lo antes posible', ['Humedad', 'Plomo']]])
  const xml = strFromU8(unzipSync(llenarPdt(readFileSync('public/fm-081.xlsx'), armarPdt(d)))['xl/worksheets/sheet1.xml'])
  expect(xml).toContain('Bolsa ziploc')
})

describe('PDT: unidad de la muestra y prueba de infiltración', () => {
  const base = { punto_texto: 'P1', tipo: 'Puntual', submatriz: '', estado: 'cerrada' }
  const plan = (filas: [string, string, boolean][]): DatosPlan => ({
    plan: { nombre: 'Muestreo 3000-26' },
    muestras: [{ id: 'a', codigo: '30001-26', matriz: 'AGUA', ...base }, { id: 's', codigo: '30002-26', matriz: 'SUELO', ...base }],
    parametros: filas.map(([muestra_id, parametro, es_insitu]) => ({ muestra_id, parametro, es_insitu })),
    mediciones: [], descripciones: [], fotos: [], usuarios: {},
  })
  const hoja = (d: ReturnType<typeof armarPdt>) => strFromU8(unzipSync(llenarPdt(readFileSync('public/fm-081.xlsx'), d))['xl/worksheets/sheet1.xml'])

  test('solo sólidos: «(g)»; mezcla: «(mL / g)»; solo agua: la plantilla no cambia', () => {
    const suelo = armarPdt(plan([['s', 'Suelo - Humedad', false]]))
    const mezcla = armarPdt(plan([['s', 'Suelo - Humedad', false], ['a', 'Agua - Acidez', false]]))
    const agua = armarPdt(plan([['a', 'Agua - Acidez', false]]))
    expect([suelo.unidadMuestra, mezcla.unidadMuestra, agua.unidadMuestra]).toEqual(['g', 'mL / g', undefined])
    expect(hoja(suelo)).toContain('TAMAÑO MINIMO DE MUESTRA (g)')
    expect(hoja(mezcla)).toContain('TAMAÑO MINIMO DE MUESTRA (mL / g)')
    expect(hoja(agua)).not.toContain('TAMAÑO MINIMO DE MUESTRA (')
  })

  test('la prueba de infiltración va en los parámetros in situ, no en los de laboratorio', () => {
    const d = armarPdt(plan([['s', 'Suelo - Prueba de infiltración', false], ['s', 'Suelo - Humedad', false]]))
    expect(d.insitu).toEqual(['Prueba de infiltración'])
    expect(d.fisicoquimicos.flatMap((f) => f.parametros)).toEqual(['Humedad'])
  })
})
