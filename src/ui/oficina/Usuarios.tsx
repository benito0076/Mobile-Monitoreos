import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { gestionarUsuarios, listarPerfiles, type Perfil } from '../../datos/usuarios'

export function Usuarios({ yo }: { yo: string }) {
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState<'comision' | 'oficina'>('comision')
  const [estado, setEstado] = useState('')
  const [clave, setClave] = useState<{ correo: string; clave: string } | null>(null)

  const cargar = () => listarPerfiles(supabase).then(setPerfiles).catch((e) => setEstado(e.message))
  useEffect(() => { cargar() }, [])

  async function accion(cuerpo: Record<string, unknown>, ok: (r: any) => void) {
    setEstado('')
    try { ok(await gestionarUsuarios(supabase, cuerpo)); cargar() }
    catch (e) { setEstado((e as Error).message) }
  }

  const crear = (e: React.FormEvent) => {
    e.preventDefault()
    accion({ accion: 'crear', correo, nombre, rol }, (r) => { setClave({ correo: r.correo, clave: r.clave }); setCorreo(''); setNombre('') })
  }

  return (
    <section>
      <h2>Usuarios</h2>
      <form onSubmit={crear} className="tarjeta">
        <label>Nombre <input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></label>
        <label>Correo <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required /></label>
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
          Contraseña de <b>{clave.correo}</b>: <code>{clave.clave}</code><br />
          <small>Anótala y entrégala ahora: no se vuelve a mostrar.</small> <button onClick={() => setClave(null)}>Listo</button>
        </div>
      )}
      <div className="tabla"><table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {perfiles.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td><td>{p.correo ?? '—'}</td><td>{p.rol}</td><td>{p.activo ? 'Activo' : 'Desactivado'}</td>
              <td><div className="acciones">
                {p.id !== yo && <button className="secundario" onClick={() => accion({ accion: 'estado', id: p.id, activo: !p.activo }, () => {})}>{p.activo ? 'Desactivar' : 'Activar'}</button>}
                <button className="secundario" onClick={() => confirm(`Generar una contraseña nueva para ${p.nombre}?`) && accion({ accion: 'clave', id: p.id }, (r) => setClave({ correo: p.correo ?? p.nombre, clave: r.clave }))}>Nueva contraseña</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </section>
  )
}
