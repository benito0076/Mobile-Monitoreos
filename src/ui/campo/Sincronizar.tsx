import { useEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { supabase } from '../../datos/supabase'
import { pendientes, purgarConfirmados, sincronizar, type Resultado } from '../../datos/sync'
import { medirDesfase } from '../../datos/reloj'
import { descargarJornada } from '../../datos/emergencia'

const CADA_MS = 60_000

export function Sincronizar() {
  const [n, setN] = useState(0)
  const [enCurso, setEnCurso] = useState(false)
  const [msg, setMsg] = useState('')
  const [errores, setErrores] = useState<string[]>([])
  const nRef = useRef(0)

  useEffect(() => {
    const sub = liveQuery(pendientes).subscribe((p) => { setN(p.total); nRef.current = p.total })
    return () => sub.unsubscribe()
  }, [])

  async function lanzar(manual: boolean) {
    if (!navigator.onLine) return manual && setMsg('Sin conexión: los datos siguen guardados en el teléfono.')
    setEnCurso(true); if (manual) setMsg('Sincronizando…')
    try {
      await medirDesfase(supabase)
      const r: Resultado = await sincronizar(supabase)
      await purgarConfirmados()
      const quedan = (await pendientes()).total
      setErrores(r.errores)
      setMsg(r.sinConexion ? `Se cortó la conexión. Quedan ${quedan} pendientes; se reintentará solo.`
        : quedan ? `Quedan ${quedan} pendientes (ver errores).` : 'Todo sincronizado.')
    } catch (e) {
      setMsg(`No se pudo sincronizar: ${(e as Error).message}`)
    } finally { setEnCurso(false) }
  }

  // Sin depender de que alguien toque el botón: al recuperar señal, y cada minuto mientras haya pendientes.
  useEffect(() => {
    const alVolver = () => lanzar(false)
    window.addEventListener('online', alVolver)
    const t = setInterval(() => nRef.current > 0 && lanzar(false), CADA_MS)
    lanzar(false)
    return () => { window.removeEventListener('online', alVolver); clearInterval(t) }
  }, [])

  return (
    <div className="sync">
      <button onClick={() => lanzar(true)} disabled={enCurso} className={n ? 'pendiente' : ''}>
        {enCurso ? 'Sincronizando…' : `Sincronizar (${n} pendiente${n === 1 ? '' : 's'})`}
      </button>
      <button onClick={descargarJornada} className="secundario">Exportación de emergencia</button>
      {msg && <p role="status">{msg}</p>}
      {errores.length > 0 && <ul className="error">{errores.map((e) => <li key={e}>{e}</li>)}</ul>}
    </div>
  )
}
