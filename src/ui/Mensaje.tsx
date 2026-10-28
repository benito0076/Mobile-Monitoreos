/** Mensaje fijo en la parte baja de la pantalla: se ve sin desplazarse, junto a los botones que lo provocan. */
export function Mensaje({ texto, cerrar }: { texto: string; cerrar: () => void }) {
  if (!texto) return null
  return (
    <p role="status" className="toast">
      <span>{texto}</span>
      <button aria-label="Cerrar mensaje" onClick={cerrar}>×</button>
    </p>
  )
}
