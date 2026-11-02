import { useState } from 'react'
import { supabase } from '../datos/supabase'
import { marcarInicioSesion } from '../datos/sesion'
import { correoDe, nombreUsuario } from '../datos/usuarios'
import { metaGet } from '../datos/db-local'
import { pendientes } from '../datos/sync'
import { descargarJornada } from '../datos/emergencia'

export function Login() {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [bloqueo, setBloqueo] = useState<{ anterior: string; total: number } | null>(null)

  async function entrar(e: React.FormEvent, forzar = false) {
    e.preventDefault()
    setError('')
    const email = correoDe(usuario)
    if (!forzar) {
      const correoPrevio = await metaGet<string>('correo_activo')
      if (correoPrevio && correoPrevio !== email.toLowerCase()) {
        const p = await pendientes()
        if (p.total > 0) {
          setBloqueo({ anterior: nombreUsuario(correoPrevio) ?? correoPrevio, total: p.total })
          return
        }
      }
    }
    setBloqueo(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error) setError('Usuario o contraseña incorrectos')
    else marcarInicioSesion()
  }

  return (
    <div className="acceso">
    <form onSubmit={(e) => entrar(e, false)} className="tarjeta">
      <img src="/logo.png" alt="Ambienciq Ingenieros S.A.S" className="logo" />
      <h1>Monitoreos de campo</h1>
      <p className="sub">Ingresa con tu usuario y contraseña</p>
      <label>Usuario <input value={usuario} onChange={(e) => { setUsuario(e.target.value); setBloqueo(null) }} required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
      <label>Contraseña <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p role="alert" className="error">{error}</p>}
      {bloqueo && (
        <div role="alert" className="aviso">
          <span>El usuario anterior (<b>{bloqueo.anterior}</b>) dejó {bloqueo.total} dato{bloqueo.total === 1 ? '' : 's'} sin sincronizar en este teléfono. Entra primero con su cuenta para sincronizar, o descarga el respaldo de emergencia antes de cambiar de usuario.</span>
          <button type="button" className="secundario" onClick={descargarJornada}>Exportación de emergencia</button>
          <button type="button" onClick={(e) => entrar(e, true)}>Entrar de todos modos</button>
        </div>
      )}
      <button>Entrar</button>
    </form>
    </div>
  )
}
