import { useEffect, useMemo, useState } from 'react'
import { liveQuery } from 'dexie'
import { local, type MuestraLocal, type PlanLocal } from '../../datos/db-local'
import { esCompuesta } from '../../datos/mediciones'
import { itemsDe } from '../../datos/subparametros'
import { fechaEnvioPorMuestra, fechaLegible } from '../../datos/envios'
import { PanelEnvios } from '../envios/PanelEnvios'
import { fuenteLocal } from '../envios/fuentes'

interface Fila { m: MuestraLocal; hechas: number; total: number; alicuotas: number; envio?: string }

export function ListaMuestras({ plan, abrir, usuario }: { plan: PlanLocal; abrir: (id: string) => void; usuario: { id: string; nombre: string } }) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [verEnvios, setVerEnvios] = useState(false)
  const fuente = useMemo(() => fuenteLocal(plan, usuario.id, usuario.nombre), [plan.id, usuario.id, usuario.nombre])

  useEffect(() => {
    const sub = liveQuery(async () => {
      const muestras = await local.muestras.where('plan_id').equals(plan.id).sortBy('codigo')
      const ids = muestras.map((m) => m.id)
      if (!ids.length) return []
      const [parametros, medidas] = await Promise.all([
        local.muestraParametros.where('muestra_id').anyOf(ids).filter((p) => p.es_insitu).toArray(),
        local.mediciones.where('muestra_id').anyOf(ids).toArray(),
      ])
      const paramsPorMuestra = new Map<string, Set<string>>()
      for (const p of parametros) {
        if (!paramsPorMuestra.has(p.muestra_id)) paramsPorMuestra.set(p.muestra_id, new Set())
        paramsPorMuestra.get(p.muestra_id)!.add(p.parametro)
      }
      const enviadas = await fechaEnvioPorMuestra(plan.id)
      return muestras.map((m) => {
        const insituSet = new Set(itemsDe([...(paramsPorMuestra.get(m.id) ?? [])]).map((i) => i.nombre)) // con las lecturas de los parámetros de varias lecturas
        const medMuestra = medidas.filter((x) => x.muestra_id === m.id && insituSet.has(x.parametro))
        return {
          m,
          total: insituSet.size,
          hechas: new Set(medMuestra.map((x) => x.parametro)).size,
          alicuotas: new Set(medMuestra.filter((x) => x.alicuota).map((x) => x.alicuota)).size,
          envio: enviadas.get(m.id),
        }
      })
    }).subscribe((f) => setFilas(f))
    return () => sub.unsubscribe()
  }, [plan.id])

  const q = busqueda.trim().toLowerCase()
  const visibles = filas.filter(({ m }) =>
    (filtroEstado === 'todos' || m.estado === filtroEstado) &&
    (!q || m.codigo.toLowerCase().includes(q) || m.punto_texto.toLowerCase().includes(q)))

  return (
    <section>
      <h2>{plan.nombre}</h2>
      <button className="secundario" onClick={() => setVerEnvios((v) => !v)}>{verEnvios ? 'Ocultar envíos' : 'Envíos al laboratorio'}</button>
      {verEnvios && <PanelEnvios fuente={fuente} />}
      {filas.length > 3 && (
        <div className="filtros-muestras">
          <input
            type="search"
            placeholder="Buscar por código o punto…"
            aria-label="Buscar muestra"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select aria-label="Filtrar por estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados ({filas.length})</option>
            <option value="pendiente">Pendientes ({filas.filter((f) => f.m.estado === 'pendiente').length})</option>
            <option value="en_campo">En campo ({filas.filter((f) => f.m.estado === 'en_campo').length})</option>
            <option value="cerrada">Cerradas ({filas.filter((f) => f.m.estado === 'cerrada').length})</option>
          </select>
        </div>
      )}
      <ul className="planes">
        {visibles.map(({ m, hechas, total, alicuotas, envio }) => (
          <li key={m.id}>
            <span><b>{m.codigo}</b> · {m.punto_texto}<br /><small><span className={`estado ${m.estado}`}>{m.estado.replace('_', ' ')}</span> · {esCompuesta(m) ? `${alicuotas} alícuota${alicuotas === 1 ? '' : 's'}` : `in situ ${hechas}/${total}`}{envio && <> · <b>enviada {fechaLegible(envio)}</b></>}</small></span>
            <button onClick={() => abrir(m.id)}>Abrir</button>
          </li>
        ))}
      </ul>
      {visibles.length === 0 && filas.length > 0 && <p>Ninguna muestra coincide con el filtro.</p>}
    </section>
  )
}
