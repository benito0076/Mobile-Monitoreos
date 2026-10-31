import type { SupabaseClient } from '@supabase/supabase-js'
import { SESION_MAX_H } from '../config'
import { local, metaGet, metaSet } from './db-local'

const CLAVE = 'sesion_inicio'

export const marcarInicioSesion = () => localStorage.setItem(CLAVE, String(Date.now()))

/** La sesión no queda abierta indefinidamente: pasadas SESION_MAX_H horas se cierra (también sin conexión). */
export async function cerrarSiVencida(db: Pick<SupabaseClient, 'auth'>): Promise<boolean> {
  const inicio = Number(localStorage.getItem(CLAVE))
  if (inicio && Date.now() - inicio < SESION_MAX_H * 3600_000) return false
  await db.auth.signOut({ scope: 'local' })
  localStorage.removeItem(CLAVE)
  return true
}

/**
 * Si entra otro usuario en el mismo teléfono, limpia los planes y datos ya sincronizados del anterior
 * (conserva únicamente lo que aún esté pendiente de sincronizar para que no se pierda).
 */
export async function asegurarUsuarioLocal(usuarioId: string) {
  const previo = await metaGet<string>('usuario_activo')
  if (previo && previo !== usuarioId) {
    await local.transaction('rw', [local.planes, local.muestras, local.muestraParametros, local.mediciones, local.descripciones, local.fotos, local.meta], async () => {
      await local.mediciones.where('sincronizado').equals(1).delete()
      await local.descripciones.where('sincronizado').equals(1).delete()
      await local.fotos.where('sincronizado').equals(1).delete()
      const muestrasConPendientes = new Set<string>([
        ...(await local.mediciones.toArray()).map((x) => x.muestra_id),
        ...(await local.descripciones.toArray()).map((x) => x.muestra_id),
        ...(await local.fotos.toArray()).map((x) => x.muestra_id),
        ...(await local.muestras.filter((m) => !!m.estado_pendiente).toArray()).map((m) => m.id),
      ])
      const todasMuestras = await local.muestras.toArray()
      const borrarMuestras = todasMuestras.filter((m) => !muestrasConPendientes.has(m.id)).map((m) => m.id)
      await local.muestraParametros.where('muestra_id').anyOf(borrarMuestras).delete()
      await local.muestras.bulkDelete(borrarMuestras)
      const planesConPendientes = new Set(todasMuestras.filter((m) => muestrasConPendientes.has(m.id)).map((m) => m.plan_id))
      const borrarPlanes = (await local.planes.toArray()).filter((p) => !planesConPendientes.has(p.id)).map((p) => p.id)
      await local.planes.bulkDelete(borrarPlanes)
      await local.meta.delete('plan_activo')
    })
  }
  await metaSet('usuario_activo', usuarioId)
}
