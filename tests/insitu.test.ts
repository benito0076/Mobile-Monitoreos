import { describe, expect, test } from 'vitest'
import { aFilaInsitu, guardarInsitu, quitarInsitu, reaplicarInsitu } from '../src/datos/insitu'

const base = { nombre: 'Agua - pH Compuesto', unidad: ' unidades de pH ', minimo: '0', maximo: '14', obligatorio: false }

describe('lista de parámetros in situ', () => {
  test('convierte el formulario: números, vacío = sin límite, unidad recortada, nombre intacto', () => {
    expect(aFilaInsitu(base)).toEqual({ nombre: 'Agua - pH Compuesto', unidad: 'unidades de pH', minimo: 0, maximo: 14, obligatorio: false })
    expect(aFilaInsitu({ ...base, nombre: 'Agua - Temperatura ', minimo: '', maximo: '' })).toMatchObject({ nombre: 'Agua - Temperatura ', minimo: null, maximo: null }) // espacio final conservado
    expect(aFilaInsitu({ ...base, minimo: '0,5' }).minimo).toBe(0.5)
  })

  test('rechaza datos inválidos', () => {
    expect(() => aFilaInsitu({ ...base, nombre: '' })).toThrow('Elige el parámetro')
    expect(() => aFilaInsitu({ ...base, minimo: 'abc' })).toThrow('mínimo debe ser un número')
    expect(() => aFilaInsitu({ ...base, minimo: '15' })).toThrow('no puede ser mayor')
  })

  test('guarda por nombre (upsert), quita y reaplica a los planes cargados', async () => {
    const llamadas: any[] = []
    const db: any = {
      from: (t: string) => ({
        upsert: async (f: any, o: any) => (llamadas.push(['upsert', t, f.nombre, o]), { error: null }),
        delete: () => ({ eq: async (c: string, v: string) => (llamadas.push(['delete', t, c, v]), { error: null }) }),
      }),
      rpc: async (f: string) => (llamadas.push(['rpc', f]), { data: 40, error: null }),
    }
    await guardarInsitu(db, aFilaInsitu(base)); await quitarInsitu(db, 'X ')
    expect(await reaplicarInsitu(db)).toBe(40)
    expect(llamadas).toEqual([
      ['upsert', 'parametros_insitu', 'Agua - pH Compuesto', { onConflict: 'nombre' }],
      ['delete', 'parametros_insitu', 'nombre', 'X '],
      ['rpc', 'reaplicar_insitu'],
    ])
  })

  test('un error del servidor llega como mensaje', async () => {
    const db: any = { rpc: async () => ({ data: null, error: { message: 'Solo la oficina reaplica la lista de parámetros in situ' } }) }
    await expect(reaplicarInsitu(db)).rejects.toThrow('Solo la oficina')
  })
})
