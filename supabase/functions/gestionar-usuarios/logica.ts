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
const USUARIO = /^[a-z0-9._-]{3,30}$/

/** Supabase Auth exige un correo. Quien entra con un nombre de usuario recibe uno interno con este dominio; nunca se le envía nada. */
export const DOMINIO_USUARIOS = 'usuarios.ambienciq.invalid'
/** «ana» → ana@dominio interno; un correo completo (cuentas anteriores) se deja igual. */
export const correoDe = (entrada: string) => { const t = entrada.trim().toLowerCase(); return t.includes('@') ? t : `${t}@${DOMINIO_USUARIOS}` }
/** Lo contrario, para mostrarlo: ana@dominio interno → ana. */
export const nombreUsuario = (correo: string | null) => (correo?.endsWith(`@${DOMINIO_USUARIOS}`) ? correo.slice(0, -DOMINIO_USUARIOS.length - 1) : correo)
const fallo = (status: number, error: string): Respuesta => ({ status, json: { error } })

/** Contraseña elegida por la oficina: vacía = se genera una; si viene, de 8 a 72 caracteres y sin espacios en los extremos. */
function claveElegida(c: unknown): string | null | 'invalida' {
  if (c == null || c === '') return null
  const t = String(c)
  return t.length >= 8 && t.length <= 72 && t === t.trim() ? t : 'invalida'
}
const CLAVE_INVALIDA = 'La contraseña debe tener entre 8 y 72 caracteres, sin espacios al inicio ni al final'

/** Solo una cuenta de oficina activa puede administrar usuarios. La clave generada se devuelve una única vez. */
export async function manejar(token: string | null, cuerpo: any, d: Deps): Promise<Respuesta> {
  const quien = token ? await d.usuarioDe(token) : null
  if (!quien) return fallo(401, 'Sesión no válida')
  const yo = await d.perfil(quien.id)
  if (yo?.rol !== 'oficina' || !yo.activo) return fallo(403, 'Solo la oficina administra usuarios')

  switch (cuerpo?.accion) {
    case 'crear': {
      const entrada = String(cuerpo.usuario ?? cuerpo.correo ?? '').trim().toLowerCase()
      const correo = correoDe(entrada)
      const nombre = String(cuerpo.nombre ?? '').trim()
      if (entrada.includes('@') ? !CORREO.test(entrada) : !USUARIO.test(entrada))
        return fallo(400, 'Usuario no válido: de 3 a 30 letras minúsculas, números, punto, guion o guion bajo (sin espacios ni tildes)')
      if (!nombre) return fallo(400, 'Falta el nombre')
      if (cuerpo.rol !== 'oficina' && cuerpo.rol !== 'comision') return fallo(400, 'Rol no válido')
      const dada = claveElegida(cuerpo.clave)
      if (dada === 'invalida') return fallo(400, CLAVE_INVALIDA)
      const clave = dada ?? d.generarClave()
      const r = await d.crear(correo, clave)
      if ('error' in r) return fallo(400, /already|registered|exists/i.test(r.error) ? 'Ya existe un usuario con ese nombre' : r.error)
      try {
        await d.insertarPerfil({ id: r.id, rol: cuerpo.rol, nombre, correo })
      } catch (e) {
        await d.borrar(r.id) // sin perfil la cuenta no serviría: se deshace
        return fallo(500, `No se pudo crear el perfil: ${(e as Error).message}`)
      }
      return { status: 200, json: { id: r.id, usuario: nombreUsuario(correo), correo, clave } }
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
      const dada = claveElegida(cuerpo.clave)
      if (dada === 'invalida') return fallo(400, CLAVE_INVALIDA)
      const clave = dada ?? d.generarClave()
      await d.cambiarClave(cuerpo.id, clave)
      return { status: 200, json: { clave } }
    }
    default:
      return fallo(400, 'Acción desconocida')
  }
}
