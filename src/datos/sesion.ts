import { SESION_MAX_H } from '../config'
import { supabase } from './supabase'

const CLAVE = 'sesion_inicio'

export const marcarInicioSesion = () => localStorage.setItem(CLAVE, String(Date.now()))

/** La sesión no queda abierta indefinidamente: pasadas SESION_MAX_H horas se cierra (también sin conexión). */
export async function cerrarSiVencida(): Promise<boolean> {
  const inicio = Number(localStorage.getItem(CLAVE))
  if (inicio && Date.now() - inicio < SESION_MAX_H * 3600_000) return false
  await supabase.auth.signOut({ scope: 'local' })
  localStorage.removeItem(CLAVE)
  return true
}
