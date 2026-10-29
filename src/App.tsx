import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './datos/supabase'
import { Login } from './ui/Login'
import { PanelOficina } from './ui/oficina/PanelOficina'
import { ElegirPlan } from './ui/campo/ElegirPlan'
import { cerrarSiVencida } from './datos/sesion'
import { ListaMuestras } from './ui/campo/ListaMuestras'
import { FormMuestra } from './ui/campo/FormMuestra'
import { medirDesfase } from './datos/reloj'
import { Sincronizar } from './ui/campo/Sincronizar'
import { local, metaGet, metaSet } from './datos/db-local'
import { SelectorPlan, type PlanConConteo } from './ui/campo/SelectorPlan'
import { nombreUsuario } from '../supabase/functions/gestionar-usuarios/logica'

export function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)
  const [rol, setRol] = useState<string | null>(null)
  const [planes, setPlanes] = useState<PlanConConteo[]>([])
  const [activoId, setActivoId] = useState<string | undefined>()
  const [eligiendo, setEligiendo] = useState(false)
  const [listo, setListo] = useState(false) // ya se leyó lo que hay en el teléfono
  const [abierta, setAbierta] = useState<string | null>(null)

  // Una comisión puede tener varios planes en el teléfono; se trabaja con uno a la vez (el último usado).
  const leerLocal = async () => {
    const ps = await local.planes.toArray()
    setPlanes(await Promise.all(ps.map(async (p) => ({ ...p, n: await local.muestras.where('plan_id').equals(p.id).count() }))))
    const guardado = await metaGet<string>('plan_activo')
    setActivoId(ps.find((p) => p.id === guardado)?.id ?? ps[0]?.id)
    setListo(true)
  }
  const usar = async (id: string) => { await metaSet('plan_activo', id); setAbierta(null); await leerLocal() }
  const planLocal = planes.find((p) => p.id === activoId)

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
    <>
      <header className="barra">
        <div>
          <img src="/logo.png" alt="Ambienciq Ingenieros S.A.S" className="logo" />
          <div className="usuario">
            <span title={nombreUsuario(sesion.user.email ?? '') ?? ''}>{nombreUsuario(sesion.user.email ?? '')}{rol ? ` · ${rol}` : ''}</span>
            <button className="secundario" onClick={() => supabase.auth.signOut()}>Salir</button>
          </div>
        </div>
      </header>
      <main>
      {rol === 'comision' && planes.length > 0 && <Sincronizar />}
      {rol === 'oficina' && <PanelOficina yo={sesion.user.id} />}
      {rol === 'comision' && listo && (planes.length === 0 || eligiendo) && (
        <ElegirPlan usuarioId={sesion.user.id} descargados={planes.map((p) => p.id)}
          alTomar={async (id) => { await usar(id); setEligiendo(false) }}
          alVolver={planes.length > 0 ? () => setEligiendo(false) : undefined} />
      )}
      {rol === 'comision' && planLocal && !eligiendo && (abierta
        ? <FormMuestra id={abierta} usuario={sesion.user.id} volver={() => setAbierta(null)} />
        : <>
            <SelectorPlan planes={planes} activo={activoId} cambiar={usar} masPlanes={() => setEligiendo(true)} />
            <ListaMuestras plan={planLocal} abrir={setAbierta} />
          </>)}
      {rol === null && <p>Tu usuario no tiene perfil asignado. Pide a la oficina que lo cree.</p>}
      </main>
    </>
  )
}
