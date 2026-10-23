import { useState } from 'react'
import { CargarPlan } from './CargarPlan'
import { PlanesOficina } from './PlanesOficina'
import { Usuarios } from './Usuarios'

const PESTANAS = ['Planes', 'Cargar plan', 'Usuarios'] as const

export function PanelOficina({ yo }: { yo: string }) {
  const [vista, setVista] = useState<(typeof PESTANAS)[number]>('Planes')
  return (
    <>
      <nav className="pestanas">
        {PESTANAS.map((p) => <button key={p} className={p === vista ? '' : 'secundario'} onClick={() => setVista(p)}>{p}</button>)}
      </nav>
      {vista === 'Planes' && <PlanesOficina />}
      {vista === 'Cargar plan' && <CargarPlan />}
      {vista === 'Usuarios' && <Usuarios yo={yo} />}
    </>
  )
}
