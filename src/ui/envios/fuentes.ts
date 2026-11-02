import type { SupabaseClient } from '@supabase/supabase-js'
import { todo, type PlanDisponible } from '../../datos/planes'
import { cargarDatosPlan } from '../../datos/exportar-datos'
import { crearEnvioLocal, datosDeEnvioLocal, enviosDelPlan, muestrasPorEnviar, type EnvioVista } from '../../datos/envios'
import type { PlanLocal } from '../../datos/db-local'
import { descargarCustodiaEnvio } from '../../exportar/envio-pdf'
import type { DatosEnvio } from '../../exportar/custodia-pdf'
import type { FuenteEnvios } from './PanelEnvios'

const aDatosEnvio = (e: { fecha: string; medio_transporte: string | null; controles: Record<string, boolean>; temperatura_testigo: string | null; observaciones: string | null; entrega: string | null }): DatosEnvio =>
  ({ fecha: e.fecha, medio_transporte: e.medio_transporte, controles: e.controles ?? {}, temperatura_testigo: e.temperatura_testigo, observaciones: e.observaciones, entrega: e.entrega })

/** Envíos desde el teléfono: todo se guarda local y se sincroniza después. */
export const fuenteLocal = (plan: PlanLocal, usuario_id: string, nombre: string): FuenteEnvios => ({
  entregaPorDefecto: nombre,
  candidatas: async () => (await muestrasPorEnviar(plan.id)).map(({ id, codigo, punto_texto }) => ({ id, codigo, punto_texto })),
  envios: () => enviosDelPlan(plan.id),
  crear: async (d) => (await crearEnvioLocal({ ...d, plan_id: plan.id, usuario_id })).id,
  pdf: async (id) => {
    const { datos, ficha, tecnicos, envio } = await datosDeEnvioLocal(id)
    await descargarCustodiaEnvio(datos, ficha, tecnicos, aDatosEnvio(envio))
  },
})

/** Envíos desde el panel de oficina: se leen y escriben directamente en el servidor. */
export const fuenteServidor = (db: SupabaseClient, plan: PlanDisponible, tecnicos: string[], nombre: string): FuenteEnvios => {
  const unidas = () => todo<{ envio_id: string; muestra_id: string }>((a, b) =>
    db.from('envio_muestras').select('envio_id,muestra_id,muestras!inner(plan_id)').eq('muestras.plan_id', plan.id).order('muestra_id').range(a, b))
  return {
    entregaPorDefecto: nombre,
    candidatas: async () => {
      const enviadas = new Set((await unidas()).map((u) => u.muestra_id))
      const muestras = await todo<any>((a, b) => db.from('muestras').select('id,codigo,punto_texto,estado').eq('plan_id', plan.id).order('codigo').range(a, b))
      return muestras.filter((m) => m.estado === 'cerrada' && !enviadas.has(m.id)).map(({ id, codigo, punto_texto }) => ({ id, codigo, punto_texto }))
    },
    envios: async (): Promise<EnvioVista[]> => {
      const [envios, uniones] = await Promise.all([
        todo<any>((a, b) => db.from('envios').select('id,fecha,hora_telefono').eq('plan_id', plan.id).is('anulado_en', null).order('id').range(a, b)),
        unidas(),
      ])
      return envios.sort((x, y) => y.fecha.localeCompare(x.fecha) || y.hora_telefono.localeCompare(x.hora_telefono))
        .map((e) => ({ id: e.id, fecha: e.fecha, muestras: uniones.filter((u) => u.envio_id === e.id).length, pendiente: false }))
    },
    crear: async (d) => {
      const id = crypto.randomUUID()
      const { muestraIds, ...resto } = d
      const { error } = await db.rpc('crear_envio', { p_envio: { id, plan_id: plan.id, ...resto }, p_muestras: muestraIds })
      if (error) throw new Error(/envio_muestras_muestra_id_key|duplicate/i.test(error.message) ? 'Alguna muestra ya va en otro envío' : error.message)
      return id
    },
    pdf: async (id) => {
      const [{ data: envio, error }, uniones, datos] = await Promise.all([
        db.from('envios').select('*').eq('id', id).single(), unidas(), cargarDatosPlan(db, plan),
      ])
      if (error) throw new Error(error.message)
      const ids = new Set(uniones.filter((u) => u.envio_id === id).map((u) => u.muestra_id))
      const delEnvio = { ...datos, muestras: datos.muestras.filter((m) => ids.has(m.id)), parametros: datos.parametros.filter((p) => ids.has(p.muestra_id)), mediciones: datos.mediciones.filter((m) => ids.has(m.muestra_id)) }
      await descargarCustodiaEnvio(delEnvio, plan.ficha ?? {}, tecnicos, aDatosEnvio(envio))
    },
    anular: async (id, motivo) => {
      const { error } = await db.rpc('anular_envio', { p_envio: id, p_motivo: motivo })
      if (error) throw new Error(error.message)
    },
  }
}
