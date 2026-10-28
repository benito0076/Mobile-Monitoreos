import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { leerPlan, type MuestraPlan } from '../../plan/leer-excel'
import { validarPlan } from '../../plan/validar-plan'
import { guardarPlan } from '../../plan/guardar-plan'
import { buscarRepetidos, existePlanConNombre, textoRepetido, type Repetido } from '../../plan/duplicados'

export function CargarPlan() {
  const [archivo, setArchivo] = useState('')
  const [nombre, setNombre] = useState('')
  const [muestras, setMuestras] = useState<MuestraPlan[]>([])
  const [estado, setEstado] = useState('')
  const [repetidos, setRepetidos] = useState<Repetido[]>([])
  const [nombreRepetido, setNombreRepetido] = useState(false)
  const [sinComprobar, setSinComprobar] = useState(false)

  const hallazgos = validarPlan(muestras)
  const hayErrores = hallazgos.some((h) => h.nivel === 'error')

  // Avisa si el archivo ya se cargó: mismos códigos de muestra en otro plan, o un plan con el mismo nombre.
  useEffect(() => {
    setSinComprobar(false)
    if (!muestras.length) return setRepetidos([])
    buscarRepetidos(supabase, muestras.map((m) => m.codigo)).then(setRepetidos).catch(() => { setRepetidos([]); setSinComprobar(true) })
  }, [muestras])
  useEffect(() => {
    if (!nombre.trim()) return setNombreRepetido(false)
    existePlanConNombre(supabase, nombre).then(setNombreRepetido).catch(() => setNombreRepetido(false))
  }, [nombre])
  const duplicado = repetidos.length > 0 || nombreRepetido

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setEstado('')
    try {
      setMuestras(leerPlan(await f.arrayBuffer()))
      setArchivo(f.name)
      setNombre(f.name.replace(/\.[^.]+$/, ''))
    } catch {
      setMuestras([])
      setEstado('No se pudo leer el archivo. ¿Es el Excel del plan?')
    }
  }

  async function guardar() {
    if (duplicado && !confirm('Este plan parece ya estar cargado (ver el aviso de duplicado). Los códigos de muestra repetidos en dos planes confunden la exportación. ¿Guardarlo de todos modos?')) return
    setEstado('Guardando…')
    try {
      await guardarPlan(supabase, nombre, archivo, muestras)
      setEstado(`Plan «${nombre}» guardado con ${muestras.length} muestras.`)
      setMuestras([])
    } catch (e) {
      setEstado(`No se guardó: ${(e as Error).message}`)
    }
  }

  return (
    <section>
      <h2>Cargar plan de monitoreos</h2>
      <input type="file" accept=".xls,.xlsx" onChange={elegir} />
      {estado && <p role="status">{estado}</p>}

      {muestras.length > 0 && (
        <>
          <label>Nombre del plan <input value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          {duplicado && (
            <div className="aviso" role="alert">
              <b>¿Plan duplicado?</b>
              <ul>
                {nombreRepetido && <li>Ya existe un plan llamado «{nombre.trim()}».</li>}
                {repetidos.map((r) => <li key={r.plan}>{textoRepetido(r, muestras.length)}.</li>)}
              </ul>
            </div>
          )}
          {sinComprobar && <p className="aviso">No se pudo comprobar si estos códigos ya están cargados (¿sin conexión?).</p>}
          <h3>Validaciones</h3>
          {hallazgos.length === 0 ? <p>Sin observaciones.</p> : (
            <ul>{hallazgos.map((h, i) => <li key={i} className={h.nivel}><b>{h.codigo}</b>: {h.mensaje}</li>)}</ul>
          )}
          <div className="tabla"><table>
            <thead><tr><th>Código</th><th>Punto</th><th>Identificador</th><th>Tipo</th><th>Matriz</th><th>Parámetros</th></tr></thead>
            <tbody>
              {muestras.map((m) => (
                <tr key={m.codigo}>
                  <td>{m.codigo}</td><td>{m.punto_texto}</td><td>{m.punto_codigo ?? '—'}</td>
                  <td>{m.tipo}</td><td>{m.matriz} / {m.submatriz}</td><td>{m.parametros.length}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <button onClick={guardar} disabled={hayErrores || !nombre.trim()}>Guardar plan</button>
          {hayErrores && <p className="error">Corrige los errores del archivo antes de guardar.</p>}
        </>
      )}
    </section>
  )
}
