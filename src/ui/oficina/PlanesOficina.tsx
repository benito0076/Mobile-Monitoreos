import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { planesVisibles, type PlanDisponible } from '../../datos/planes'
import { listarPerfiles, type Perfil } from '../../datos/usuarios'
import { cargarDatosPlan } from '../../datos/exportar-datos'
import { construirExportacion, exportarPlan } from '../../exportar/exportador'

export function PlanesOficina() {
  const [planes, setPlanes] = useState<PlanDisponible[]>([])
  const [comisiones, setComisiones] = useState<Perfil[]>([])
  const [destino, setDestino] = useState<Record<string, string>>({})
  const [estado, setEstado] = useState('')

  const cargar = () =>
    Promise.all([planesVisibles(supabase), listarPerfiles(supabase)])
      .then(([p, u]) => { setPlanes(p); setComisiones(u.filter((x) => x.rol === 'comision' && x.activo)) })
      .catch((e) => setEstado(e.message))
  useEffect(() => { cargar() }, [])

  const nombreDe = (id: string | null) => (id ? comisiones.find((c) => c.id === id)?.nombre ?? 'Comisión inactiva' : 'Disponible')

  async function rpc(fn: 'liberar_plan' | 'reasignar_plan', args: Record<string, string>, ok: string) {
    const { error } = await supabase.rpc(fn, args)
    setEstado(error ? `No se pudo: ${error.message}` : ok)
    cargar()
  }

  function liberar(p: PlanDisponible) {
    if (!confirm(`Liberar «${p.nombre}». Los datos ya enviados se conservan, pero lo que la comisión no haya sincronizado ya no podrá enviarse. Pídele que sincronice antes. ¿Liberar?`)) return
    rpc('liberar_plan', { p_plan: p.id }, `«${p.nombre}» quedó disponible.`)
  }

  function reasignar(p: PlanDisponible) {
    const c = comisiones.find((x) => x.id === destino[p.id])
    if (!c || !confirm(`Reasignar «${p.nombre}» a ${c.nombre}. La nueva comisión verá los datos ya enviados; lo pendiente en el teléfono anterior no podrá sincronizarse. ¿Reasignar?`)) return
    rpc('reasignar_plan', { p_plan: p.id, p_comision: c.id }, `«${p.nombre}» reasignado a ${c.nombre}.`)
  }

  async function exportar(p: PlanDisponible) {
    setEstado('Preparando archivo…')
    try {
      const datos = await cargarDatosPlan(supabase, p)
      const { resultados, fotos } = construirExportacion(datos)
      const { nombre, bytes } = exportarPlan(datos)
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([bytes])), download: nombre })
      a.click(); URL.revokeObjectURL(a.href)
      setEstado(`${nombre}: ${resultados.length} filas in situ (${resultados.filter((r) => r['Valor'] === null).length} sin medir), ${fotos.length} fotos, ${resultados.filter((r) => r['Marcada'] === 'Si').length} mediciones marcadas.`)
    } catch (e) { setEstado(`No se pudo exportar: ${(e as Error).message}`) }
  }

  return (
    <section>
      <h2>Planes</h2>
      {estado && <p role="status">{estado}</p>}
      <div className="tabla"><table>
        <thead><tr><th>Plan</th><th>Comisión</th><th>Acciones</th></tr></thead>
        <tbody>
          {planes.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{nombreDe(p.comision_id)}</td>
              <td><div className="acciones">
                <button onClick={() => exportar(p)}>Exportar</button>
                {p.comision_id && <button className="secundario" onClick={() => liberar(p)}>Liberar</button>}
                <select value={destino[p.id] ?? ''} onChange={(e) => setDestino({ ...destino, [p.id]: e.target.value })} aria-label={`Comisión para ${p.nombre}`}>
                  <option value="">Reasignar a…</option>
                  {comisiones.filter((c) => c.id !== p.comision_id).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button className="secundario" disabled={!destino[p.id]} onClick={() => reasignar(p)}>Reasignar</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </section>
  )
}
