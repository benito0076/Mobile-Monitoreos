// Traduce el nombre de un parámetro de laboratorio a la columna del formato FM-017 (cadena de custodia).
// Los nombres vienen del plan (p. ej. «Agua - Cromo ICP»). Lo que no coincide con ninguna regla va a COLUMNA_POR_DEFECTO.
// Para cambiar la asignación basta con editar REGLAS (la primera que coincida gana).

export const COLUMNAS = [
  'PERIFITON', 'ZOOPLANCTON', 'FITOPLANCTON', 'BENTOS', 'PECES', 'CLOROFILA A', 'OTROS HIDRO',
  'E. coli', 'COLIFORMES TOTALES', 'COLIFORMES TERMOTOLERANTES', 'R. HETEROTROFOS',
  'DBO5', 'VARIOS', 'DQO', 'FOSFORO ORG.', 'ACEITES Y GRASAS', 'CROMO HEXAVALENTE', 'SULFUROS', 'METALES', 'METALES DISUELTOS',
  'HAPS', 'NITROGENO TOTAL', 'BTEX', 'COMPUESTOS FENO.', 'CIANUROS', 'FLUORUROS', 'AOX', 'FORMALDEHIDO', 'PCBS',
  'PESTICIDAS', 'TRIHALOMETANOS', 'OTROS', 'BLANCO',
] as const
export type Columna = (typeof COLUMNAS)[number]

export const COLUMNA_POR_DEFECTO: Columna = 'VARIOS'

const METALES = ['aluminio', 'antimonio', 'arsenico', 'bario', 'berilio', 'boro', 'cadmio', 'calcio', 'cobalto', 'cobre', 'cromo', 'estano', 'hierro',
  'litio', 'magnesio', 'manganeso', 'mercurio', 'molibdeno', 'niquel', 'plata', 'plomo', 'potasio', 'selenio', 'sodio', 'titanio', 'vanadio', 'zinc']

const REGLAS: [RegExp, Columna][] = [
  [/perifiton/, 'PERIFITON'], [/zooplancton/, 'ZOOPLANCTON'], [/fitoplancton/, 'FITOPLANCTON'], [/bentos|bentic|benton/, 'BENTOS'], [/\bpeces\b|ictio/, 'PECES'], [/macrofit/, 'OTROS HIDRO'], [/clorofila/, 'CLOROFILA A'],
  [/e\.? ?coli|escherichia/, 'E. coli'], [/termotolerantes/, 'COLIFORMES TERMOTOLERANTES'], [/coliformes totales/, 'COLIFORMES TOTALES'], [/heterotrof/, 'R. HETEROTROFOS'],
  [/dbo/, 'DBO5'], [/dqo/, 'DQO'], [/fosforo organico/, 'FOSFORO ORG.'], [/aceites y grasas/, 'ACEITES Y GRASAS'],
  [/cromo hexavalente/, 'CROMO HEXAVALENTE'], [/sulfuros/, 'SULFUROS'], [/metales? disueltos/, 'METALES DISUELTOS'],
  [new RegExp(`\\b(icp|llama)\\b|\\b(${METALES.join('|')})\\b`), 'METALES'],
  [/aromaticos policiclicos|\bhaps?\b/, 'HAPS'], [/nitrogeno total/, 'NITROGENO TOTAL'], [/btex/, 'BTEX'], [/fenol/, 'COMPUESTOS FENO.'],
  [/cianuro/, 'CIANUROS'], [/fluoruro/, 'FLUORUROS'], [/\baox\b/, 'AOX'], [/formaldeh/, 'FORMALDEHIDO'], [/\bpcbs?\b/, 'PCBS'],
  [/plaguicida|pesticida|organoclor|organofosfor/, 'PESTICIDAS'], [/trihalometano/, 'TRIHALOMETANOS'],
]

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function columnaDe(parametro: string): Columna {
  const n = normalizar(parametro)
  return REGLAS.find(([r]) => r.test(n))?.[1] ?? COLUMNA_POR_DEFECTO
}

/** Casillas del «Tipo de muestra» del encabezado según la submatriz del plan. */
export type Matriz = 'ARD' | 'ARnD' | 'A. SUP' | 'A. SUB' | 'A. POT' | 'PISCINA' | 'A. LLUVIA' | 'A. CRUDA' | 'SUELO' | 'SEDIMENTOS MARINOS' | 'SEDIMENTOS CONTINENTALES' | 'RESIDUOS' | 'OTRO'
export function matrizDe(matriz: string | null, submatriz: string | null): Matriz {
  const n = normalizar(`${submatriz ?? ''} ${matriz ?? ''}`)
  if (/residual.*no dom|industrial/.test(n)) return 'ARnD'
  if (/residual/.test(n)) return 'ARD'
  if (/superficial/.test(n)) return 'A. SUP'
  if (/subterranea/.test(n)) return 'A. SUB'
  if (/potable/.test(n)) return 'A. POT'
  if (/piscina/.test(n)) return 'PISCINA'
  if (/lluvia/.test(n)) return 'A. LLUVIA'
  if (/cruda/.test(n)) return 'A. CRUDA'
  if (/sedimento.*marin/.test(n)) return 'SEDIMENTOS MARINOS'
  if (/sedimento/.test(n)) return 'SEDIMENTOS CONTINENTALES'
  if (/suelo/.test(n)) return 'SUELO'
  if (/residuo/.test(n)) return 'RESIDUOS'
  return 'OTRO'
}

/** Fila del bloque de la muestra (Integrado, Compuesto, Puntual, Duplicado) según el tipo del plan. */
export function filaTipo(tipo: string | null): 0 | 1 | 2 | 3 {
  const n = normalizar(tipo ?? '')
  return /integrad/.test(n) ? 0 : /compuest/.test(n) ? 1 : /duplicad/.test(n) ? 3 : 2
}
