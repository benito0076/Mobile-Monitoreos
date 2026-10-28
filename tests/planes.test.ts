import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { local } from '../src/datos/db-local'
import { tomarPlan } from '../src/datos/planes'

const PLAN = { id: 'p1', nombre: 'Plan 1' }

// Cliente falso: devuelve las filas de la tabla pedida (cortadas por range, como PostgREST).
function falso(tomado: boolean, muchas = 0, planId = 'p1') {
  const mid = planId === 'p1' ? 'm1' : `m-${planId}`
  const filas: Record<string, any[]> = {
    muestras: [{ id: mid, plan_id: planId, codigo: `10500-26-${planId}`, punto_texto: 'P', punto_codigo: null, tipo: 'Puntual', matriz: 'AGUA', submatriz: null, fecha_planeada: null, estado: 'pendiente' }],
    muestra_parametros: Array.from({ length: muchas || 2 }, (_, i) => ({ id: `r${planId}${i}`, muestra_id: mid, parametro: `par ${i} `, es_insitu: i === 0, muestras: { plan_id: planId } })),
    parametros_insitu: [{ nombre: 'pH', unidad: '', minimo: 0, maximo: 14, obligatorio: true }],
    configuracion: [{ clave: 'umbral_gps_m', valor: '30' }],
  }
  const llamadas: string[] = []
  return {
    llamadas,
    rpc: async (f: string) => (llamadas.push(f), { data: tomado, error: null }),
    from: (t: string) => ({
      select() { return this }, eq() { return this }, order() { return this },
      range: async (a: number, b: number) => ({ data: filas[t].slice(a, b + 1), error: null }),
    }),
  } as any
}

beforeEach(async () => { await Promise.all(local.tables.map((t) => t.clear())) })

describe('elegir plan', () => {
  test('si ya fue tomado no escribe nada en el teléfono', async () => {
    expect(await tomarPlan(falso(false), PLAN, 'u1')).toBe('tomado')
    expect(await local.planes.count()).toBe(0)
    expect(await local.muestras.count()).toBe(0)
  })

  test('si lo gana, descarga plan, muestras, parámetros exactos y configuración', async () => {
    expect(await tomarPlan(falso(true), PLAN, 'u1')).toBe('ok')
    expect((await local.planes.get('p1'))?.comision_id).toBe('u1')
    expect(await local.muestras.count()).toBe(1)
    const ps = await local.muestraParametros.toArray()
    expect(ps.map((p) => p.parametro)).toEqual(['par 0 ', 'par 1 ']) // espacio final intacto
    expect('muestras' in ps[0]).toBe(false)
    expect((await local.config.get('umbral_gps_m'))?.valor).toBe(30)
  })

  test('pagina cuando hay más de 1000 parámetros', async () => {
    await tomarPlan(falso(true, 2300), PLAN, 'u1')
    expect(await local.muestraParametros.count()).toBe(2300)
  })

  test('una comisión puede tener varios planes en el teléfono; descargar uno no borra los otros', async () => {
    await tomarPlan(falso(true, 0, 'p1'), PLAN, 'u1')
    await tomarPlan(falso(true, 3, 'p2'), { id: 'p2', nombre: 'Plan 2' }, 'u1')
    expect((await local.planes.toArray()).map((p) => p.id).sort()).toEqual(['p1', 'p2'])
    expect(await local.muestras.where('plan_id').equals('p1').count()).toBe(1)
    expect(await local.muestras.where('plan_id').equals('p2').count()).toBe(1)
    expect(await local.muestraParametros.count()).toBe(2 + 3)
    await tomarPlan(falso(true, 0, 'p1'), PLAN, 'u1') // actualizar el primero no toca el segundo
    expect(await local.muestraParametros.where('muestra_id').equals('m-p2').count()).toBe(3)
  })

  test('descargar de nuevo no duplica', async () => {
    await tomarPlan(falso(true), PLAN, 'u1'); await tomarPlan(falso(true), PLAN, 'u1')
    expect(await local.muestras.count()).toBe(1)
    expect(await local.muestraParametros.count()).toBe(2)
  })
})
