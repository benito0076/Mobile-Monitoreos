import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { leerPlan } from '../src/plan/leer-excel'
import { validarPlan } from '../src/plan/validar-plan'

const muestras = leerPlan(readFileSync('fixtures/Prueba_Items.xls'))

describe('lectura del .xls de ejemplo', () => {
  test('15 muestras, 10500-26 a 10514-26', () => {
    expect(muestras.map((m) => m.codigo)).toEqual(Array.from({ length: 15 }, (_, i) => `${10500 + i}-26`))
  })

  test('parámetros por muestra', () => {
    const n = Object.fromEntries(muestras.map((m) => [m.codigo, m.parametros.length]))
    for (const [c, k] of Object.entries(n)) expect(k, c).toBe(['10508-26', '10509-26', '10510-26', '10511-26'].includes(c) ? 47 : 50)
    expect(muestras[0].parametros).toContain('pH')
    expect(muestras[0].parametros).toContain('Agua - Acidez')
    expect(muestras[0].parametros).not.toContain('Parametro')
  })

  test('nombres exactos, sin recortar espacios', () => {
    expect(muestras[0].parametros).toContain('Agua - Temperatura ')
    expect(muestras[0].parametros).toContain('Agua - Oxígeno Disuelto ')
  })

  test('datos de la muestra y punto_codigo', () => {
    const m = muestras[0]
    expect([m.tipo, m.matriz, m.submatriz]).toEqual(['Puntual', 'AGUA', 'Agua Superficial'])
    expect(m.punto_texto).toBe('Ciénaga Llanito - Punto 6 MSP –LAM2249- 0035')
    expect(m.punto_codigo).toBe('LAM2249-0035')
    expect(muestras[14].punto_codigo).toBe('LAM2249-0034')
    expect(m.fecha_planeada).toMatch(/^2026-/)
  })

  test('el fixture es válido', () => {
    expect(validarPlan(muestras).filter((x) => x.nivel === 'error')).toEqual([])
  })
})

describe('validaciones', () => {
  const base = { punto_texto: 'p', punto_codigo: 'LAM2249-0001', tipo: '', matriz: '', submatriz: '', fecha_planeada: null }
  test('duplicados, sin parámetros y caracteres raros', () => {
    const r = validarPlan([
      { ...base, codigo: '1-26', parametros: ['pH'] },
      { ...base, codigo: '1-26', parametros: [] },
      { ...base, codigo: '2-26 ', parametros: ['pH', 'pH'] },
    ])
    const msgs = r.map((x) => x.mensaje)
    expect(msgs).toContain('Código de muestra duplicado')
    expect(msgs).toContain('Muestra sin parámetros')
    expect(msgs).toContain('El código tiene espacios o caracteres raros')
    expect(msgs).toContain('Parámetros repetidos')
  })
})

describe('guardar plan', () => {
  test('envía el plan completo a cargar_plan y devuelve el id', async () => {
    const { guardarPlan } = await import('../src/plan/guardar-plan')
    let args: unknown
    const db = { rpc: async (f: string, a: unknown) => ((args = [f, a]), { data: 'plan-1', error: null }) } as never
    expect(await guardarPlan(db, 'P', 'p.xls', muestras)).toBe('plan-1')
    expect((args as [string, { p_muestras: unknown[] }])[0]).toBe('cargar_plan')
    expect((args as [string, { p_muestras: unknown[] }])[1].p_muestras).toHaveLength(15)
    const mal = { rpc: async () => ({ data: null, error: { message: 'Solo la oficina carga planes' } }) } as never
    await expect(guardarPlan(mal, 'P', 'p.xls', muestras)).rejects.toThrow('Solo la oficina')
  })
})
