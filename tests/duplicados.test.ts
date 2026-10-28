import { describe, expect, test } from 'vitest'
import { agruparRepetidos, buscarRepetidos, existePlanConNombre, textoRepetido } from '../src/plan/duplicados'

// Cliente falso: devuelve las filas de `muestras` cuyo código esté en el lote pedido.
const existentes = [
  { codigo: '10500-26', planes: { nombre: 'Prueba Items' } }, { codigo: '10501-26', planes: { nombre: 'Prueba Items' } },
  { codigo: '10500-26', planes: { nombre: 'Otro plan' } }, { codigo: '99999-26', planes: null },
]
function falso(consultas: string[][] = []) {
  return {
    from: (t: string) => {
      let lote: string[] = []; let nombre = ''
      const q: any = {
        select: () => q, order: () => q, limit: () => q,
        in: (_c: string, l: string[]) => ((lote = l), consultas.push(l), q),
        eq: (_c: string, v: string) => ((nombre = v), q),
        range: async (a: number, b: number) => ({ data: existentes.filter((f) => lote.includes(f.codigo)).slice(a, b + 1), error: null }),
        then: (ok: any) => ok({ data: t === 'planes' && nombre === 'Prueba Items' ? [{ id: 'p' }] : [], error: null }),
      }
      return q
    },
  } as any
}

describe('planes duplicados', () => {
  test('agrupa por plan, ordena por cantidad y no repite códigos', () => {
    expect(agruparRepetidos(existentes)).toEqual([
      { plan: 'Prueba Items', codigos: ['10500-26', '10501-26'] }, // el que más repite, primero
      { plan: 'Otro plan', codigos: ['10500-26'] },               // empates: en orden de aparición
      { plan: '(plan sin nombre)', codigos: ['99999-26'] },
    ])
  })

  test('busca los códigos en lotes de 100 y encuentra los repetidos', async () => {
    const consultas: string[][] = []
    const codigos = Array.from({ length: 250 }, (_, i) => `${20000 + i}-26`).concat(['10500-26'])
    const r = await buscarRepetidos(falso(consultas), codigos)
    expect(consultas.map((l) => l.length)).toEqual([100, 100, 51])
    expect(r.map((x) => x.plan).sort()).toEqual(['Otro plan', 'Prueba Items'])
  })

  test('un archivo nuevo no avisa nada', async () => {
    expect(await buscarRepetidos(falso(), ['30000-26', '30001-26'])).toEqual([])
  })

  test('detecta un plan con el mismo nombre y redacta el aviso', async () => {
    expect(await existePlanConNombre(falso(), ' Prueba Items ')).toBe(true)
    expect(await existePlanConNombre(falso(), 'Nuevo')).toBe(false)
    expect(textoRepetido({ plan: 'Prueba Items', codigos: ['1-26', '2-26', '3-26', '4-26'] }, 15)).toBe('4 de 15 códigos ya están en el plan «Prueba Items» (1-26, 2-26, 3-26…)')
  })
})
