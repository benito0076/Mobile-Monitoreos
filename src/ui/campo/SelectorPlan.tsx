import type { PlanLocal } from '../../datos/db-local'

export type PlanConConteo = PlanLocal & { n: number }

/** Plan activo entre los descargados en el teléfono, y acceso a descargar otros (requiere conexión). */
export function SelectorPlan({ planes, activo, cambiar, masPlanes }: {
  planes: PlanConConteo[]; activo?: string; cambiar: (id: string) => void; masPlanes: () => void
}) {
  return (
    <div className="selector-plan">
      {planes.length > 1 && (
        <label>Plan en uso
          <select value={activo} onChange={(e) => cambiar(e.target.value)}>
            {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({p.n} muestras)</option>)}
          </select>
        </label>
      )}
      <button className="secundario" onClick={masPlanes}>Ver o descargar otros planes</button>
    </div>
  )
}
