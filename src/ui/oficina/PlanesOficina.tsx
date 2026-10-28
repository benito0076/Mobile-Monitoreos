import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { Mensaje } from '../Mensaje'
import { planesVisibles, type PlanDisponible } from '../../datos/planes'
import { listarPerfiles, type Perfil } from '../../datos/usuarios'
import { cargarDatosPlan } from '../../datos/exportar-datos'
import { construirExportacion, exportarPlan } from '../../exportar/exportador'
import type { FichaCustodia } from '../../exportar/custodia-pdf'

const CAMPOS_FICHA: [keyof FichaCustodia, string][] = [
  ['cliente', 'Nombre del cliente'], ['codigo_muestreo', 'Código del muestreo'], ['cotizacion', 'Número de cotización'], ['municipio', 'Municipio/Ciudad'], ['departamento', 'Departamento'],
]
const descargar = (blob: Blob, nombre: string) => {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: nombre })
  a.click(); URL.revokeObjectURL(a.href)
}

export function PlanesOficina() {
  const [planes, setPlanes] = useState<PlanDisponible[]>([])
  const [comisiones, setComisiones] = useState<Perfil[]>([])
  const [destino, setDestino] = useState<Record<string, string>>({})
  const [estado, setEstado] = useState('')
  const [editando, setEditando] = useState<string | null>(null) // plan cuyos datos de custodia se editan
  const [ficha, setFicha] = useState<FichaCustodia>({})

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

  function editarFicha(p: PlanDisponible) { setFicha(p.ficha ?? {}); setEditando(editando === p.id ? null : p.id) }

  async function guardarFicha(p: PlanDisponible) {
    const { error } = await supabase.from('planes').update({ ficha }).eq('id', p.id)
    setEstado(error ? `No se guardó: ${error.message}` : `Datos de custodia de «${p.nombre}» guardados.`)
    if (!error) { setEditando(null); cargar() }
  }

  async function custodia(p: PlanDisponible) {
    setEstado('Preparando cadena de custodia…')
    try {
      const [datos, plantilla] = await Promise.all([cargarDatosPlan(supabase, p), fetch('/fm-017.pdf').then((r) => { if (!r.ok) throw new Error('No se pudo leer la plantilla FM-017'); return r.arrayBuffer() })])
      const { armarCustodia, llenarCustodia } = await import('../../exportar/custodia-pdf') // pdf-lib solo se baja al generar el PDF
      const bytes = await llenarCustodia(plantilla, armarCustodia(datos, p.ficha))
      descargar(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${p.nombre.replace(/[^\w-]+/g, '_')}_FM-017.pdf`)
      setEstado(`Cadena de custodia de «${p.nombre}» generada (${datos.muestras.length} muestras).`)
    } catch (e) { setEstado(`No se pudo generar: ${(e as Error).message}`) }
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
      <Mensaje texto={estado} cerrar={() => setEstado('')} />
      <div className="tabla"><table>
        <thead><tr><th>Plan</th><th>Comisión</th><th>Acciones</th></tr></thead>
        <tbody>
          {planes.flatMap((p) => [
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{nombreDe(p.comision_id)}</td>
              <td><div className="acciones">
                <button onClick={() => exportar(p)}>Exportar</button>
                <button className="secundario" onClick={() => custodia(p)}>Cadena de custodia</button>
                <button className="secundario" onClick={() => editarFicha(p)}>Datos de custodia</button>
                {p.comision_id && <button className="secundario" onClick={() => liberar(p)}>Liberar</button>}
                <select value={destino[p.id] ?? ''} onChange={(e) => setDestino({ ...destino, [p.id]: e.target.value })} aria-label={`Comisión para ${p.nombre}`}>
                  <option value="">Reasignar a…</option>
                  {comisiones.filter((c) => c.id !== p.comision_id).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button className="secundario" disabled={!destino[p.id]} onClick={() => reasignar(p)}>Reasignar</button>
              </div></td>
            </tr>,
            editando === p.id && (
              <tr key={`${p.id}-ficha`}><td colSpan={3}>
                <div className="acciones">
                  {CAMPOS_FICHA.map(([k, etiqueta]) => (
                    <label key={k}>{etiqueta} <input value={ficha[k] ?? ''} onChange={(e) => setFicha({ ...ficha, [k]: e.target.value })} /></label>
                  ))}
                  <button onClick={() => guardarFicha(p)}>Guardar</button> <button className="secundario" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
                <small>El nombre del proyecto es el nombre del plan. Si dejas vacío el código del muestreo se toma del nombre del plan (p. ej. 1128-26).</small>
              </td></tr>
            ),
          ])}
        </tbody>
      </table></div>
    </section>
  )
}
