import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import type { ParametroInsitu } from '../../datos/db-local'
import { aFilaInsitu, guardarInsitu, listarInsitu, nombresParametros, quitarInsitu, reaplicarInsitu, type BorradorInsitu } from '../../datos/insitu'

const aBorrador = (p: ParametroInsitu): BorradorInsitu => ({ nombre: p.nombre, unidad: p.unidad, minimo: p.minimo?.toString() ?? '', maximo: p.maximo?.toString() ?? '', obligatorio: p.obligatorio })
const VACIO: BorradorInsitu = { nombre: '', unidad: '', minimo: '', maximo: '', obligatorio: false }

function Campos({ b, set }: { b: BorradorInsitu; set: (b: BorradorInsitu) => void }) {
  return (
    <>
      <input aria-label="Unidad" placeholder="Unidad" value={b.unidad} onChange={(e) => set({ ...b, unidad: e.target.value })} />
      <input aria-label="Mínimo" placeholder="Mín." inputMode="decimal" value={b.minimo} onChange={(e) => set({ ...b, minimo: e.target.value })} />
      <input aria-label="Máximo" placeholder="Máx." inputMode="decimal" value={b.maximo} onChange={(e) => set({ ...b, maximo: e.target.value })} />
      <label className="casilla"><input type="checkbox" checked={b.obligatorio} onChange={(e) => set({ ...b, obligatorio: e.target.checked })} /> Obligatorio</label>
    </>
  )
}

export function ParametrosInsitu() {
  const [lista, setLista] = useState<ParametroInsitu[]>([])
  const [candidatos, setCandidatos] = useState<string[]>([])
  const [nuevo, setNuevo] = useState<BorradorInsitu>(VACIO)
  const [edicion, setEdicion] = useState<Record<string, BorradorInsitu>>({})
  const [estado, setEstado] = useState('')

  async function cargar() {
    try {
      const l = await listarInsitu(supabase)
      setLista(l); setEdicion({})
      setCandidatos((await nombresParametros(supabase)).map((x) => x.parametro).filter((n) => !l.some((p) => p.nombre === n)))
    } catch (e) { setEstado((e as Error).message) }
  }
  useEffect(() => { cargar() }, [])

  async function guardar(b: BorradorInsitu, ok: string) {
    try { await guardarInsitu(supabase, aFilaInsitu(b)); setEstado(ok); if (b === nuevo) setNuevo(VACIO); await cargar() }
    catch (e) { setEstado((e as Error).message) }
  }
  async function quitar(p: ParametroInsitu) {
    if (!confirm(`¿Quitar «${p.nombre.trim()}» de la lista? Los planes ya cargados lo conservan como in situ hasta que pulses «Aplicar a planes cargados».`)) return
    try { await quitarInsitu(supabase, p.nombre); setEstado('Parámetro quitado.'); await cargar() } catch (e) { setEstado((e as Error).message) }
  }
  async function aplicar() {
    try {
      const n = await reaplicarInsitu(supabase)
      setEstado(n ? `${n} parámetros de planes ya cargados quedaron actualizados. En cada celular, pulsa «Actualizar» en el plan para bajar el cambio.` : 'Los planes cargados ya coinciden con la lista.')
    } catch (e) { setEstado((e as Error).message) }
  }

  return (
    <section>
      <h2>Parámetros in situ</h2>
      <p>Lo que se mide en campo. El nombre se elige de los parámetros de los planes cargados, así queda exactamente igual al plan. Los rangos solo advierten, no bloquean.</p>
      {estado && <p role="status">{estado}</p>}

      <div className="tarjeta ancha">
        <b>Agregar parámetro</b>
        <select aria-label="Parámetro" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}>
          <option value="">Elige un parámetro de los planes cargados…</option>
          {candidatos.map((n) => <option key={n} value={n}>{n.trim()}</option>)}
        </select>
        <Campos b={nuevo} set={setNuevo} />
        <button onClick={() => guardar(nuevo, 'Parámetro agregado. Pulsa «Aplicar a planes cargados» para marcarlo en los planes ya cargados.')} disabled={!nuevo.nombre}>Agregar</button>
      </div>

      <div className="tabla"><table>
        <thead><tr><th>Parámetro (nombre exacto del plan)</th><th>Unidad</th><th>Mín.</th><th>Máx.</th><th>Obligatorio</th><th></th></tr></thead>
        <tbody>
          {lista.map((p) => {
            const b = edicion[p.nombre] ?? aBorrador(p)
            const cambio = JSON.stringify(b) !== JSON.stringify(aBorrador(p))
            return (
              <tr key={p.nombre}>
                <td>{p.nombre}</td>
                <td><input aria-label={`Unidad de ${p.nombre}`} value={b.unidad} placeholder="—" onChange={(e) => setEdicion({ ...edicion, [p.nombre]: { ...b, unidad: e.target.value } })} /></td>
                <td><input aria-label={`Mínimo de ${p.nombre}`} inputMode="decimal" value={b.minimo} onChange={(e) => setEdicion({ ...edicion, [p.nombre]: { ...b, minimo: e.target.value } })} /></td>
                <td><input aria-label={`Máximo de ${p.nombre}`} inputMode="decimal" value={b.maximo} onChange={(e) => setEdicion({ ...edicion, [p.nombre]: { ...b, maximo: e.target.value } })} /></td>
                <td><input type="checkbox" aria-label={`Obligatorio ${p.nombre}`} checked={b.obligatorio} onChange={(e) => setEdicion({ ...edicion, [p.nombre]: { ...b, obligatorio: e.target.checked } })} /></td>
                <td><div className="acciones">
                  <button disabled={!cambio} onClick={() => guardar(b, `«${p.nombre.trim()}» actualizado.`)}>Guardar</button>
                  <button className="secundario" onClick={() => quitar(p)}>Quitar</button>
                </div></td>
              </tr>
            )
          })}
        </tbody>
      </table></div>

      <button onClick={aplicar}>Aplicar a planes cargados</button>
      <p><small>La marca «in situ» se calcula al cargar un plan. Si cambias la lista, aplícala a los planes ya cargados.</small></p>
    </section>
  )
}
