import { useEffect, useRef, useState } from 'react'
import { liveQuery } from 'dexie'
import { local, type DescripcionLocal, type FotoLocal, type MedicionLocal, type MuestraLocal, type ParametroInsitu } from '../../datos/db-local'
import { cambiarEstado, claveMedicion, corregirMedicion, eliminarFotoPendiente, esCompuesta, descripcionVigente, guardarDescripcion, guardarFoto, guardarMedicion, vigentes } from '../../datos/mediciones'
import { advertenciaGps, advertenciaRango, parsearValor } from '../../datos/validar-medicion'
import { caudalLs, itemsDe, LECTURAS, nombreLectura, type Item } from '../../datos/subparametros'
import { leerGps } from '../../datos/gps'
import { comprimir } from '../../datos/fotos'
import { UMBRAL_GPS_M } from '../../config'
import type { Gps } from '../../datos/db-local'

type Aviso = { n: number; gps: Gps | null; adv: string[] }

function MiniaturaFoto({ foto, alQuitar }: { foto: FotoLocal; alQuitar?: () => void }) {
  const [url, setUrl] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  useEffect(() => {
    const u = URL.createObjectURL(foto.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto.blob])
  return (
    <div className="miniatura">
      {url && <img src={url} alt="Foto de la muestra" />}
      {foto.sincronizado === 0 && alQuitar && !confirmando && (
        <button type="button" className="secundario quitar-foto" aria-label="Quitar foto" title="Descartar esta foto (aún no sincronizada)" onClick={() => setConfirmando(true)}>×</button>
      )}
      {confirmando && alQuitar && (
        <div className="confirmar-foto">
          <button type="button" onClick={alQuitar}>Borrar</button>
          <button type="button" className="secundario" onClick={() => setConfirmando(false)}>No</button>
        </div>
      )}
      {foto.error_sync && <small className="error" title={foto.error_sync}>⚠ Error sync</small>}
    </div>
  )
}

function FilaMedicion({ muestra, nombre, etiqueta, alicuota, info, actual, usuario, umbral, alGuardar }: {
  muestra: string; nombre: string; etiqueta?: string; alicuota?: number; info?: ParametroInsitu; actual?: MedicionLocal; usuario: string; umbral: number; alGuardar: () => void
}) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [corrigiendo, setCorrigiendo] = useState(false)
  const [leyendo, setLeyendo] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [error, setError] = useState('')
  const unidad = info?.unidad ?? ''
  const enCurso = useRef(false)

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
      <b>{etiqueta ?? nombre}</b> <small>{unidad}{info?.obligatorio ? ' · obligatorio' : ''}</small>
      {actual && !corrigiendo && (
        <p>
          {actual.valor} {actual.unidad} · v{actual.version} · {new Date(actual.hora_telefono).toLocaleTimeString()}
          {actual.precision_m != null && ` · GPS ±${Math.round(actual.precision_m)} m`}
          {gpsDudoso && <small className="error"> · ⚠ {gpsDudoso}</small>}
          {actual.error_sync && <small className="error"> · ⚠ Rechazada por servidor: {actual.error_sync}</small>}
          {' '}<button onClick={() => setCorrigiendo(true)}>Corregir</button>
        </p>
      )}
      {editando && !aviso && (
        <>
          <div className="fila-captura">
            <input inputMode="decimal" value={valor} placeholder={corrigiendo ? 'Valor corregido' : 'Valor'} disabled={leyendo}
              onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && intentar()} />
            {!corrigiendo && (
              <button type="button" onClick={intentar} disabled={leyendo || !valor.trim()}>Guardar</button>
            )}
          </div>
          {corrigiendo && (
            <>
              <input value={motivo} placeholder="Motivo de la corrección (obligatorio)" onChange={(e) => setMotivo(e.target.value)} />
              <button onClick={intentar} disabled={leyendo}>Guardar corrección</button> <button className="secundario" onClick={() => { setCorrigiendo(false); setError('') }}>Cancelar</button>
            </>
          )}
          {leyendo && <small> Leyendo GPS…</small>}
        </>
      )}
      {aviso && (
        <div role="alert" className="aviso">
          <ul>{aviso.adv.map((a) => <li key={a}>{a}</li>)}</ul>
          <button onClick={() => guardar(aviso.n, aviso.gps)}>Guardar así</button>{' '}
          <button className="secundario" onClick={() => setAviso(null)}>Cancelar</button>
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
  const [avisosCierre, setAvisosCierre] = useState<string[] | null>(null)
  const descEnCurso = useRef(false)

  useEffect(() => {
    cambiarEstado(id, 'en_campo')
    const sub = liveQuery(async () => {
      const [m, ps, cat, cfg, v, d, fs] = await Promise.all([
        local.muestras.get(id),
        local.muestraParametros.where('muestra_id').equals(id).filter((p) => p.es_insitu).toArray(),
        local.parametrosInsitu.toArray(),
        local.config.get('umbral_gps_m'),
        vigentes(id),
        descripcionVigente(id),
        local.fotos.where('muestra_id').equals(id).toArray(),
      ])
      return { m, ps: ps.map((p) => p.parametro), insitu: new Map(cat.map((p) => [p.nombre, p])), umbral: cfg?.valor ?? UMBRAL_GPS_M, v, d, fs }
    }).subscribe(({ m, ps, insitu, umbral, v, d, fs }) => {
      setMuestra(m); setParams(ps); setInsitu(insitu); setUmbral(umbral); setMed(v); setDesc(d); setFotos(fs)
      setAbiertas((n) => Math.max(n, ...[...v.values()].map((x) => x.alicuota ?? 0)))
    })
    return () => sub.unsubscribe()
  }, [id])

  async function guardarDesc() {
    if (descEnCurso.current) return
    descEnCurso.current = true
    try { await guardarDescripcion(id, texto, usuario, editDesc ? motivoDesc : undefined); setEditDesc(false); setTexto(''); setMotivoDesc(''); setMsg('') }
    catch (x) { setMsg((x as Error).message) }
    finally { descEnCurso.current = false }
  }

  async function agregarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setMsg('Procesando foto…')
    try {
      const [blob, gps] = await Promise.all([comprimir(f), leerGps(8000)])
      await guardarFoto(id, blob, gps, usuario); setMsg('')
    } catch (x) { setMsg(`No se guardó la foto: ${(x as Error).message}`) }
  }

  async function quitarFoto(fotoId: string) {
    try { await eliminarFotoPendiente(fotoId) }
    catch (x) { setMsg((x as Error).message) }
  }

  // Los parámetros de varias lecturas (caudal: volumen y tiempo) se piden como sus lecturas.
  const items = itemsDe(params)
  const infoDe = (it: Item): ParametroInsitu | undefined => {
    const base = insitu.get(it.base)
    return it.unidad && base ? { ...base, nombre: it.nombre, unidad: it.unidad, minimo: null, maximo: null } : base
  }
  const maxAlicuotaConDatos = Math.max(1, ...[...med.values()].map((x) => x.alicuota ?? 0))
  const alicuotas: (number | undefined)[] = muestra && esCompuesta(muestra) ? Array.from({ length: abiertas }, (_, i) => i + 1) : [undefined]

  async function cerrar(forzar = false) {
    if (!forzar) {
      const faltan = alicuotas.flatMap((a) => items.filter((it) => insitu.get(it.base)?.obligatorio && !med.has(claveMedicion(it.nombre, a)))
        .map((it) => `Falta medir: ${it.etiqueta}${a ? ` (alícuota ${a})` : ''}`))
      const avisos = [...faltan, ...(desc ? [] : ['Falta la descripción del punto'])]
      if (avisos.length) return setAvisosCierre(avisos)
    }
    setAvisosCierre(null)
    await cambiarEstado(id, 'cerrada')
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
          {compuesta && (
            <h4>
              Alícuota {a}
              {!cerrada && a === abiertas && abiertas > maxAlicuotaConDatos && (
                <> <button type="button" className="secundario" onClick={() => setAbiertas(abiertas - 1)}>Quitar alícuota vacía</button></>
              )}
            </h4>
          )}
          <ul className="planes">
            {items.map((it) => <FilaMedicion key={it.nombre} muestra={id} nombre={it.nombre} etiqueta={it.etiqueta} alicuota={a} info={infoDe(it)} actual={med.get(claveMedicion(it.nombre, a))} usuario={usuario} umbral={umbral} alGuardar={() => {}} />)}
            {Object.keys(LECTURAS).filter((b) => params.some((p) => p.trim() === b)).map((b) => {
              const [v, t] = LECTURAS[b].map((l) => med.get(claveMedicion(nombreLectura(b, l), a))?.valor)
              const c = caudalLs(v, t)
              return c !== null && <li key={`caudal ${b}`} className="medicion"><small>Caudal calculado: <b>{c} L/s</b></small></li>
            })}
          </ul>
        </div>
      ))}
      {compuesta && !cerrada && <button className="secundario" onClick={() => setAbiertas(abiertas + 1)}>+ Agregar alícuota</button>}

      <h3>Descripción del punto</h3>
      {desc && !editDesc ? (
        <p>
          {desc.texto} <small>(v{desc.version})</small>
          {desc.error_sync && <small className="error"> · ⚠ Rechazada por servidor: {desc.error_sync}</small>}
          {' '}<button onClick={() => { setEditDesc(true); setTexto(desc.texto) }}>Corregir</button>
        </p>
      ) : (
        <>
          <textarea value={texto} rows={3} placeholder="Describe el punto y las condiciones observadas…" onChange={(e) => setTexto(e.target.value)} />
          {editDesc ? (
            <>
              <input value={motivoDesc} placeholder="Motivo de la corrección (obligatorio)" onChange={(e) => setMotivoDesc(e.target.value)} />
              <button onClick={guardarDesc}>Guardar corrección</button> <button className="secundario" onClick={() => setEditDesc(false)}>Cancelar</button>
            </>
          ) : (
            <button type="button" onClick={guardarDesc} disabled={!texto.trim()}>Guardar descripción</button>
          )}
        </>
      )}

      <h3>Fotos ({fotos.length})</h3>
      <input type="file" accept="image/*" capture="environment" onChange={agregarFoto} />
      <div className="fotos">{fotos.map((f) => <MiniaturaFoto key={f.id} foto={f} alQuitar={() => quitarFoto(f.id)} />)}</div>

      {msg && <p role="status">{msg}</p>}
      {avisosCierre && (
        <div role="alert" className="aviso">
          <b>Antes de cerrar la muestra:</b>
          <ul>{avisosCierre.map((a) => <li key={a}>{a}</li>)}</ul>
          <span>Una muestra cerrada no se reabre. ¿Cerrarla así?</span>
          <button onClick={() => cerrar(true)}>Cerrar de todos modos</button>
          <button className="secundario" onClick={() => setAvisosCierre(null)}>Cancelar</button>
        </div>
      )}
      {!cerrada && !avisosCierre && <button onClick={() => cerrar(false)}>Cerrar muestra</button>}
    </section>
  )
}
