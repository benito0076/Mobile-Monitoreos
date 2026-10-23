import { useEffect, useState } from 'react'
import { supabase } from '../../datos/supabase'
import { planesVisibles, type PlanDisponible } from '../../datos/planes'
import { cargarDatosPlan } from '../../datos/exportar-datos'
import { construirExportacion, exportarPlan } from '../../exportar/exportador'

export function ExportarPlan() {
  const [planes, setPlanes] = useState<PlanDisponible[]>([])
  const [estado, setEstado] = useState('')

  useEffect(() => { planesVisibles(supabase).then(setPlanes).catch((e) => setEstado(e.message)) }, [])

  async function exportar(p: PlanDisponible) {
    setEstado('Preparando archivo…')
    try {
      const datos = await cargarDatosPlan(supabase, p)
      const { resultados, fotos } = construirExportacion(datos)
      const { nombre, bytes } = exportarPlan(datos)
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([bytes])), download: nombre })
      a.click(); URL.revokeObjectURL(a.href)
      const marcadas = resultados.filter((r) => r['Marcada'] === 'Si').length
      setEstado(`${nombre}: ${resultados.length} filas, ${fotos.length} fotos, ${marcadas} mediciones marcadas.`)
    } catch (e) { setEstado(`No se pudo exportar: ${(e as Error).message}`) }
  }

  return (
    <section>
      <h2>Exportar plan</h2>
      {estado && <p role="status">{estado}</p>}
      <ul className="planes">
        {planes.map((p) => (
          <li key={p.id}><span>{p.nombre}</span><button onClick={() => exportar(p)}>Exportar</button></li>
        ))}
      </ul>
    </section>
  )
}
