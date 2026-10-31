import type { SupabaseClient } from '@supabase/supabase-js'
import { correoDe, DOMINIO_USUARIOS, nombreUsuario } from '../../supabase/functions/gestionar-usuarios/logica'

export { correoDe, DOMINIO_USUARIOS, nombreUsuario }

export interface Perfil { id: string; nombre: string; rol: 'oficina' | 'comision'; activo: boolean; correo: string | null }

export const listarPerfiles = async (db: Pick<SupabaseClient, 'from'>) => {
  const { data, error } = await db.from('perfiles').select('id,nombre,rol,activo,correo').order('nombre')
  if (error) throw new Error(error.message)
  return data as Perfil[]
}

/** Llama a la función gestionar-usuarios y devuelve su mensaje de error en español si falla. */
export async function gestionarUsuarios<T = Record<string, unknown>>(db: Pick<SupabaseClient, 'functions'>, cuerpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.functions.invoke('gestionar-usuarios', { body: cuerpo })
  if (error) {
    const detalle = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(detalle?.error ?? error.message)
  }
  return data as T
}
