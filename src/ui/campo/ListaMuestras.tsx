import { useEffect, useState } from 'react'
import { local, type MuestraLocal, type PlanLocal } from '../../datos/db-local'
import { esCompuesta } from '../../datos/mediciones'

interface Fila { m: MuestraLocal; hechas: number; total: number; alicuotas: number }

export function ListaMuestras({ plan, abrir }: { plan: PlanLocal; abrir: (id: string) => void }) {
  const [filas, setFilas] = useState<Fila[]>([])

  useEffect(() => {
    (async () => {
      const muestras = await local.muestras.where('plan_id').equals(plan.id).sortBy('codigo')
      const medidas = await local.mediciones.toArray()
      setFilas(await Promise.all(muestras.map(async (m) => ({
        m,
        total: await local.muestraParametros.where('muestra_id').equals(m.id).filter((p) => p.es_insitu).count(),
        hechas: new Set(medidas.filter((x) => x.muestra_id === m.id).map((x) => x.parametro)).size,
        alicuotas: new Set(medidas.filter((x) => x.muestra_id === m.id && x.alicuota).map((x) => x.alicuota)).size,
      }))))
    })()
  }, [plan.id])

  return (
    <section>
      <h2>{plan.nombre}</h2>
      <ul className="planes">
        {filas.map(({ m, hechas, total, alicuotas }) => (
          <li key={m.id}>
            <span><b>{m.codigo}</b> · {m.punto_texto}<br /><small><span className={`estado ${m.estado}`}>{m.estado.replace('_', ' ')}</span> · {esCompuesta(m) ? `${alicuotas} alícuota${alicuotas === 1 ? '' : 's'}` : `in situ ${hechas}/${total}`}</small></span>
            <button onClick={() => abrir(m.id)}>Abrir</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
