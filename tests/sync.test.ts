import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { local } from '../src/datos/db-local'
import { exportarJornada } from '../src/datos/emergencia'
import { cambiarEstado, corregirMedicion, guardarDescripcion, guardarFoto, guardarMedicion } from '../src/datos/mediciones'
import { pendientes, purgarConfirmados, sincronizar } from '../src/datos/sync'

const gps = { lat: 7.1, lon: -73.1, precision_m: 8 }
const base = { muestra_id: 'm1', unidad: 'u', usuario_id: 'u1', gps }
const RED = { message: 'TypeError: Failed to fetch', code: '' }

// Servidor falso: tablas por id (ON CONFLICT DO NOTHING), fallos programables.
function servidor() {
  const tablas: Record<string, Map<string, any>> = { mediciones: new Map(), descripciones_punto: new Map(), fotos: new Map() }
  const subidas = new Set<string>(); const orden: number[] = []
  const s = {
    tablas, subidas, orden, llamadas: 0,
    caida: 0,                      // las próximas N peticiones fallan por red
    rechazar: (_f: any): string | null => null,
    estadoOk: true,
    db: {
      from: (t: string) => ({
        upsert: async (entrada: any, o: any) => {
          const filas: any[] = [entrada].flat()
          s.llamadas++
          if (s.caida > 0) { s.caida--; return { error: RED } }
          if (!o?.ignoreDuplicates || o.onConflict !== 'id') throw new Error('upsert debe ser idempotente sobre id')
          for (const f of filas) { const m = s.rechazar(f); if (m) return { error: { message: m, code: '23514' } } }
          for (const f of filas) { if (!tablas[t].has(f.id)) tablas[t].set(f.id, f); if (t === 'mediciones') orden.push(f.version) }
          return { error: null }
        },
        update: (v: any) => ({ eq: (_c: string, id: string) => ({ select: async () => {
          s.llamadas++
          if (s.caida > 0) { s.caida--; return { error: RED, data: null } }
          return { error: null, data: s.estadoOk ? [{ id }] : [] } } }) }),
      }),
      storage: { from: () => ({ upload: async (ruta: string) => {
        if (s.caida > 0) { s.caida--; return { error: RED } }
        if (subidas.has(ruta)) return { error: { message: 'The resource already exists', statusCode: '409' } }
        subidas.add(ruta); return { error: null } } }) },
    } as any,
  }
  return s
}
const R = { esperaMs: 0 }

beforeEach(async () => {
  await Promise.all(local.tables.map((t) => t.clear()))
  await local.muestras.add({ id: 'm1', plan_id: 'p1', codigo: '10500-26', punto_texto: 'P', punto_codigo: null, tipo: null, matriz: null, submatriz: null, fecha_planeada: null, estado: 'pendiente' })
})

async function jornada() {
  await guardarMedicion({ ...base, parametro: 'pH', valor: '7' })
  await guardarMedicion({ ...base, parametro: 'T', valor: '20' })
  await corregirMedicion({ ...base, parametro: 'pH', valor: '7.4', motivo: 'lectura' })
  await guardarDescripcion('m1', 'Orilla', 'u1')
  await guardarFoto('m1', new Blob(['jpg']), gps, 'u1')
  await cambiarEstado('m1', 'cerrada')
}

describe('sincronización', () => {
  test('envía todo, cuenta pendientes y solo marca lo confirmado', async () => {
    await jornada()
    expect(await pendientes()).toMatchObject({ mediciones: 3, descripciones: 1, fotos: 1, muestras: 1, total: 6 })
    const s = servidor()
    const r = await sincronizar(s.db, R)
    expect(r).toMatchObject({ sinConexion: false, errores: [], enviados: { mediciones: 3, descripciones: 1, fotos: 1, muestras: 1 } })
    expect((await pendientes()).total).toBe(0)
    expect(s.tablas.mediciones.size).toBe(3)
    expect([...s.subidas]).toEqual([expect.stringMatching(/^p1\/10500-26\/.+\.jpg$/)])
  })

  test('las correcciones llegan después de la versión que reemplazan', async () => {
    await jornada(); const s = servidor(); await sincronizar(s.db, R)
    expect(s.orden).toEqual([1, 1, 2])
  })

  test('corte de conexión: nada se marca, y al volver se envía sin duplicar', async () => {
    await jornada(); const s = servidor(); s.caida = 99
    const r = await sincronizar(s.db, R)
    expect(r.sinConexion).toBe(true)
    expect((await pendientes()).total).toBe(6)
    expect(s.tablas.mediciones.size).toBe(0)
    s.caida = 0
    await sincronizar(s.db, R); await sincronizar(s.db, R) // el segundo envío no tiene nada que hacer
    expect((await pendientes()).total).toBe(0)
    expect(s.tablas.mediciones.size).toBe(3)
  })

  test('corte a mitad: lo ya confirmado no se reenvía y el resto queda pendiente', async () => {
    await jornada(); const s = servidor()
    // 1.º lote de mediciones (v1) pasa; el siguiente (v2) se cae durante todos los reintentos
    const up = s.db.from; let n = 0
    s.db.from = (t: string) => { const x = up(t); const u = x.upsert; x.upsert = async (...a: any[]) => (++n > 1 ? { error: RED } : u(...a)); return x }
    const r = await sincronizar(s.db, R)
    expect(r.sinConexion).toBe(true)
    expect(await local.mediciones.where('sincronizado').equals(1).count()).toBe(2)
    expect((await pendientes()).mediciones).toBe(1)
    s.db.from = up
    await sincronizar(s.db, R)
    expect((await pendientes()).total).toBe(0)
    expect(s.tablas.mediciones.size).toBe(3)
  })

  test('un fallo de red pasajero se recupera con reintentos en la misma sincronización', async () => {
    await jornada(); const s = servidor(); s.caida = 2
    expect((await sincronizar(s.db, R)).sinConexion).toBe(false)
    expect((await pendientes()).total).toBe(0)
  })

  test('el rechazo de una fila no frena a las demás y queda anotado', async () => {
    await jornada(); const s = servidor(); s.rechazar = (f) => (f.parametro === 'T' ? 'valor inválido' : null)
    const r = await sincronizar(s.db, R)
    expect(r.errores).toHaveLength(1)
    expect((await pendientes()).mediciones).toBe(1)
    expect((await local.mediciones.toArray()).find((m) => m.parametro === 'T')?.error_sync).toBe('valor inválido')
    expect(s.tablas.mediciones.size).toBe(2)
  })

  test('foto ya subida en un intento anterior cuenta como confirmada', async () => {
    const f = await guardarFoto('m1', new Blob(['x']), gps, 'u1'); const s = servidor(); s.subidas.add(f.ruta_storage)
    expect((await sincronizar(s.db, R)).errores).toEqual([])
    expect((await local.fotos.get(f.id))!.sincronizado).toBe(1)
  })

  test('si el servidor no actualiza la muestra (plan reasignado) sigue pendiente', async () => {
    await cambiarEstado('m1', 'cerrada'); const s = servidor(); s.estadoOk = false
    expect((await sincronizar(s.db, R)).errores[0]).toMatch(/reasignado/)
    expect((await pendientes()).muestras).toBe(1)
  })

  test('dos disparos simultáneos comparten una sola sincronización', async () => {
    await jornada(); const s = servidor()
    const [a, b] = [sincronizar(s.db, R), sincronizar(s.db, R)]
    expect(a).toBe(b); await a
    expect(s.tablas.mediciones.size).toBe(3)
  })
})

describe('retención y exportación de emergencia', () => {
  test('purga lo confirmado antiguo y nunca lo pendiente', async () => {
    await jornada(); await sincronizar(servidor().db, R)
    await guardarMedicion({ ...base, parametro: 'OD', valor: '5' }) // pendiente
    const en8dias = Date.now() + 8 * 86400000
    await purgarConfirmados(7, Date.now()); expect(await local.mediciones.count()).toBe(4)
    await purgarConfirmados(7, en8dias)
    expect(await local.mediciones.count()).toBe(1) // la pendiente se conserva aunque sea antigua
    expect(await local.fotos.count()).toBe(0)
  })

  test('exporta la jornada completa con fotos', async () => {
    await jornada()
    const { nombre, blob } = await exportarJornada()
    const j = JSON.parse(await blob.text())
    expect(j.mediciones).toHaveLength(3); expect(j.descripciones).toHaveLength(1)
    expect(atob(j.fotos[0].jpeg_base64)).toBe('jpg'); expect(j.fotos[0].blob).toBeUndefined()
    expect(nombre).toMatch(/^jornada_sin-plan_\d{4}-\d{2}-\d{2}\.json$/)
  })
})
