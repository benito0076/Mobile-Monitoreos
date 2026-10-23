import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './datos/supabase'
import { Login } from './ui/Login'
import { CargarPlan } from './ui/oficina/CargarPlan'

export function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)
  const [rol, setRol] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) return setRol(null)
    supabase.from('perfiles').select('rol').eq('id', sesion.user.id).single().then(({ data }) => setRol(data?.rol ?? null))
  }, [sesion])

  if (sesion === undefined) return <p>Cargando…</p>
  if (!sesion) return <Login />

  return (
    <main>
      <header>
        <span>{sesion.user.email} ({rol ?? '…'})</span>
        <button onClick={() => supabase.auth.signOut()}>Salir</button>
      </header>
      {rol === 'oficina' && <CargarPlan />}
      {rol === 'comision' && <p>Elegir plan: pendiente (paso 5).</p>}
      {rol === null && <p>Tu usuario no tiene perfil asignado. Pide a la oficina que lo cree.</p>}
    </main>
  )
}
