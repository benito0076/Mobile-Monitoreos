// Preservación, recipiente y volumen de cada parámetro, tomados de AT-002 v03 (fisicoquímicos), AT-003 v04 (subcontratados)
// y del PDT de referencia (FM-081). Sirve para llenar la tabla «Parámetros punto» del PDT.
// Si cambian los AT basta con editar GRUPOS (datos) o REGLAS (qué parámetro va a qué grupo; la primera que coincida gana).

export type Bloque = 'fisicoquimico' | 'hidrobiologico'
export interface Grupo { bloque: Bloque; grupo: string; minimo: string; preservante: string; material: string; observaciones: string }
export interface FilaPdt { parametros: string[]; grupo: string; minimo: string; preservante: string; material: string; observaciones: string }

const FRIO = 'Refrigerar a < 6°C'
const SUB = (lab: string) => `${FRIO} · Subcontratado: ${lab}`
const fq = (grupo: string, minimo: string, preservante: string, material: string, observaciones = FRIO): Grupo =>
  ({ bloque: 'fisicoquimico', grupo, minimo, preservante, material, observaciones })
const hb = (grupo: string, minimo: string, preservante: string, material: string, observaciones = 'Refrigeración y envío oportuno'): Grupo =>
  ({ bloque: 'hidrobiologico', grupo, minimo, preservante, material, observaciones })

const TRANSEAU = 'Solución Transeau cercano al 10% del remanente filtrado y 5 gotas de lugol por cada 50 mililitros de muestra.'

// El orden de las claves es el orden de las filas en el PDT.
export const GRUPOS: Record<string, Grupo> = {
  METALES: fq('METALES', '500', 'Acidificar a pH < 2 con HNO3', 'Plástico'),
  METALES_DISUELTOS: fq('METALES DISUELTOS', '500', 'Filtrar en campo (0,45 µm) y acidificar con HNO3 a pH < 2', 'Plástico'),
  VARIOS: fq('VARIOS', '2000', 'N/A', 'Plástico'),
  DBO5: fq('DBO5', '1000', 'N/A', 'Plástico', `${FRIO} · Sin espacio de aire`),
  DQO: fq('DQO', '2000', 'H2SO4 a pH < 2', 'Plástico'),
  SS: fq('SS', '1000', 'N/A', 'Plástico'),
  ORTOFOSFATOS: fq('ORTOFOSFATOS', '250', 'Filtración en campo', 'Vidrio ámbar'),
  FOSFORO: fq('FÓSFORO', '500', 'H2SO4 a pH < 2', 'Vidrio ámbar'),
  FOSFORO_ORGANICO: fq('FÓSFORO ORGÁNICO', '1000', 'Un envase sin preservar y otro con H2SO4 a pH < 2', 'Vidrio (fósforo reactivo) y plástico o vidrio (fósforo total)'),
  COT: fq('COT', '250', 'H2SO4 a pH < 2', 'Vidrio'),
  FENOLES: fq('FENOLES', '500', 'H2SO4 a pH < 2', 'Vidrio'),
  ACEITES_GRASAS: fq('ACEITES Y GRASAS', '1000', 'H2SO4 o HCl a pH < 2', 'Vidrio boca ancha'),
  CROMO_VI: fq('CROMO HEXAVALENTE', '500', 'pH 9,3 a 9,7 con buffer de sulfato de amonio', 'Plástico boca ancha'),
  SULFUROS: fq('SULFUROS', '250', 'Acetato de zinc 2N (4 gotas por cada 100 mL) y NaOH 6N a pH > 9', 'Vidrio ámbar'),
  MICROBIOLOGICOS: fq('MICROBIOLOGICOS', '200', 'N/A', 'Frasco estéril de 250 mL o 2 bolsas estériles de 100 mL', 'Refrigerar a < 10°C'),
  HAPS: fq('HAPs', '1000', 'N/A (con cloro residual: 0,8 mL de tiosulfato de sodio al 10 %)', 'Vidrio ámbar'),
  // Subcontratados (AT-003)
  BTEX: fq('BTEX', '100', 'Adicionar 0,4 mL de HCl a pH < 2', 'Vidrio ámbar o claro protegido de la luz, sin espacio de cabeza ni burbujas', SUB('HIDROLAB')),
  COV: fq('COMPUESTOS ORGÁNICOS VOLÁTILES', '120', 'N/A', 'Vidrio ámbar o claro protegido de la luz, sin espacio de aire', SUB('CHEMILAB')),
  ORGANICOS_NO_HALOGENADOS: fq('COMPUESTOS ORGÁNICOS NO HALOGENADOS', '1000', 'N/A', 'Vidrio ámbar o claro protegido de la luz, tapa cubierta con papel aluminio', SUB('SGI')),
  FENOLICOS_SUB: fq('COMPUESTOS FENÓLICOS', '1000', 'N/A', 'Vidrio ámbar con gorro de papel aluminio', SUB('HIDROLAB')),
  CIANURO: fq('CIANURO', '500', '1 mL de NaOH hasta pH > 12', 'Plástico o vidrio', `${FRIO} en la oscuridad · Subcontratado: WR`),
  AOX: fq('AOX', '1000', '2 mL de HNO3 por litro, sin burbuja', 'Plástico o vidrio ámbar con tapa PTFE', 'Refrigerar a ≤ 6°C · Subcontratado: SERAMBIENTE'),
  FORMALDEHIDO: fq('FORMALDEHIDO', '500', 'N/A', 'Vidrio ámbar o plástico', 'Refrigerar a 4 ± 2 °C · Subcontratado: HIDROLAB'),
  PCBS: fq('PCBs', '500', 'N/A', 'Vidrio ámbar o claro protegido de la luz: 2 recipientes de 250 mL llenos', SUB('AGQ')),
  PESTICIDAS: fq('PESTICIDAS', '1000', 'N/A', 'Vidrio ámbar con gorro de papel aluminio', `${FRIO} (muestra puntual) · Subcontratado: HIDROLAB`),
  TRIHALOMETANOS: fq('TRIHALOMETANOS', '80', 'H2SO4 hasta pH < 2', 'Vidrio ámbar o claro protegido de la luz: 2 recipientes de 40 mL llenos', SUB('SERAMBIENTE')),
  HIDROCARBUROS_RANGO: fq('HIDROCARBUROS DRO/GRO', '1000', 'N/A', 'Vidrio ámbar o claro protegido de la luz, lleno hasta el tope', SUB('WR')),
  SALINIDAD: fq('SALINIDAD', '250', 'N/A', 'Vidrio ámbar o claro protegido de la luz', SUB('CHEMILAB')),
  HELMINTOS: fq('HUEVOS DE HELMINTO', '2000', 'N/A', 'Plástico', SUB('HIDROLAB')),
  SALMONELLA: fq('SALMONELLA', '1000', 'N/A', 'Plástico estéril (otro igual para el duplicado)', SUB('HIDROLAB')),
  POR_DEFINIR: fq('POR DEFINIR', 'Por definir', 'Por definir', 'Por definir', 'Por definir'),
  // Hidrobiológicos (AT-002 y PDT de referencia)
  ICTIOPLANCTON: hb('PECES', 'Entre 250 y 500', 'Formol al 10%, agregando entre 50 y 60 mL por muestra de 500 mL; si hay mucha materia orgánica, agregar 2 g de rosa de bengala por cada 500 mL de muestra.', 'Frasco de vidrio ó plástico boca ancha'),
  BENTOS: hb('BENTOS', 'Entre 250 y 500', 'Etanol al 70%.', 'Bolsa hermética, frasco de vidrio o plástico boca ancha entre 250 y 500 mL'),
  PECES: hb('PECES', 'N/A', 'N/A', 'N/A', 'N/A'),
  PERIFITON: hb('PERIFITON', '60', TRANSEAU, 'Vidrio ámbar'),
  FITOPLANCTON: hb('FITOPLANCTON', '60', TRANSEAU, 'Vidrio ámbar'),
  ZOOPLANCTON: hb('ZOOPLANCTON', 'Por definir', 'Trazas de bórax (2 g por cada 100 mL de muestra) y, a los 30 minutos, etanol al 70% o solución Transeau hasta el 10% del material filtrado.', 'Vidrio ámbar o plástico'),
  MACROFITAS: hb('MACRÓFITAS', 'N/A', 'N/A', 'Prensa', 'Se trae bajo prensa si aplica'),
  CLOROFILA: hb('CLOROFILA A', '2000', 'N/A', 'Plástico o vidrio protegido de la luz', 'Refrigerar a < 6°C, protegido de la luz · Traer un duplicado diario'),
}

const METALES = ['aluminio', 'antimonio', 'arsenico', 'bario', 'berilio', 'boro', 'cadmio', 'calcio', 'cobalto', 'cobre', 'cromo', 'estano', 'estroncio', 'hierro',
  'litio', 'magnesio', 'manganeso', 'mercurio', 'molibdeno', 'niquel', 'plata', 'plomo', 'potasio', 'selenio', 'sodio', 'titanio', 'vanadio', 'zinc']
const ELEMENTO = `\\b(${METALES.join('|')})\\b`

const REGLAS: [RegExp, string][] = [
  [/ictioplancton/, 'ICTIOPLANCTON'], [/bentic|bentos|benton|macroinvertebrado/, 'BENTOS'], [/ictiofauna|\bpeces\b/, 'PECES'],
  [/perifiton/, 'PERIFITON'], [/fitoplancton/, 'FITOPLANCTON'], [/zooplancton/, 'ZOOPLANCTON'], [/macrofit|neuston/, 'MACROFITAS'], [/clorofila/, 'CLOROFILA'],
  [/btex/, 'BTEX'], [/organicos volatiles/, 'COV'], [/semivolatiles|no halogenados/, 'ORGANICOS_NO_HALOGENADOS'],
  [/aromaticos policiclicos|\bhaps?\b|naftaleno/, 'HAPS'], [/compuestos fenolicos/, 'FENOLICOS_SUB'], [/fenol/, 'FENOLES'],
  [/cianuro/, 'CIANURO'], [/\baox\b|halogenos adsorbibles/, 'AOX'], [/formaldeh/, 'FORMALDEHIDO'], [/\bpcbs?\b|bifenil/, 'PCBS'],
  [/plaguicida|pesticida|organoclorad|organofosforad/, 'PESTICIDAS'], [/trihalometano/, 'TRIHALOMETANOS'],
  [/hidrocarburos.*(rango|dro|gro)|\b(dro|gro)\b/, 'HIDROCARBUROS_RANGO'], [/salinidad/, 'SALINIDAD'], [/helminto/, 'HELMINTOS'], [/salmonella/, 'SALMONELLA'],
  [/dbo/, 'DBO5'], [/dqo|demanda quimica|nitrogeno amoniacal|^amonio|kjeldahl|nitrogeno total|dureza/, 'DQO'],
  [/solidos sedimentables/, 'SS'], [/fosforo reactivo|ortofosfato/, 'ORTOFOSFATOS'], [/fosforo organico/, 'FOSFORO_ORGANICO'], [/fosforo/, 'FOSFORO'],
  [/aceites y grasas|grasas|hidrocarburos/, 'ACEITES_GRASAS'], [/cromo hexavalente/, 'CROMO_VI'], [/sulfuros/, 'SULFUROS'], [/carbono organico/, 'COT'],
  [/coliformes|e\.? ?coli|escherichia/, 'MICROBIOLOGICOS'],
  [/adsorcion de sodio|\bras\b|carbonato de sodio/, 'VARIOS'], // antes de metales: contienen «sodio»
  [new RegExp(`${ELEMENTO}.*disuelt|disuelt.*${ELEMENTO}`), 'METALES_DISUELTOS'],
  [new RegExp(`${ELEMENTO}|\\bicp\\b|llama`), 'METALES'],
  [/turbi|nitrit|nitrat|color|surfactante|acidez|alcalinidad|solidos|cloruro|sulfato|silice|fluoruro/, 'VARIOS'],
]

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/^\s*agua\s*-\s*/, '').replace(/\s+/g, ' ').trim()

export function claveDe(parametro: string): string {
  const n = normalizar(parametro)
  return REGLAS.find(([r]) => r.test(n))?.[1] ?? 'POR_DEFINIR'
}

/** «Agua - Cromo ICP» → «Cromo»; «AGUA - COMPUESTOS FENÓLICOS (BIOPOLAB)» → «Compuestos fenólicos». */
export function nombreCorto(parametro: string): string {
  let n = parametro.replace(/^\s*agua\s*-\s*/i, '')
    .replace(/\(([^a-záéíóúñ)]*)\)/g, ' ').replace(/\(pot-sup\)/gi, ' ') // quita etiquetas de laboratorio: (WR), (BIOPOLAB), (POT-SUP)
    .replace(/\s+(ICP|RB|Rango bajo|por llama)\b/gi, '').replace(/\s+/g, ' ').trim()
  if (n === n.toUpperCase() && (n.includes(' ') || n.length >= 7)) n = n.charAt(0) + n.slice(1).toLowerCase() // las siglas (DQO, AOX) se dejan
  return n
}

/** Agrupa los parámetros por grupo de preservación; una fila del PDT por grupo, en el orden de GRUPOS. */
export function agruparParametros(parametros: string[]): { fisicoquimicos: FilaPdt[]; hidrobiologicos: FilaPdt[] } {
  const porClave = new Map<string, Set<string>>()
  for (const p of parametros) {
    const k = claveDe(p)
    if (!porClave.has(k)) porClave.set(k, new Set())
    porClave.get(k)!.add(nombreCorto(p))
  }
  const filas = Object.keys(GRUPOS).filter((k) => porClave.has(k)).map((k): FilaPdt & { bloque: Bloque } => {
    const { bloque, ...g } = GRUPOS[k]
    return { bloque, ...g, parametros: [...porClave.get(k)!].sort((a, b) => a.localeCompare(b, 'es')) }
  })
  const quitar = ({ bloque: _, ...f }: FilaPdt & { bloque: Bloque }): FilaPdt => f
  return {
    fisicoquimicos: filas.filter((f) => f.bloque === 'fisicoquimico').map(quitar),
    hidrobiologicos: filas.filter((f) => f.bloque === 'hidrobiologico').map(quitar),
  }
}
