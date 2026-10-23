import { useEffect, useState } from 'react'
import { local, type MuestraLocal, type PlanLocal } from '../../datos/db-local'

interface Fila { m: MuestraLocal; hechas: number; total: number }

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
      }))))
    })()
  }, [plan.id])

  return (
    <section>
      <h2>{plan.nombre}</h2>
      <ul className="planes">
        {filas.map(({ m, hechas, total }) => (
          <li key={m.id}>
            <span><b>{m.codigo}</b> · {m.punto_codigo ?? m.punto_texto}<br /><small>{m.estado} · in situ {hechas}/{total}</small></span>
            <button onClick={() => abrir(m.id)}>Abrir</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
