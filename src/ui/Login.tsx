import { useState } from 'react'
import { supabase } from '../datos/supabase'

export function Login() {
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })
    if (error) setError('Correo o contraseña incorrectos')
  }

  return (
    <form onSubmit={entrar} className="tarjeta">
      <h1>Monitoreos de campo</h1>
      <label>Correo <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="username" /></label>
      <label>Contraseña <input type="password" value={clave} onChange={(e) => setClave(e.target.value)} required autoComplete="current-password" /></label>
      {error && <p role="alert" className="error">{error}</p>}
      <button>Entrar</button>
    </form>
  )
}
