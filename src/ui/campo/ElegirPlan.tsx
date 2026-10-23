import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { planesVisibles, tomarPlan, type PlanDisponible } from '../../datos/planes'

export function ElegirPlan({ usuarioId, alTomar }: { usuarioId: string; alTomar: () => void }) {
  const [planes, setPlanes] = useState<PlanDisponible[]>([])
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const enLinea = navigator.onLine

  const cargar = () => planesVisibles(supabase).then(setPlanes).catch((e) => setMensaje(e.message))
  useEffect(() => { if (enLinea) cargar() }, [enLinea])

  async function elegir(p: PlanDisponible) {
    setOcupado(true); setMensaje('Descargando plan…')
    try {
      if ((await tomarPlan(supabase, p, usuarioId)) === 'tomado') {
        setMensaje(`El plan «${p.nombre}» ya fue tomado por otra comisión. Elige otro.`)
        await cargar()
      } else alTomar()
    } catch (e) {
      setMensaje(`No se pudo elegir el plan: ${(e as Error).message}`)
    } finally { setOcupado(false) }
  }

  if (!enLinea) return <p role="alert" className="error">Elegir plan requiere conexión. Conéctate y vuelve a intentar.</p>
  return (
    <section>
      <h2>Elige tu plan</h2>
      {mensaje && <p role="status">{mensaje}</p>}
      {planes.length === 0 && <p>No hay planes disponibles.</p>}
      <ul className="planes">
        {planes.map((p) => (
          <li key={p.id}>
            <span>{p.nombre}</span>
            <button onClick={() => elegir(p)} disabled={ocupado}>{p.comision_id === usuarioId ? 'Descargar de nuevo' : 'Tomar este plan'}</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
