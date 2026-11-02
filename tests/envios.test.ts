import 'fake-indexeddb/auto'
import { readFileSync, writeFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, test } from 'vitest'
import { local } from '../src/datos/db-local'
import { bajarEnvios, crearEnvioLocal, datosDeEnvioLocal, enviosDelPlan, fechaEnvioPorMuestra, muestrasPorEnviar } from '../src/datos/envios'
import { asegurarUsuarioLocal } from '../src/datos/sesion'
import { pendientes, sincronizar } from '../src/datos/sync'
import { armarCustodia, llenarCustodia } from '../src/exportar/custodia-pdf'

const muestra = (id: string, estado = 'cerrada') => ({ id, plan_id: 'p1', codigo: `1110${id}-26`, punto_texto: `Punto ${id}`, punto_codigo: null, tipo: 'Puntual', matriz: 'AGUA', submatriz: 'Agua Superficial', fecha_planeada: null, estado })
const nuevo = (ids: string[], extra = {}) => ({ plan_id: 'p1', muestraIds: ids, fecha: '2026-11-02', usuario_id: 'u1', ...extra })

beforeEach(async () => {
  await Promise.all(local.tables.map((t) => t.clear()))
  await local.planes.add({ id: 'p1', nombre: 'Muestreo 1128-26', comision_id: 'u1', descargado_en: '', ficha: { cliente: 'ACME' }, tecnicos: ['Ana', 'Luis'] })
  await local.muestras.bulkAdd([muestra('1'), muestra('2'), muestra('3'), muestra('4', 'en_campo')])
})

describe('envíos en el teléfono', () => {
  test('solo se ofrecen las muestras cerradas que aún no van en ningún envío', async () => {
    expect((await muestrasPorEnviar('p1')).map((m) => m.id)).toEqual(['1', '2', '3'])
    await crearEnvioLocal(nuevo(['1', '2']))
    expect((await muestrasPorEnviar('p1')).map((m) => m.id)).toEqual(['3'])
  })

  test('una muestra va en un solo envío; una abierta no se envía; todo o nada', async () => {
    await crearEnvioLocal(nuevo(['1']))
    await expect(crearEnvioLocal(nuevo(['2', '1']))).rejects.toThrow('ya va en el envío del 02/11/2026')
    await expect(crearEnvioLocal(nuevo(['2', '4']))).rejects.toThrow('no está cerrada')
    await expect(crearEnvioLocal(nuevo([]))).rejects.toThrow('al menos una')
    await expect(crearEnvioLocal(nuevo(['2'], { fecha: 'hoy' }))).rejects.toThrow('fecha')
    expect(await local.envios.count()).toBe(1) // los intentos fallidos no dejaron nada a medias
    expect(await local.envioMuestras.count()).toBe(1)
  })

  test('lista los envíos del plan con sus muestras y marca cada muestra enviada', async () => {
    await crearEnvioLocal(nuevo(['1', '2'], { fecha: '2026-11-02' }))
    await crearEnvioLocal(nuevo(['3'], { fecha: '2026-11-03' }))
    expect((await enviosDelPlan('p1')).map((e) => [e.fecha, e.muestras, e.pendiente])).toEqual([['2026-11-03', 1, true], ['2026-11-02', 2, true]])
    expect([...(await fechaEnvioPorMuestra('p1'))].sort()).toEqual([['1', '2026-11-02'], ['2', '2026-11-02'], ['3', '2026-11-03']])
  })

  test('cuenta como pendiente de sincronizar y sube primero el envío y luego sus muestras', async () => {
    await crearEnvioLocal(nuevo(['1', '2']))
    expect((await pendientes()).envios).toBe(3)
    const subidas: string[] = []
    const db: any = { from: (t: string) => ({ upsert: async (filas: any, o: any) => {
      for (const f of [filas].flat()) { if ('sincronizado' in f) throw new Error('campos locales enviados'); subidas.push(`${t}:${f.muestra_id ?? f.id}`) }
      if (t === 'envio_muestras' && o.onConflict !== 'envio_id,muestra_id') throw new Error('debe ser idempotente')
      return { error: null }
    } }) }
    const r = await sincronizar(db, { esperaMs: 0 })
    expect(r.errores).toEqual([])
    expect(subidas[0].startsWith('envios:')).toBe(true)
    expect(subidas.slice(1).sort()).toEqual(['envio_muestras:1', 'envio_muestras:2'])
    expect((await pendientes()).total).toBe(0)
  })

  test('si el servidor rechaza una muestra por ir ya en otro envío, lo dice y no frena al resto', async () => {
    await crearEnvioLocal(nuevo(['1', '2']))
    const db: any = { from: (t: string) => ({ upsert: async (f: any) => (t === 'envio_muestras' && f.muestra_id === '1'
      ? { error: { message: 'duplicate key value violates unique constraint "envio_muestras_muestra_id_key"', code: '23505' } } : { error: null }) }) }
    const r = await sincronizar(db, { esperaMs: 0 })
    expect(r.errores.join()).toContain('ya va en otro envío')
    expect((await local.envioMuestras.get('2'))?.sincronizado).toBe(1)
    expect((await local.envioMuestras.get('1'))?.error_sync).toContain('otro envío')
    expect((await enviosDelPlan('p1'))[0].error).toContain('otro envío')
  })

  test('baja los envíos del compañero y aplica las anulaciones sin pisar lo pendiente', async () => {
    const delCompa = { id: 'e9', plan_id: 'p1', fecha: '2026-11-01', medio_transporte: 'aereo', controles: {}, temperatura_testigo: null, observaciones: null, entrega: 'Luis', hora_telefono: '2026-11-01T20:00:00Z', hora_servidor: 'x', usuario_id: 'u2', anulado_en: null }
    const filas: Record<string, any[]> = { envios: [delCompa], envio_muestras: [{ envio_id: 'e9', muestra_id: '3', muestras: { plan_id: 'p1' } }] }
    const db: any = { from: (t: string) => { const q: any = { select: () => q, eq: () => q, order: () => q, range: async (a: number, b: number) => ({ data: filas[t].slice(a, b + 1), error: null }) }; return q } }
    await crearEnvioLocal(nuevo(['1']))
    await bajarEnvios(db, 'p1')
    expect((await muestrasPorEnviar('p1')).map((m) => m.id)).toEqual(['2']) // la 3 ya la envió el compañero
    expect(await local.envios.get('e9')).toMatchObject({ sincronizado: 1, entrega: 'Luis' })
    expect('hora_servidor' in (await local.envios.get('e9'))!).toBe(false)
    filas.envios = [{ ...delCompa, anulado_en: '2026-11-02T10:00:00Z' }]; filas.envio_muestras = []
    await bajarEnvios(db, 'p1')
    expect((await muestrasPorEnviar('p1')).map((m) => m.id)).toEqual(['2', '3']) // anulado: la 3 queda libre
    expect((await enviosDelPlan('p1')).map((e) => e.fecha)).toEqual(['2026-11-02']) // el anulado no se lista
    expect((await local.envioMuestras.get('1'))?.sincronizado).toBe(0) // lo pendiente quedó intacto
  })

  test('al entrar otro usuario se limpian los envíos ya sincronizados, pero no los pendientes', async () => {
    await asegurarUsuarioLocal('u1')
    await crearEnvioLocal(nuevo(['1']))
    await local.envios.update((await local.envios.toArray())[0].id, { sincronizado: 1 }); await local.envioMuestras.update('1', { sincronizado: 1 })
    await crearEnvioLocal(nuevo(['2']))
    await asegurarUsuarioLocal('u2')
    expect((await local.envioMuestras.toArray()).map((x) => x.muestra_id)).toEqual(['2'])
    expect(await local.envios.count()).toBe(1)
    expect(await local.planes.get('p1')).toBeTruthy() // el plan se conserva porque tiene un envío sin sincronizar
  })
})

describe('cadena de custodia de un envío', () => {
  test('arma los datos del envío con lo que hay en el teléfono y genera el PDF con sus campos', async () => {
    await local.muestraParametros.bulkAdd([{ id: 'a', muestra_id: '1', parametro: 'Agua - DQO RB', es_insitu: false }, { id: 'b', muestra_id: '2', parametro: 'Agua - Aluminio ICP', es_insitu: false }])
    await local.mediciones.add({ id: 'm', muestra_id: '1', parametro: 'pH', valor: '7', unidad: '', hora_telefono: '2026-11-02T15:00:00Z', desfase_reloj_s: 0, lat: null, lon: null, precision_m: null, usuario_id: 'u1', equipo_id: 'e', version_app: '1', version: 1, reemplaza_a: null, motivo_correccion: null, sincronizado: 1 })
    const e = await crearEnvioLocal(nuevo(['1', '2'], { medio_transporte: 'terrestre', controles: { nivel: true, refrigeracion: true }, temperatura_testigo: '4.5 °C', observaciones: 'Nevera 1 de 2', entrega: 'Ana' }))
    const { datos, ficha, tecnicos, envio } = await datosDeEnvioLocal(e.id)
    expect(datos.muestras.map((m) => m.codigo)).toEqual(['11101-26', '11102-26'])
    expect(tecnicos).toEqual(['Ana', 'Luis'])
    const c = armarCustodia(datos, ficha, { tecnicos, envio })
    expect(c.responsables).toEqual(['Ana', 'Luis'])
    expect(c.muestras[0].parametros).toEqual(['Agua - DQO RB'])
    const bytes = await llenarCustodia(readFileSync('public/fm-017.pdf'), c)
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1)
    if (process.env.CUSTODIA_ENVIO) writeFileSync(process.env.CUSTODIA_ENVIO, bytes)
  })
})
