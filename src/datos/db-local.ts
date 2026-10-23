import Dexie, { type Table } from 'dexie'

export interface PlanLocal { id: string; nombre: string; comision_id: string; descargado_en: string }
export interface MuestraLocal {
  id: string; plan_id: string; codigo: string; punto_texto: string; punto_codigo: string | null
  tipo: string | null; matriz: string | null; submatriz: string | null; fecha_planeada: string | null; estado: string
}
export interface MuestraParametroLocal { id: string; muestra_id: string; parametro: string; es_insitu: boolean }
export interface ParametroInsitu { nombre: string; unidad: string; minimo: number | null; maximo: number | null; obligatorio: boolean }
export interface ConfigLocal { clave: string; valor: number }

class BaseLocal extends Dexie {
  planes!: Table<PlanLocal, string>
  muestras!: Table<MuestraLocal, string>
  muestraParametros!: Table<MuestraParametroLocal, string>
  parametrosInsitu!: Table<ParametroInsitu, string>
  config!: Table<ConfigLocal, string>

  constructor() {
    super('monitoreos')
    this.version(1).stores({
      planes: 'id',
      muestras: 'id, plan_id, codigo',
      muestraParametros: 'id, muestra_id',
      parametrosInsitu: 'nombre',
      config: 'clave',
    })
  }
}

export const local = new BaseLocal()
