import { lazy, Suspense, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './datos/supabase'
import { Login } from './ui/Login'
import { ElegirPlan } from './ui/campo/ElegirPlan'
import { asegurarUsuarioLocal, cerrarSiVencida } from './datos/sesion'
import { ListaMuestras } from './ui/campo/ListaMuestras'
import { FormMuestra } from './ui/campo/FormMuestra'
import { medirDesfase } from './datos/reloj'
import { Sincronizar } from './ui/campo/Sincronizar'
import { local, metaGet, metaSet } from './datos/db-local'
import { SelectorPlan, type PlanConConteo } from './ui/campo/SelectorPlan'
import { nombreUsuario } from './datos/usuarios'
import { pendientes } from './datos/sync'

const PanelOficina = lazy(() => import('./ui/oficina/PanelOficina').then((m) => ({ default: m.PanelOficina })))

export function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined)
  const [rol, setRol] = useState<string | null | undefined>(undefined)
  const [planes, setPlanes] = useState<PlanConConteo[]>([])
  const [activoId, setActivoId] = useState<string | undefined>()
  const [eligiendo, setEligiendo] = useState(false)
  const [listo, setListo] = useState(false) // ya se leyó lo que hay en el teléfono
  const [abierta, setAbierta] = useState<string | null>(null)
  const [confirmandoSalir, setConfirmandoSalir] = useState<number | null>(null)
  const [nombre, setNombre] = useState('') // nombre del perfil: sale como responsable de la entrega en las cadenas de custodia

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

  async function salir(forzar = false) {
    if (rol === 'comision' && !forzar) {
      const p = await pendientes()
      if (p.total > 0) return setConfirmandoSalir(p.total)
    }
    setConfirmandoSalir(null)
    await supabase.auth.signOut({ scope: 'local' })
  }

  useEffect(() => {
    cerrarSiVencida(supabase).then(() => supabase.auth.getSession()).then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sesion) return setRol(undefined)
    if (navigator.onLine) medirDesfase(supabase)
    asegurarUsuarioLocal(sesion.user.id, sesion.user.email).then(async () => {
      const rolGuardado = await metaGet<string>('rol_usuario')
      setNombre((await metaGet<string>('nombre_usuario')) ?? '')
      if (rolGuardado) setRol(rolGuardado)
      await leerLocal()
      const { data, error } = await supabase.from('perfiles').select('rol,nombre').eq('id', sesion.user.id).single()
      if (data?.rol) {
        await metaSet('rol_usuario', data.rol)
        if (data.nombre) { await metaSet('nombre_usuario', data.nombre); setNombre(data.nombre) }
        setRol(data.rol)
      } else if (!error || error.code === 'PGRST116') {
        // El servidor respondió que el usuario no tiene perfil (no fue un corte de red).
        await metaSet('rol_usuario', null)
        setRol(null)
      } else if (!rolGuardado) {
        setRol(null)
      }
    })
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
            <button className="secundario" onClick={() => salir()}>Salir</button>
          </div>
        </div>
      </header>
      <main>
      {confirmandoSalir !== null && (
        <div role="alert" className="aviso">
          <span>Tienes {confirmandoSalir} dato{confirmandoSalir === 1 ? '' : 's'} pendiente{confirmandoSalir === 1 ? '' : 's'} de sincronizar en este teléfono. ¿Seguro que quieres cerrar sesión ahora?</span>
          <button onClick={() => salir(true)}>Cerrar sesión de todos modos</button>
          <button className="secundario" onClick={() => setConfirmandoSalir(null)}>Cancelar</button>
        </div>
      )}
      {rol === 'comision' && planes.length > 0 && <Sincronizar />}
      {rol === 'oficina' && <Suspense fallback={<p>Cargando panel de oficina…</p>}><PanelOficina yo={sesion.user.id} /></Suspense>}
      {rol === 'comision' && listo && (planes.length === 0 || eligiendo) && (
        <ElegirPlan usuarioId={sesion.user.id} descargados={planes.map((p) => p.id)}
          alTomar={async (id) => { await usar(id); setEligiendo(false) }}
          alVolver={planes.length > 0 ? () => setEligiendo(false) : undefined} />
      )}
      {rol === 'comision' && planLocal && !eligiendo && (abierta
        ? <FormMuestra id={abierta} usuario={sesion.user.id} volver={() => setAbierta(null)} />
        : <>
            <SelectorPlan planes={planes} activo={activoId} cambiar={usar} masPlanes={() => setEligiendo(true)} />
            <ListaMuestras plan={planLocal} abrir={setAbierta} usuario={{ id: sesion.user.id, nombre: nombre || (nombreUsuario(sesion.user.email ?? '') ?? '') }} />
          </>)}
      {rol === undefined && <p>Cargando perfil…</p>}
      {rol === null && <p>Tu usuario no tiene perfil asignado (o no hay conexión para verificarlo por primera vez). Pide a la oficina que lo cree o conéctate a internet.</p>}
      </main>
    </>
  )
}
