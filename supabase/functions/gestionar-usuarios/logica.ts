// Lógica de la función, sin APIs de Deno ni de Supabase: las dependencias se inyectan para poder probarla.
export type Rol = 'oficina' | 'comision'

export interface Deps {
  usuarioDe(token: string): Promise<{ id: string } | null> // valida el JWT del que llama
  perfil(id: string): Promise<{ rol: Rol; activo: boolean } | null>
  crear(correo: string, clave: string): Promise<{ id: string } | { error: string }>
  borrar(id: string): Promise<void>
  insertarPerfil(p: { id: string; rol: Rol; nombre: string; correo: string }): Promise<void>
  actualizarActivo(id: string, activo: boolean): Promise<void>
  bloquearAcceso(id: string, bloquear: boolean): Promise<void>
  cambiarClave(id: string, clave: string): Promise<void>
  generarClave(): string
}

export interface Respuesta { status: number; json: Record<string, unknown> }
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const fallo = (status: number, error: string): Respuesta => ({ status, json: { error } })

/** Solo una cuenta de oficina activa puede administrar usuarios. La clave generada se devuelve una única vez. */
export async function manejar(token: string | null, cuerpo: any, d: Deps): Promise<Respuesta> {
  const quien = token ? await d.usuarioDe(token) : null
  if (!quien) return fallo(401, 'Sesión no válida')
  const yo = await d.perfil(quien.id)
  if (yo?.rol !== 'oficina' || !yo.activo) return fallo(403, 'Solo la oficina administra usuarios')

  switch (cuerpo?.accion) {
    case 'crear': {
      const correo = String(cuerpo.correo ?? '').trim().toLowerCase()
      const nombre = String(cuerpo.nombre ?? '').trim()
      if (!CORREO.test(correo)) return fallo(400, 'Correo no válido')
      if (!nombre) return fallo(400, 'Falta el nombre')
      if (cuerpo.rol !== 'oficina' && cuerpo.rol !== 'comision') return fallo(400, 'Rol no válido')
      const clave = d.generarClave()
      const r = await d.crear(correo, clave)
      if ('error' in r) return fallo(400, /already|registered|exists/i.test(r.error) ? 'Ya existe un usuario con ese correo' : r.error)
      try {
        await d.insertarPerfil({ id: r.id, rol: cuerpo.rol, nombre, correo })
      } catch (e) {
        await d.borrar(r.id) // sin perfil la cuenta no serviría: se deshace
        return fallo(500, `No se pudo crear el perfil: ${(e as Error).message}`)
      }
      return { status: 200, json: { id: r.id, correo, clave } }
    }
    case 'estado': {
      if (typeof cuerpo.activo !== 'boolean' || !(await d.perfil(String(cuerpo.id)))) return fallo(400, 'Usuario no válido')
      if (cuerpo.id === quien.id) return fallo(400, 'No puedes desactivar tu propia cuenta')
      await d.actualizarActivo(cuerpo.id, cuerpo.activo)
      await d.bloquearAcceso(cuerpo.id, !cuerpo.activo)
      return { status: 200, json: { ok: true } }
    }
    case 'clave': {
      if (!(await d.perfil(String(cuerpo.id)))) return fallo(400, 'Usuario no válido')
      const clave = d.generarClave()
      await d.cambiarClave(cuerpo.id, clave)
      return { status: 200, json: { clave } }
    }
    default:
      return fallo(400, 'Acción desconocida')
  }
}
