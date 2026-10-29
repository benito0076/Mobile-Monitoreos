import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { gestionarUsuarios, listarPerfiles, type Perfil } from '../../datos/usuarios'
import { nombreUsuario } from '../../../supabase/functions/gestionar-usuarios/logica'

export function Usuarios({ yo }: { yo: string }) {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [usuario, setUsuario] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<'comision' | 'oficina'>('comision')
  const [estado, setEstado] = useState('')
  const [clave, setClave] = useState<{ usuario: string; clave: string } | null>(null)

  const cargar = () => listarPerfiles(supabase).then(setPerfiles).catch((e) => setEstado(e.message))
  useEffect(() => { cargar() }, [])

  async function accion(cuerpo: Record<string, unknown>, ok: (r: any) => void) {
    setEstado('')
    try { ok(await gestionarUsuarios(supabase, cuerpo)); cargar() }
    catch (e) { setEstado((e as Error).message) }
  }

  const crear = (e: React.FormEvent) => {
    e.preventDefault()
    accion({ accion: 'crear', usuario, nombre, rol }, (r) => { setClave({ usuario: r.usuario, clave: r.clave }); setUsuario(''); setNombre('') })
  }

  return (
    <section>
      <h2>Usuarios</h2>
      <form onSubmit={crear} className="tarjeta">
        <label>Nombre <input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></label>
        <label>Usuario <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="p. ej. comision1" /></label>
        <small>De 3 a 30 letras minúsculas, números, punto, guion o guion bajo; sin espacios ni tildes.</small>
        <label>Rol
          <select value={rol} onChange={(e) => setRol(e.target.value as 'comision' | 'oficina')}>
            <option value="comision">Comisión de muestreo</option><option value="oficina">Oficina</option>
          </select>
        </label>
        <button>Crear usuario</button>
      </form>
      {estado && <p role="alert" className="error">{estado}</p>}
      {clave && (
        <div role="status" className="aviso">
          Contraseña de <b>{clave.usuario}</b>: <code>{clave.clave}</code><br />
          <small>Anótala y entrégala ahora: no se vuelve a mostrar.</small> <button onClick={() => setClave(null)}>Listo</button>
        </div>
      )}
      <div className="tabla"><table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {perfiles.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td><td>{nombreUsuario(p.correo) ?? '—'}</td><td>{p.rol}</td><td>{p.activo ? 'Activo' : 'Desactivado'}</td>
              <td><div className="acciones">
                {p.id !== yo && <button className="secundario" onClick={() => accion({ accion: 'estado', id: p.id, activo: !p.activo }, () => {})}>{p.activo ? 'Desactivar' : 'Activar'}</button>}
                <button className="secundario" onClick={() => confirm(`Generar una contraseña nueva para ${p.nombre}?`) && accion({ accion: 'clave', id: p.id }, (r) => setClave({ usuario: nombreUsuario(p.correo) ?? p.nombre, clave: r.clave }))}>Nueva contraseña</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </section>
  )
}
