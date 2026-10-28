import { useCallback, useEffect, useRef, useState } from 'react'
import { local, type DescripcionLocal, type FotoLocal, type MedicionLocal, type MuestraLocal, type ParametroInsitu } from '../../datos/db-local'
import { cambiarEstado, claveMedicion, corregirMedicion, esCompuesta, descripcionVigente, guardarDescripcion, guardarFoto, guardarMedicion, vigentes } from '../../datos/mediciones'
import { advertenciaGps, advertenciaRango, parsearValor } from '../../datos/validar-medicion'
import { leerGps } from '../../datos/gps'
import { comprimir } from '../../datos/fotos'
import { UMBRAL_GPS_M } from '../../config'
import type { Gps } from '../../datos/db-local'

type Aviso = { n: number; gps: Gps | null; adv: string[] }

function FilaMedicion({ muestra, nombre, alicuota, info, actual, usuario, umbral, alGuardar }: {
  muestra: string; nombre: string; alicuota?: number; info?: ParametroInsitu; actual?: MedicionLocal; usuario: string; umbral: number; alGuardar: () => void
}) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [error, setError] = useState('')
  const unidad = info?.unidad ?? ''
  const enCurso = useRef(false) // Enter y blur pueden disparar el guardado a la vez

  async function guardar(n: number, gps: Gps | null) {
    try {
      const e = { muestra_id: muestra, parametro: nombre, alicuota, valor: String(n), unidad, usuario_id: usuario, gps }
      if (corrigiendo) await corregirMedicion({ ...e, motivo }); else await guardarMedicion(e)
      setAviso(null); setCorrigiendo(false); setValor(''); setMotivo(''); setError(''); alGuardar()
    } catch (x) { setError((x as Error).message) }
  }

  async function intentar() {
    if (enCurso.current) return
    const n = parsearValor(valor)
    if (n === null) return setError('Escribe solo el número')
    if (corrigiendo && !motivo.trim()) return setError('El motivo de la corrección es obligatorio')
    enCurso.current = true; setError(''); setLeyendo(true)
    try {
      const gps = await leerGps()
      // Solo el rango pide confirmar (puede ser un error de digitación). El GPS se guarda solo y queda señalado en la fila.
      const rango = advertenciaRango(n, info)
      if (rango) setAviso({ n, gps, adv: [rango] }); else await guardar(n, gps)
    } finally { enCurso.current = false; setLeyendo(false) }
  }

  const gpsDudoso = actual && advertenciaGps(actual.lat == null ? null : { lat: actual.lat, lon: actual.lon!, precision_m: actual.precision_m ?? 0 }, umbral)
  const editando = !actual || corrigiendo
  return (
    <li className="medicion">
      <b>{nombre}</b> <small>{unidad}{info?.obligatorio ? ' · obligatorio' : ''}</small>
      {actual && !corrigiendo && (
        <p>
          {actual.valor} {actual.unidad} · v{actual.version} · {new Date(actual.hora_telefono).toLocaleTimeString()}
          {actual.precision_m != null && ` · GPS ±${Math.round(actual.precision_m)} m`}
          {gpsDudoso && <small className="error"> · ⚠ {gpsDudoso}</small>}
          {' '}<button onClick={() => setCorrigiendo(true)}>Corregir</button>
        </p>
      )}
      {editando && !aviso && (
        <>
          <input inputMode="decimal" value={valor} placeholder={corrigiendo ? 'Valor corregido' : 'Valor'} disabled={leyendo}
            onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && intentar()}
            onBlur={() => !corrigiendo && valor.trim() && intentar()} />
          {corrigiendo && (
            <>
              <input value={motivo} placeholder="Motivo de la corrección (obligatorio)" onChange={(e) => setMotivo(e.target.value)} />
              <button onClick={intentar}>Guardar corrección</button> <button onClick={() => { setCorrigiendo(false); setError('') }}>Cancelar</button>
            </>
          )}
          {leyendo && <small> Leyendo GPS…</small>}
        </>
      )}
      {aviso && (
        <div role="alert" className="aviso">
          <ul>{aviso.adv.map((a) => <li key={a}>{a}</li>)}</ul>
          <button onClick={() => guardar(aviso.n, aviso.gps)}>Guardar así</button>{' '}
          <button onClick={() => setAviso(null)}>Cancelar</button>
        </div>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </li>
  )
}

export function FormMuestra({ id, usuario, volver }: { id: string; usuario: string; volver: () => void }) {
  const [muestra, setMuestra] = useState<MuestraLocal>()
  const [params, setParams] = useState<string[]>([])
  const [insitu, setInsitu] = useState<Map<string, ParametroInsitu>>(new Map())
  const [med, setMed] = useState<Map<string, MedicionLocal>>(new Map())
  const [desc, setDesc] = useState<DescripcionLocal>()
  const [fotos, setFotos] = useState<FotoLocal[]>([])
  const [umbral, setUmbral] = useState(UMBRAL_GPS_M)
  const [texto, setTexto] = useState('')
  const [motivoDesc, setMotivoDesc] = useState('')
  const [editDesc, setEditDesc] = useState(false)
  const [msg, setMsg] = useState('')
  const [abiertas, setAbiertas] = useState(1) // alícuotas mostradas (las vacías no se guardan)
  const descEnCurso = useRef(false)

  const cargar = useCallback(async () => {
    setMuestra(await local.muestras.get(id))
    const v = await vigentes(id)
    setMed(v); setAbiertas((n) => Math.max(n, ...[...v.values()].map((x) => x.alicuota ?? 0))); setDesc(await descripcionVigente(id))
    setFotos(await local.fotos.where('muestra_id').equals(id).toArray())
  }, [id])

  useEffect(() => {
    (async () => {
      setParams((await local.muestraParametros.where('muestra_id').equals(id).filter((p) => p.es_insitu).toArray()).map((p) => p.parametro))
      setInsitu(new Map((await local.parametrosInsitu.toArray()).map((p) => [p.nombre, p])))
      setUmbral((await local.config.get('umbral_gps_m'))?.valor ?? UMBRAL_GPS_M)
      await cambiarEstado(id, 'en_campo')
      cargar()
    })()
  }, [id, cargar])

  async function guardarDesc() {
    if (descEnCurso.current) return
    descEnCurso.current = true
    try { await guardarDescripcion(id, texto, usuario, editDesc ? motivoDesc : undefined); setEditDesc(false); setTexto(''); setMotivoDesc(''); setMsg(''); cargar() }
    catch (x) { setMsg((x as Error).message) }
    finally { descEnCurso.current = false }
  }

  async function agregarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setMsg('Procesando foto…')
    try {
      const [blob, gps] = await Promise.all([comprimir(f), leerGps(8000)])
      await guardarFoto(id, blob, gps, usuario); setMsg(''); cargar()
    } catch (x) { setMsg(`No se guardó la foto: ${(x as Error).message}`) }
  }

  const alicuotas: (number | undefined)[] = muestra && esCompuesta(muestra) ? Array.from({ length: abiertas }, (_, i) => i + 1) : [undefined]

  async function cerrar() {
    const faltan = alicuotas.flatMap((a) => params.filter((p) => insitu.get(p)?.obligatorio && !med.has(claveMedicion(p, a)))
      .map((p) => `Falta medir: ${p.trim()}${a ? ` (alícuota ${a})` : ''}`))
    const avisos = [...faltan, ...(desc ? [] : ['Falta la descripción del punto'])]
    if (avisos.length && !confirm(`${avisos.join('\n')}\n\nUna muestra cerrada no se reabre. ¿Cerrarla así?`)) return
    await cambiarEstado(id, 'cerrada'); cargar()
  }

  if (!muestra) return null
  const cerrada = muestra.estado === 'cerrada'
  const compuesta = esCompuesta(muestra)
  return (
    <section>
      <button onClick={volver}>← Muestras</button>
      <h2>{muestra.codigo} <span className={`estado ${muestra.estado}`}>{muestra.estado.replace('_', ' ')}</span></h2>
      <p>{muestra.punto_texto}</p>

      <h3>Mediciones in situ</h3>
      {alicuotas.map((a) => (
        <div key={a ?? 0}>
          {compuesta && <h4>Alícuota {a}</h4>}
          <ul className="planes">
            {params.map((p) => <FilaMedicion key={p} muestra={id} nombre={p} alicuota={a} info={insitu.get(p)} actual={med.get(claveMedicion(p, a))} usuario={usuario} umbral={umbral} alGuardar={cargar} />)}
          </ul>
        </div>
      ))}
      {compuesta && !cerrada && <button className="secundario" onClick={() => setAbiertas(abiertas + 1)}>+ Agregar alícuota</button>}

      <h3>Descripción del punto</h3>
      {desc && !editDesc ? (
        <p>{desc.texto} <small>(v{desc.version})</small> <button onClick={() => { setEditDesc(true); setTexto(desc.texto) }}>Corregir</button></p>
      ) : (
        <>
          <textarea value={texto} rows={3} onChange={(e) => setTexto(e.target.value)} onBlur={() => !editDesc && texto.trim() && guardarDesc()} />
          {editDesc && (<><input value={motivoDesc} placeholder="Motivo de la corrección (obligatorio)" onChange={(e) => setMotivoDesc(e.target.value)} />
            <button onClick={guardarDesc}>Guardar corrección</button> <button onClick={() => setEditDesc(false)}>Cancelar</button></>)}
        </>
      )}

      <h3>Fotos ({fotos.length})</h3>
      <input type="file" accept="image/*" capture="environment" onChange={agregarFoto} />
      <div className="fotos">{fotos.map((f) => <img key={f.id} src={URL.createObjectURL(f.blob)} alt="Foto de la muestra" />)}</div>

      {msg && <p role="status">{msg}</p>}
      {!cerrada && <button onClick={cerrar}>Cerrar muestra</button>}
    </section>
  )
}
