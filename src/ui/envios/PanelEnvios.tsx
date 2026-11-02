import { useEffect, useRef, useState } from 'react'
import { CONTROLES, MEDIOS_TRANSPORTE, fechaLegible, hoy, type EnvioVista } from '../../datos/envios'

export interface MuestraEnvio { id: string; codigo: string; punto_texto: string }
export interface DatosFormulario {
  muestraIds: string[]; fecha: string; medio_transporte: string | null; controles: Record<string, boolean>
  temperatura_testigo: string | null; observaciones: string | null; entrega: string | null
}
/** De dónde salen y a dónde van los envíos: el teléfono (sin conexión) o el servidor (oficina). */
export interface FuenteEnvios {
  candidatas(): Promise<MuestraEnvio[]>
  envios(): Promise<EnvioVista[]>
  crear(d: DatosFormulario): Promise<string>
  pdf(envioId: string): Promise<void>
  anular?(envioId: string, motivo: string): Promise<void>
  entregaPorDefecto: string
}

export function PanelEnvios({ fuente }: { fuente: FuenteEnvios }) {
  const [candidatas, setCandidatas] = useState<MuestraEnvio[]>([])
  const [envios, setEnvios] = useState<EnvioVista[]>([])
  const [elegidas, setElegidas] = useState<Set<string>>(new Set())
  const [fecha, setFecha] = useState(hoy())
  const [medio, setMedio] = useState('')
  const [otroMedio, setOtroMedio] = useState('')
  const [controles, setControles] = useState<Record<string, boolean>>({})
  const [testigo, setTestigo] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [entrega, setEntrega] = useState(fuente.entregaPorDefecto)
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const enCurso = useRef(false) // doble toque = un solo envío

  async function cargar(marcarTodas = false) {
    const [c, e] = await Promise.all([fuente.candidatas(), fuente.envios()])
    setCandidatas(c); setEnvios(e)
    setElegidas((antes) => new Set(c.filter((m) => marcarTodas || antes.has(m.id)).map((m) => m.id)))
  }
  useEffect(() => { cargar(true).catch((e) => setMensaje(e.message)) }, [])

  async function crear() {
    if (enCurso.current) return
    if (!elegidas.size) return setMensaje('Elige al menos una muestra.')
    enCurso.current = true; setOcupado(true); setMensaje('')
    let id: string
    try {
      id = await fuente.crear({
        muestraIds: [...elegidas], fecha, controles, entrega: entrega.trim() || null, observaciones: observaciones.trim() || null, temperatura_testigo: testigo.trim() || null,
        medio_transporte: (medio === 'otro' ? otroMedio.trim() : medio) || null,
      })
    } catch (e) { enCurso.current = false; setOcupado(false); return setMensaje(`No se creó el envío: ${(e as Error).message}`) }
    try { await fuente.pdf(id); setMensaje('Envío creado. La cadena de custodia se descargó.') }
    catch (e) { setMensaje(`El envío se creó, pero no se pudo generar el PDF (${(e as Error).message}). Puedes descargarlo desde la lista.`) }
    setObservaciones(''); setTestigo(''); setControles({})
    await cargar(true).catch(() => {})
    enCurso.current = false; setOcupado(false)
  }

  async function descargar(id: string) {
    setMensaje('Generando cadena de custodia…')
    try { await fuente.pdf(id); setMensaje('') } catch (e) { setMensaje(`No se pudo generar: ${(e as Error).message}`) }
  }

  async function anular(id: string) {
    try { await fuente.anular!(id, motivo); setAnulando(null); setMotivo(''); setMensaje('Envío anulado: sus muestras quedaron libres.'); await cargar(true) }
    catch (e) { setMensaje((e as Error).message) }
  }

  return (
    <div className="tarjeta ancha">
      <h3>Envíos al laboratorio</h3>
      {candidatas.length === 0
        ? <p>No hay muestras cerradas pendientes de enviar.</p>
        : (
          <>
            <b>Muestras para este envío ({elegidas.size} de {candidatas.length})</b>
            <ul className="planes">
              {candidatas.map((m) => (
                <li key={m.id}>
                  <label><input type="checkbox" checked={elegidas.has(m.id)}
                    onChange={(e) => setElegidas((s) => { const n = new Set(s); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n })} />
                    {' '}<b>{m.codigo}</b> · {m.punto_texto}</label>
                </li>
              ))}
            </ul>
            <label>Fecha del envío <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required /></label>
            <label>Medio de transporte
              <select value={medio} onChange={(e) => setMedio(e.target.value)}>
                <option value="">Sin indicar</option>
                {MEDIOS_TRANSPORTE.map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                <option value="otro">Otro…</option>
              </select>
            </label>
            {medio === 'otro' && <label>¿Cuál? <input value={otroMedio} onChange={(e) => setOtroMedio(e.target.value)} /></label>}
            <fieldset>
              <legend>Verificado en campo</legend>
              {CONTROLES.map((c) => (
                <label key={c.clave}><input type="checkbox" checked={!!controles[c.clave]} onChange={(e) => setControles({ ...controles, [c.clave]: e.target.checked })} /> {c.etiqueta}</label>
              ))}
            </fieldset>
            <label>Testigo de temperatura (°C) <input inputMode="decimal" value={testigo} onChange={(e) => setTestigo(e.target.value)} /></label>
            <label>Responsable de la entrega <input value={entrega} onChange={(e) => setEntrega(e.target.value)} /></label>
            <label>Observaciones <input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={300} /></label>
            <button onClick={crear} disabled={ocupado || !elegidas.size}>{ocupado ? 'Creando…' : 'Crear envío y generar cadena de custodia'}</button>
          </>
        )}
      {mensaje && <p role="status">{mensaje}</p>}
      {envios.length > 0 && (
        <>
          <b>Envíos de este plan</b>
          <ul className="planes">
            {envios.map((e) => (
              <li key={e.id}>
                <span>
                  <b>{fechaLegible(e.fecha)}</b> · {e.muestras} muestra{e.muestras === 1 ? '' : 's'}
                  {e.pendiente && <small> · sin sincronizar</small>}
                  {e.error && <small className="error"> · {e.error}</small>}
                </span>
                <span className="acciones">
                  <button className="secundario" onClick={() => descargar(e.id)}>PDF</button>
                  {fuente.anular && <button className="secundario" onClick={() => { setAnulando(anulando === e.id ? null : e.id); setMotivo('') }}>Anular</button>}
                </span>
                {anulando === e.id && (
                  <div className="aviso" role="alert">
                    <input value={motivo} onChange={(x) => setMotivo(x.target.value)} placeholder="Motivo de la anulación (obligatorio)" />
                    <button onClick={() => anular(e.id)} disabled={!motivo.trim()}>Confirmar anulación</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
