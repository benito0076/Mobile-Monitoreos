import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { local, metaSet } from '../src/datos/db-local'
import { cambiarEstado, corregirMedicion, guardarDescripcion, guardarFoto, claveMedicion, guardarMedicion, vigentes } from '../src/datos/mediciones'
import { advertencias, parsearValor } from '../src/datos/validar-medicion'

const gps = { lat: 7.1, lon: -73.1, precision_m: 8 }
const base = { muestra_id: 'm1', parametro: 'pH', unidad: 'u', usuario_id: 'u1', gps }

beforeEach(async () => {
  await Promise.all(local.tables.map((t) => t.clear()))
  await local.muestras.add({ id: 'm1', plan_id: 'p1', codigo: '10500-26', punto_texto: 'P', punto_codigo: null, tipo: null, matriz: null, submatriz: null, fecha_planeada: null, estado: 'pendiente' })
})

describe('alícuotas (muestras compuestas)', () => {
  test('cada alícuota tiene su propia medición y su propia cadena de correcciones', async () => {
    await guardarMedicion({ ...base, alicuota: 1, valor: '7' })
    await guardarMedicion({ ...base, alicuota: 2, valor: '7.5' }) // mismo parámetro, otra alícuota: no es duplicado
    await expect(guardarMedicion({ ...base, alicuota: 2, valor: '8' })).rejects.toThrow('corrección')
    const c = await corregirMedicion({ ...base, alicuota: 2, valor: '7.6', motivo: 'lectura' })
    expect(c).toMatchObject({ alicuota: 2, version: 2 })
    const v = await vigentes('m1')
    expect([v.get(claveMedicion('pH', 1))!.valor, v.get(claveMedicion('pH', 2))!.valor]).toEqual(['7', '7.6'])
    await expect(corregirMedicion({ ...base, alicuota: 3, valor: '7', motivo: 'x' })).rejects.toThrow('No hay medición')
  })
})

describe('mediciones', () => {
  test('guarda al instante con hora, GPS, precisión, usuario, equipo, versión y desfase', async () => {
    await metaSet('desfase_reloj_s', 2.5)
    const r = await guardarMedicion({ ...base, valor: '7,2' })
    const g = (await local.mediciones.get(r.id))!
    expect(g).toMatchObject({ valor: '7.2', lat: 7.1, precision_m: 8, usuario_id: 'u1', version: 1, reemplaza_a: null, sincronizado: 0, desfase_reloj_s: 2.5 })
    expect(g.equipo_id).toBeTruthy(); expect(g.version_app).toBeTruthy(); expect(Date.parse(g.hora_telefono)).not.toBeNaN()
  })

  test('sin GPS se guarda con coordenadas nulas', async () => {
    const r = await guardarMedicion({ ...base, valor: '7', gps: null })
    expect([r.lat, r.lon, r.precision_m]).toEqual([null, null, null])
  })

  test('rechaza valores no numéricos y duplicados', async () => {
    await expect(guardarMedicion({ ...base, valor: 'abc' })).rejects.toThrow('número')
    await guardarMedicion({ ...base, valor: '7' })
    await expect(guardarMedicion({ ...base, valor: '8' })).rejects.toThrow('corrección')
  })

  test('dos envíos simultáneos (Enter + blur) no duplican', async () => {
    const r = await Promise.allSettled([guardarMedicion({ ...base, valor: '7' }), guardarMedicion({ ...base, valor: '7' })])
    expect(r.map((x) => x.status).sort()).toEqual(['fulfilled', 'rejected'])
    expect(await local.mediciones.count()).toBe(1)
    const d = await Promise.allSettled([guardarDescripcion('m1', 'a', 'u1'), guardarDescripcion('m1', 'a', 'u1')])
    expect(d.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
    expect(await local.descripciones.count()).toBe(1)
  })

  test('la corrección exige motivo, crea versión nueva y no toca la anterior', async () => {
    const v1 = await guardarMedicion({ ...base, valor: '7' })
    await expect(corregirMedicion({ ...base, valor: '7.4', motivo: '  ' })).rejects.toThrow('motivo')
    const v2 = await corregirMedicion({ ...base, valor: '7.4', motivo: 'Error de lectura' })
    expect(v2).toMatchObject({ version: 2, reemplaza_a: v1.id, motivo_correccion: 'Error de lectura' })
    expect((await local.mediciones.get(v1.id))!.valor).toBe('7')
    expect((await vigentes('m1')).get('pH')!.valor).toBe('7.4')
    const v3 = await corregirMedicion({ ...base, valor: '7.5', motivo: 'Otra vez' })
    expect(v3.reemplaza_a).toBe(v2.id)
  })
})

describe('descripción, fotos y estado', () => {
  test('descripción: primera libre, cambios con motivo', async () => {
    await guardarDescripcion('m1', ' Orilla norte ', 'u1')
    await expect(guardarDescripcion('m1', 'Orilla sur', 'u1')).rejects.toThrow('motivo')
    const d = await guardarDescripcion('m1', 'Orilla sur', 'u1', 'Me equivoqué de orilla')
    expect(d.version).toBe(2)
    expect(await local.descripciones.count()).toBe(2)
  })

  test('foto se guarda por código de muestra', async () => {
    const f = await guardarFoto('m1', new Blob(['x']), gps, 'u1')
    expect(f.ruta_storage).toBe(`p1/10500-26/${f.id}.jpg`)
  })

  test('el estado avanza y una muestra cerrada no se reabre', async () => {
    await cambiarEstado('m1', 'en_campo'); await cambiarEstado('m1', 'cerrada'); await cambiarEstado('m1', 'en_campo')
    expect(await local.muestras.get('m1')).toMatchObject({ estado: 'cerrada', estado_pendiente: 1 })
  })
})

describe('validaciones suaves', () => {
  const ph = { nombre: 'pH', unidad: 'u', minimo: 0, maximo: 14, obligatorio: true }
  test('valor', () => { expect(parsearValor('7,5')).toBe(7.5); expect(parsearValor('7,5 mg')).toBeNull(); expect(parsearValor('')).toBeNull() })
  test('advierte rango y precisión GPS, sin bloquear', () => {
    expect(advertencias(7, ph, gps, 30)).toEqual([])
    expect(advertencias(15, ph, gps, 30)[0]).toMatch(/fuera del rango/)
    expect(advertencias(7, ph, { ...gps, precision_m: 45 }, 30)[0]).toMatch(/45 m, peor que 30 m/)
    expect(advertencias(7, ph, null, 30)[0]).toMatch(/Sin señal GPS/)
  })
})
