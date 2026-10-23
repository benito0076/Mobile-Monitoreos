import Dexie, { type Table } from 'dexie'

export interface PlanLocal { id: string; nombre: string; comision_id: string; descargado_en: string }
export interface MuestraLocal {
  id: string; plan_id: string; codigo: string; punto_texto: string; punto_codigo: string | null
  tipo: string | null; matriz: string | null; submatriz: string | null; fecha_planeada: string | null; estado: string
  estado_pendiente?: number // 1 = el cambio de estado aún no llegó al servidor
}
export interface MuestraParametroLocal { id: string; muestra_id: string; parametro: string; es_insitu: boolean }
export interface ParametroInsitu { nombre: string; unidad: string; minimo: number | null; maximo: number | null; obligatorio: boolean }
export interface Gps { lat: number; lon: number; precision_m: number }

// Los campos coinciden con las columnas del servidor para poder enviarlos tal cual (sin `sincronizado`).
export interface MedicionLocal {
  id: string; muestra_id: string; parametro: string; valor: string; unidad: string
  hora_telefono: string; desfase_reloj_s: number | null
  lat: number | null; lon: number | null; precision_m: number | null
  usuario_id: string; equipo_id: string; version_app: string
  version: number; reemplaza_a: string | null; motivo_correccion: string | null
  sincronizado: number // 0 pendiente, 1 confirmado por el servidor
  error_sync?: string // último rechazo del servidor para este registro
}
export interface DescripcionLocal {
  id: string; muestra_id: string; texto: string; hora_telefono: string; usuario_id: string
  version: number; reemplaza_a: string | null; motivo_correccion: string | null; sincronizado: number; error_sync?: string
}
export interface FotoLocal {
  id: string; muestra_id: string; ruta_storage: string; blob: Blob
  hora_telefono: string; lat: number | null; lon: number | null; usuario_id: string; sincronizado: number; error_sync?: string
}
export interface ConfigLocal { clave: string; valor: number }

class BaseLocal extends Dexie {
  planes!: Table<PlanLocal, string>
  muestras!: Table<MuestraLocal, string>
  muestraParametros!: Table<MuestraParametroLocal, string>
  parametrosInsitu!: Table<ParametroInsitu, string>
  config!: Table<ConfigLocal, string>
  mediciones!: Table<MedicionLocal, string>
  descripciones!: Table<DescripcionLocal, string>
  fotos!: Table<FotoLocal, string>
  meta!: Table<{ clave: string; valor: unknown }, string>

  constructor() {
    super('monitoreos')
    this.version(1).stores({
      planes: 'id',
      muestras: 'id, plan_id, codigo',
      muestraParametros: 'id, muestra_id',
      parametrosInsitu: 'nombre',
      config: 'clave',
    })
    this.version(2).stores({
      mediciones: 'id, muestra_id, [muestra_id+parametro], sincronizado',
      descripciones: 'id, muestra_id, sincronizado',
      fotos: 'id, muestra_id, sincronizado',
      meta: 'clave',
    })
  }
}

export const local = new BaseLocal()

export const metaGet = async <T>(clave: string) => (await local.meta.get(clave))?.valor as T | undefined
export const metaSet = (clave: string, valor: unknown) => local.meta.put({ clave, valor })

/** Identificador estable de este teléfono (se genera una vez). */
export async function equipoId() {
  let id = await metaGet<string>('equipo_id')
  if (!id) await metaSet('equipo_id', (id = crypto.randomUUID()))
  return id
}
