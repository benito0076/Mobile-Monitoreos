import type { Gps } from './db-local'

/** Una lectura de alta precisión; null si no hay permiso, señal o se agota el tiempo. */
export function leerGps(esperaMs = 15000): Promise<Gps | null> {
  return new Promise((ok) => {
    if (!navigator.geolocation) return ok(null)
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, precision_m: p.coords.accuracy }),
      () => ok(null),
      { enableHighAccuracy: true, timeout: esperaMs, maximumAge: 0 },
    )
  })
}
