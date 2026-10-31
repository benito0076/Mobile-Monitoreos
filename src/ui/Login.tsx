import { useState } from 'react'
import { supabase } from '../datos/supabase'
import { marcarInicioSesion } from '../datos/sesion'
import { correoDe } from '../datos/usuarios'

export function Login() {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email: correoDe(usuario), password: clave })
    if (error) setError('Usuario o contraseña incorrectos')
    else marcarInicioSesion()
  }

  return (
    <div className="acceso">
    <form onSubmit={entrar} className="tarjeta">
      <img src="/logo.png" alt="Ambienciq Ingenieros S.A.S" className="logo" />
      <h1>Monitoreos de campo</h1>
      <p className="sub">Ingresa con tu usuario y contraseña</p>
      <label>Usuario <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>
      <label>Contraseña <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button>Entrar</button>
    </form>
    </div>
  )
}
