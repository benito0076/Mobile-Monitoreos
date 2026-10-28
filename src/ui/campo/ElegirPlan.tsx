import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { planesVisibles, tomarPlan, type PlanDisponible } from '../../datos/planes'

export function ElegirPlan({ usuarioId, descargados, alTomar, alVolver }: {
  usuarioId: string; descargados: string[]; alTomar: (planId: string) => void; alVolver?: () => void
}) {
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
      } else alTomar(p.id)
    } catch (e) {
      setMensaje(`No se pudo elegir el plan: ${(e as Error).message}`)
    } finally { setOcupado(false) }
  }

  const volver = alVolver && <button className="secundario" onClick={alVolver}>← Volver a mis planes</button>
  if (!enLinea) return <section>{volver}<p role="alert" className="error">Descargar planes requiere conexión. Conéctate y vuelve a intentar.</p></section>
  return (
    <section>
      {volver}
      <h2>{alVolver ? 'Planes disponibles' : 'Elige tu plan'}</h2>
      {mensaje && <p role="status">{mensaje}</p>}
      {planes.length === 0 && <p>No hay planes disponibles.</p>}
      <ul className="planes">
        {planes.map((p) => (
          <li key={p.id}>
            <span>{p.nombre}{descargados.includes(p.id) && <> <span className="estado en_campo">en este teléfono</span></>}</span>
            <button onClick={() => elegir(p)} disabled={ocupado}>
              {![p.comision_id, p.comision_id_2].includes(usuarioId) ? 'Tomar este plan' : descargados.includes(p.id) ? 'Actualizar' : 'Descargar'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
