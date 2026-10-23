import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './datos/supabase'
import { Login } from './ui/Login'
import { CargarPlan } from './ui/oficina/CargarPlan'
import { ExportarPlan } from './ui/oficina/ExportarPlan'
import { ElegirPlan } from './ui/campo/ElegirPlan'
import { cerrarSiVencida } from './datos/sesion'
import { ListaMuestras } from './ui/campo/ListaMuestras'
import { FormMuestra } from './ui/campo/FormMuestra'
import { medirDesfase } from './datos/reloj'
import { Sincronizar } from './ui/campo/Sincronizar'
import { local, type PlanLocal } from './datos/db-local'

export function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)
  const [rol, setRol] = useState<string | null>(null)
  const [planLocal, setPlanLocal] = useState<PlanLocal | undefined>()
  const [abierta, setAbierta] = useState<string | null>(null)

  const leerLocal = async () => {
    const p = await local.planes.toCollection().first()
    setPlanLocal(p)
  }

  useEffect(() => {
    cerrarSiVencida().then(() => supabase.auth.getSession()).then(({ data }) => setSesion(data.session))
    leerLocal()
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) return setRol(null)
    if (navigator.onLine) medirDesfase(supabase)
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
      {rol === 'comision' && planLocal && <Sincronizar />}
      {rol === 'oficina' && <><CargarPlan /><ExportarPlan /></>}
      {rol === 'comision' && !planLocal && <ElegirPlan usuarioId={sesion.user.id} alTomar={leerLocal} />}
      {rol === 'comision' && planLocal && (abierta
        ? <FormMuestra id={abierta} usuario={sesion.user.id} volver={() => setAbierta(null)} />
        : <ListaMuestras plan={planLocal} abrir={setAbierta} />)}
      {rol === null && <p>Tu usuario no tiene perfil asignado. Pide a la oficina que lo cree.</p>}
    </main>
  )
}
