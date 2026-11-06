# active-memory handoff: Mobile-Monitoreos (PWA de campo de Ambienciq), PDT FM-081 e importación a Sampler

**Handoff #4** · 2026-11-06 · Lineage: #1 (2026-11-04): revisión de producción; CORS obligatorio y reporte de errores; arreglo del panel Envíos; PDT FM-081 de agua, suelo, sedimento y lodo; prueba en producción y limpieza de usuario de prueba; #2 (2026-11-04): `xlsx` corregido, PDT de agua potable (plan 1217-26) y CI con GitHub Actions; #3 (2026-11-04): regla de la dureza (Metales o DQO) y CI verificado sobre `main`; #4 (2026-11-06): guion de importación de resultados in situ a Sampler (borrador), conductividad compuesta in situ y caudal compuesto con volumen y tiempo (PR #13); protección de `main` pendiente (manual).

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** dejar el módulo Mobile (PWA offline de captura de campo para muestreo ambiental + panel de oficina, backend Supabase) listo para producción; que el PDT (Formato de planeación de monitoreos, FM-081) salga **sin errores de preservas y recipientes**; y que los resultados in situ que exporta la app entren **automáticamente a la base de datos de Sampler** con un guion de importación.
- **Done looks like:** el PDT generado coincide con lo que el laboratorio usa en la práctica (agua, suelo, sedimento, lodo); el guion de Sampler importa sin errores el Excel de in situ en una prueba real; pendientes de producción cerrados (queda el piloto en campo y la protección de `main`).
- **Context:** el laboratorio es AMBIENCIQ INGENIEROS S.A.S. (acreditado IDEAM, NTC-ISO/IEC 17025:2017). Interfaz y documentos en español (Colombia).

## 2. About the user (as relevant to this work)
- Dueño o responsable del módulo Mobile y del laboratorio; conoce AT-002/AT-003, el PDT, la acreditación y la configuración de Sampler (da los códigos de variables y nombres de parámetros). Escribe en español, respuestas cortas ("Haz el merge del PR #N", "Aprobado todo", "Dejalo así, está bien", "Si SUBM0").
- Herramientas: repo GitHub `benito0076/Mobile-Monitoreos`; Supabase (proyecto `ytcnnipltpfzagfuwtih`); Vercel (proyecto `mobile-monitoreos`, producción `https://mobile-monitoreos.vercel.app`); Sampler (sistema del laboratorio, base SQL Server, guiones en C#).
- Aporta documentos reales (acreditación, PDT en `.xlsm`, plan Excel, guion del ICP) y decide qué cambia y qué no; aprueba por bloques; a veces pide él mismo una regla nueva.

## 3. Style & communication
- **Language:** español (Colombia) en todo: respuestas, PRs, commits, textos de la app.
- **Tone:** directo, sin relleno.
- **Reply length:** corto; tablas para comparaciones; detalle largo solo cuando se pide un informe o análisis.
- **Formatting:** tablas y viñetas; comandos de terminal en bloque `bash` propio; enlaces a PR como `[owner/repo#N](url)`.
- **Working style:** hacer solo lo pedido; decir lo que no se pudo verificar (el guion de C# no se puede compilar ni probar contra Sampler desde aquí); antes de borrar o escribir en producción, mirar primero el objetivo; probar con el plan real cuando exista; proponer decisiones propias explícitas para que el usuario las confirme. Plugin "ponytail" activo por hook: código mínimo, explicaciones cortas. Compromiso propio de Claude: no inventar valores de preservas ni códigos de variables; lo no confirmado queda «Por definir» o «CONFIRMAR» y se pregunta. En agua, solo cambiar con petición o aprobación explícita del usuario.
- **Avoid:** cambiar agua por iniciativa propia; incluir laboratorios subcontratados; mergear sin que el usuario lo pida.

## 4. Hard rules (word for word)
1. "No tomes en cuenta los laboratorio subcontratados, esos suelen cambiar frecuentemente. No cambies nada en agua, la información que ya tienes es la actualizada"
2. "Solo cambias los dos que tenias por definir." (sobre suelo, al comparar con el PDT real de ECOPETROL)
3. "Para matriz sólida, cambias la etiqueta a g en vez de mL"
4. "Aceites y Grasas, refrigerado, sea para suelos, lodos o sedimentos"
5. "Prueba de infiltración si es una prueba In Situ, solo que por el momento no vamos a realizar esos registros mediante la App"
6. "Aprobado todo, Cloro con medición en campo, en mg/L, obligatorio, rango de 0 a 5" (E-Coli, tiosulfato solo en microbiología de agua potable y cloro residual in situ)
7. "Dejalo así, está bien" (sobre no agregar tiosulfato a otros parámetros: solo microbiología; HAPs ya traía el suyo)
8. Los merges los ordena el usuario con frases como "Haz el merge del PR #N"; sin esa orden no se mergea.
9. "Dado que la Dureza Total y la Dureza Cálcica pueden salir tanto del recipiente DQO, que del recipiente Metales, puedes establecer una regla que si, ya hay Metales, no se crea DQO para esos dos parámetros y vice versa?" (implementada)
10. "Haz el merge del PR #11, estoy de acuerdo con tus opiniones" (aprueba las decisiones propias de Claude sobre la dureza)
11. "Esos son para los parámetros puntuales" (sobre la tabla de variables de Sampler de la sección 8; los compuestos usan otras)
12. "Para Agua - Caudal Compuesto, se requiere HORA0 a HORA 24, Volumen0 a Volumen24 y Tiempo0 a Tiempo24. Así que tienes que ajustar la app también dado que requerimos registrar tiempo y volumen" (implementado en el PR #13)

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Reportó diferencias entre el código de agua y la tabla de agua del laboratorio y ofreció alinearlas; incluyó subcontratados en las tablas de suelo | "No tomes en cuenta los laboratorio subcontratados… No cambies nada en agua, la información que ya tienes es la actualizada" |
| 2 | Ofreció adoptar del PDT real de ECOPETROL también CIC/PSI/RAS, pH/CE, densidad real y aceites y grasas ambiente | "Solo cambias los dos que tenias por definir." |
| 3 | Dejó aceites y grasas en suelo a temperatura ambiente (tabla de suelo) | "Aceites y Grasas, refrigerado, sea para suelos, lodos o sedimentos" |
| 4 | Habló de la etiqueta «mL» sin decidir qué hacer con sólidos | "Para matriz sólida, cambias la etiqueta a g en vez de mL" |
| 5 | Propuso registrar «Prueba de infiltración» en los parámetros in situ del servidor | Es in situ, pero por ahora no se registra en la app |
| 6 | Ofreció agregar una nota de tiosulfato para otros parámetros (fenoles, etc.) | "Dejalo así, está bien" |

## 6. Decisions
| Decision | Why |
|---|---|
| CORS de `gestionar-usuarios`: sin `ALLOWED_ORIGIN` (o con `*`) la función no arranca; secreto `https://mobile-monitoreos.vercel.app` aplicado; función v5; probado en producción | Cerrar CORS abierto |
| Reporte de errores: tabla `errores_cliente` (migración 0015 aplicada; RLS: cada usuario inserta los suyos, solo oficina lee), `src/datos/errores.ts` (máx. 20 por sesión). Consulta: `select * from errores_cliente order by creado_en desc` | Visibilidad de fallos |
| Panel Envíos: clase `envios` + CSS acotado | La rejilla `.tarjeta.ancha` superponía el formulario |
| Agua, 4 parámetros: Sulfuro→SULFUROS; Nitrógeno orgánico→DQO; Bicarbonatos/carbonatos/hidróxidos→VARIOS; Conductividad (laboratorio)→VARIOS | Aprobado; Hoja2 lo confirma |
| Sólidos: enrutamiento por matriz de cada muestra (`tipoSolido`: texto «suelo», «sedimento» o «lodo»); grupos en gramos (`GRUPOS_SOLIDO`, `agruparSolidos` en `src/exportar/alistamiento.ts`); agua intacta | Antes caían en «por definir» o con preserva de agua |
| Etiqueta de cantidad (celda D de la fila de encabezado de `public/fm-081.xlsx`): solo sólidos → «(g)»; agua + sólidos → «(mL / g)»; solo agua → «(Unidad)» sin cambio | Orden del usuario |
| «Prueba de infiltración» (regex `infiltracion`) se lista in situ en el PDT, sin BD ni app | Orden del usuario |
| Sodio cambiable en fila propia; acidez, Al e H intercambiables en una fila; sedimento y lodo usan los grupos de Hoja5 | Recomendación aprobada; sedimento/lodo = supuesto |
| Agua potable: E-Coli con guion reconocido; si hay muestra potable, MICROBIOLOGICOS lleva `TIOSULFATO`; «Cloro Residual Libre In Situ» insertado en producción (mg/L, 0 a 5, obligatorio) y en `supabase/seed.sql` | Aprobado |
| `xlsx` 0.18.5 → 0.20.3 desde el CDN oficial de SheetJS; el lock fija el hash | Orden del usuario; el usuario habilitó `cdn.sheetjs.com` |
| CI en `.github/workflows/ci.yml` (trabajo «Tipos, tests y build» y trabajo «Migraciones y RLS (Postgres 16)», runner `ubuntu-24.04`); en cada PR y en cada push a `main` | Orden del usuario |
| Dureza (agua): con metales totales y sin otros parámetros DQO → en METALES; con otros DQO → en DQO; con ambos frascos → en DQO; solo dureza o con metales disueltos → en DQO. Volumen sin cambio | Petición del usuario; decisiones de Claude aprobadas |
| «Agua - Conductividad Eléctrica - Compuesto» registrada como in situ en producción (µS/cm, 0 a 100000, obligatorio) **en las dos escrituras** (un espacio y dos espacios antes de «Compuesto»), y en `supabase/seed.sql`; borrar la que no coincida con el plan de Sampler desde la pantalla de parámetros in situ de la oficina | El nombre exacto no se pudo verificar |
| **Caudal compuesto, app (PR #13):** cada alícuota de «Agua - Caudal Compuesto» pide **Volumen (L)** y **Tiempo (s)**; cada lectura es una medición normal con parámetro `Agua - Caudal Compuesto \| Volumen` / `\| Tiempo` (código en `src/datos/subparametros.ts`); la app muestra el caudal calculado (L/s = volumen / tiempo); el Excel exportado trae una fila por lectura y alícuota; el cierre exige cada lectura (parámetro obligatorio). **Sin cambios en la base de datos** (`mediciones.parametro` es texto libre). Los registros viejos de caudal compuesto con un solo valor no se convierten | Petición del usuario |
| Unidades confirmadas: volumen en L y tiempo en s; la hora de la alícuota es la de la lectura del volumen | "Si, confirmaado" |
| Guion de importación a Sampler: borrador `Guion_InSitu.txt` (ver sección 8 y 13); modo simulación activado por defecto (`SOLO_SIMULAR = true`) | Aún sin probar contra Sampler |
| `usuario_prueba_2` eliminado de Supabase; perfiles = 5 | Orden del usuario |
| PRs mergeados como squash: #3, #4, #5, #6, #7, #9, #10, #11, #13. `main` en `49fdd3f`. PRs de handoff #8 y #12 cerrados sin mergear | Órdenes del usuario |

## 7. Changed / rejected
- Mi propuesta de preservas para sólidos (basada en normas) → reemplazada por las tablas y PDT reales del laboratorio.
- Aceites y grasas en suelo a temperatura ambiente → refrigerado (4 ± 2 °C).
- Bases cambiables, acidez, Al e H como «por definir» → agrupados.
- `xlsx` 0.18.5 → 0.20.3. Runner del CI `ubuntu-latest` → `ubuntu-24.04` (el primero ya es 26.04 y no trae Postgres 16).
- Dureza total y cálcica: siempre en DQO → con Metales si hay metales totales y no hay otros DQO.
- Caudal compuesto como un solo valor en L/s → dos lecturas (volumen y tiempo) por alícuota.
- Guion de Sampler con una sola variable («CON», como el ICP) → una variable por parámetro (puntuales) o prefijo + número de alícuota (compuestos).
- Handoffs #1 y #3 no se mergearon (PR #8 y #12 cerrados); el PR #11 nació como PR de handoff y pasó a ser el de la dureza.
- ❌ Cambios en agua por iniciativa propia; ❌ subcontratados en tablas de suelo; ❌ adoptar valores del PDT real para CIC/PSI/RAS, pH/CE y densidad real; ❌ registrar «Prueba de infiltración» en los parámetros in situ del servidor; ❌ tiosulfato en otros parámetros; ❌ reemplazar `xlsx` por un fork de terceros; ❌ force-push (lo bloquea el sistema).
- ❌ Que Claude active la protección de `main`: las herramientas de GitHub de la sesión no permiten cambiar protecciones ni rulesets (no usar `gh` para eso).

## 8. Data & facts (exact)

**Grupos de sólidos en el PDT** (GRUPO · cantidad · PRESERVANTE · RECIPIENTE · OBSERVACIONES):
| Grupo | Cantidad | Preservante | Recipiente | Observaciones |
|---|---|---|---|---|
| SUELO · GENERAL (pH, conductividad, humedad, CIC, PSI, RAS, densidad real, porosidad, textura y metales propios) | 300-500 g | Temperatura ambiente, entregar lo antes posible | Bolsa ziploc | Máximo 30 días |
| SUELO · DENSIDAD APARENTE | Anillos de 5x5 cm | Temperatura ambiente, entregar lo antes posible | Anillos de 5x5 cm | Muestra inalterada, recubierta con papel vinipel · Máximo 30 días |
| SUELO · ACEITES Y GRASAS / HIDROCARBUROS | 100 g | Refrigerar a 4 ± 2 °C | Frasco de vidrio boca ancha | Máximo 30 días |
| SUELO · MICROBIOLÓGICOS | 100 g | Refrigerar a < 10 °C | Frasco de vidrio boca ancha estéril | Analizar lo antes posible · Máximo 24 h |
| SUELO · CALCIO / MAGNESIO / POTASIO INTERCAMBIABLE (una fila por elemento) | 100 g | Refrigerar a < 10 °C | Frasco de vidrio | Refrigerar a < 10 °C |
| SUELO · SODIO CAMBIABLE | 100 g | Refrigerar a < 10 °C | Frasco de vidrio | Refrigerar a < 10 °C |
| SUELO · ACIDEZ, ALUMINIO E HIDRÓGENO INTERCAMBIABLES | 100 g | Refrigerar a < 10 °C | Frasco de vidrio o bolsa hermética | Refrigerar a < 10 °C · Un solo recipiente para los tres |
| SUELO · FÓSFORO Y NITRÓGENO TOTAL | 2000 g | Temperatura ambiente | Bolsa hermética | Entregar lo antes posible |
| SEDIMENTO Y LODO · ACEITES Y GRASAS / HIDROCARBUROS | Por definir | Refrigerar a 4 ± 2 °C | Vidrio con tapa forrada de PTFE | Máximo 28 días |
| SEDIMENTO Y LODO · MICROBIOLÓGICOS | Por definir | Refrigerar a 2-5 °C | Vidrio estéril | Máximo 6 h |
| SEDIMENTO · AGUA DE PORO | Mínimo 5 kg | Refrigerar a 4 ± 2 °C | Bolsas ziploc | Máximo 8 días |

**Metales propios en suelo** (→ SUELO · GENERAL): aluminio, antimonio, bario, cadmio, cobre, cromo, hierro, magnesio, manganeso, mercurio, níquel, plata, plomo, potasio, sodio, vanadio, zinc. **Quedan «POR DEFINIR»:** subcontratados (fluoruros, nitritos, nitratos, DQO, Kjeldahl, cianuro; metales arsénico, selenio, litio, berilio, estaño, calcio, boro, cobalto); «Bases cambiables» sin elemento; granulometría; metales y demás parámetros de sedimento y lodo. «Sodio intercambiable» a secas = PSI → SUELO · GENERAL.

**Agua potable:** `TIOSULFATO` = «Refrigerar a < 10 °C · Agua potable: 5 gotas de tiosulfato de sodio al 3%» (solo MICROBIOLOGICOS con muestra potable). HAPs ya traía el suyo. **Dureza (agua):** frascos DQO («H2SO4 a pH < 2», plástico, 2000 mL en el código) y METALES («Acidificar a pH < 2 con HNO3», plástico, 500 mL); Hoja2 pide 300 mL para dureza total y 500 mL para cálcica.

**Parámetros in situ en producción (13, `parametros_insitu`):** Agua - Caudal > 2 m3/s y < 10 m3/s; Agua - Caudal Compuesto (L/s, obligatorio; ahora se mide como volumen y tiempo); Agua - Conductividad a 25°C In Situ - Puntual; **Agua - Conductividad Eléctrica - Compuesto** (µS/cm, 0-100000, obligatorio) **y su variante con dos espacios**; Agua - Oxígeno Disuelto ; Agua - pH Compuesto; Agua - Sólidos Sedimentables - Compuesto; Agua - Temperatura ; Agua - Temperatura - Compuesto; Agua - Temperatura en la zona de mezcla térmica; pH; Cloro Residual Libre In Situ (mg/L, 0-5, obligatorio). Ojo: en `supabase/seed.sql` «Agua - Caudal Compuesto» figura con unidad vacía y no obligatorio, distinto de producción (L/s, obligatorio).

**IMPORTACIÓN A SAMPLER (guion del ICP `Guion_ICP.txt`, C#):**
- Flujo: lee un archivo de **texto separado por «;»** (`StreamReader`; `using ExcelDataReader` está declarado pero no se usa); el código de muestra identifica la muestra; controles de calidad por prefijo del código (BM, DM, MFL, LCM, BCI, BCC, VCI, VCC, ECL, EI, BFL); valores con «.» → «,»; la columna de valores es la de encabezado `ExtCal.Average`.
- Procedimientos almacenados (reutilizados sin cambios en el borrador): `Muestras_ObtenerIdMuestraDadoCodMuestraYIdLab(@CodMuestra,@IdUsuario,@IdLaboratorio)→@IdMuestra`; `ObtenerIdParametroDadoIdMuestraYNombreParametroXSiglaParametro2(@IdMuestra,@NombreParametro)→@IdParametro`; `ObtenerIdMedicionDadoIdMuestraYParametro(@IdMuestra,@IdParametro)→@IdMedicion`; `ObtenerIdVariablesParametroIdParametros(@IdParametro,@Variable)→@Retorno`; `GuardarLecturasDeLasVariables(@IdVariableParametro,@IdMedicion,@ValorMedidoNumerico,@ValorMedidoCadena)`. Variables de texto (como la fecha «FCH») van con numérico 0 y el texto en la cadena.
- **«CON» no es una columna del archivo:** es la variable de destino de Sampler donde el ICP guarda el valor. Para in situ cada parámetro tiene la suya.

**Variables de Sampler para in situ PUNTUALES (dadas por el usuario):**
| Parámetro | Variable |
|---|---|
| Agua - Caudal > 2 m3/s y < 10 m3/s | L17 |
| Agua - Conductividad a 25°C In Situ - Puntual | ROB |
| Agua - Temperatura | T |
| Agua - pH (en el plan viene como «pH») | pHOB |
| Agua - Oxígeno Disuelto | LDO2 |
| Agua - Temperatura en la zona de mezcla térmica | T |
| Cloro Residual Libre In Situ | LD |

**Variables para COMPUESTOS (dadas por el usuario):** «Agua - Conductividad Eléctrica - Compuesto», «Agua - pH Compuesto», «Agua - Temperatura - Compuesto» y «Agua - Sólidos Sedimentables - Compuesto»: valor en **SUBM0 … SUBM24** (25 submuestras). **Todos** los compuestos guardan además la hora de cada alícuota en **HORA0 … HORA24** (formato `HH:mm`, hora de Colombia: la app guarda UTC y el guion resta 5 h, sin horario de verano). «Agua - Caudal Compuesto»: **Volumen0…24** (L), **Tiempo0…24** (s) y HORA0…24 (una vez por alícuota, con la hora de la lectura del volumen). **La alícuota 1 de la app va en SUBM0/HORA0/Volumen0/Tiempo0** (la app numera las alícuotas desde 1). Más de 25 alícuotas: el guion avisa error.

**Excel que exporta la app** (hoja «Resultados», una fila por muestra, parámetro y alícuota): Codigo muestra, Punto, Tipo, Matriz, Submatriz, Estado muestra, Parametro, Alicuota, In situ, Valor, Unidad, Fecha y hora toma (ISO UTC), Latitud, Longitud, Precision GPS (m), Version, Marcada, Motivo marca, Muestreador, Equipo, Descripcion del punto; más hojas «Fotos» e «Historial». El caudal compuesto aparece como `Agua - Caudal Compuesto | Volumen` y `| Tiempo`.

**Borrador `Guion_InSitu.txt`** (C#, ~370 líneas, **sin compilar ni probar contra Sampler**; llaves y paréntesis cuadran): reutiliza las funciones auxiliares del ICP; lee el `.xlsx` con `ExcelDataReader`; mapas `VARIABLES_PUNTUAL` y `PREFIJOS_COMPUESTO` (acepta las dos escrituras de la conductividad compuesta), `LECTURAS_VALIDAS` (Volumen, Tiempo), constantes `INDICE_PRIMERA_ALICUOTA = 0`, `ULTIMO_INDICE_ALICUOTA = 24`, `PREFIJO_HORA = "HORA"`, `FORMATO_HORA = "HH:mm"`, `SOLO_SIMULAR = true` (escribe en la consola lo que haría y no guarda nada); salta filas sin valor; informa un resumen. **Única marca CONFIRMAR que queda:** si `...XSiglaParametro2` busca por nombre completo (lo que le pasa el guion) o solo por sigla.

**Acreditación IDEAM:** Resolución 1004 del 24-ago-2026; vigencia hasta el 1-jun-2030. Amplía CO y NO₂ (aire); no ampliados: PM₁₀/PM₂.₅ con EDM 180 serial 18A22005 y SO₂ con APSA-370 serial 1W9EXTOR.

**Técnico:** `tsc` limpio y 188 tests (`npm test`); `npm run test:db` OK (Postgres 16; en CI en `ubuntu-24.04`). `xlsx` = `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (integrity `sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`); `npm audit --omit=dev`: 0 vulnerabilidades; 2 moderadas en herramientas de build (`deepmerge`, `glob`). Bundle ~600 kB.

## 9. People, terms & names
- **People:** el usuario (dueño del módulo y conocedor de Sampler). Clientes de los PDT de ejemplo: ENEL (agua residual), ECOPETROL (suelos). Subcontratados nombrados en las tablas (ignorados por orden): LMB, Gaia, Serambiente, SGI, Biopolimeros.
- **Terms:** PDT = FM-081; AT-002 / AT-003 = documentos de preservación; «por definir» = sin regla; PSI, CIC, RAS (suelo); in situ = medido en campo; compuesta/alícuota = muestreo compuesto con lecturas por alícuota; **Sampler** = sistema del laboratorio; **guion** = script C# de importación; **variable** = campo de un parámetro en Sampler (CON, T, pHOB, SUBMn, HORAn, Volumenn, Tiempon…); `SUBM` = submuestra; frasco/recipiente DQO y Metales.
- **Names in use:** rama de Claude `claude/determined-ramanujan-rj1pl1`; `src/exportar/alistamiento.ts`, `src/exportar/pdt.ts`, `src/exportar/exportador.ts`, `src/datos/subparametros.ts`, `src/ui/campo/FormMuestra.tsx`, `src/ui/campo/ListaMuestras.tsx`, `tests/pdt.test.ts`, `tests/subparametros.test.ts`, `public/fm-081.xlsx`, `src/datos/errores.ts`, `supabase/functions/gestionar-usuarios/index.ts`, `supabase/migrations/0015_errores_cliente.sql`, `supabase/seed.sql`, `.github/workflows/ci.yml`, `scripts/db-test.sh`; secreto `ALLOWED_ORIGIN`; el bot «Entire» (abre un PR en borrador por rama, marcador `<!-- entire-shadow-pr -->`, y publica el chequeo «Entire Gates», que exige aprobación humana).

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| CORS, reporte de errores, Envíos, PDT agua y sólidos, dureza, agua potable, `xlsx`, CI | final, mergeados | PR #3, #4, #5, #6, #7, #9, #10, #11 | |
| Conductividad compuesta in situ + caudal con volumen y tiempo | final, mergeado | PR #13; `main` en `49fdd3f`; filas ya insertadas en producción | Probado en navegador con un arnés temporal; CI en verde |
| Guion de importación a Sampler | borrador, sin probar | `Guion_InSitu.txt` (ver sección 13) | Falta una corrida en simulación contra Sampler |
| Protección de `main` exigiendo el CI | pendiente del usuario | GitHub → Settings → Rules → Rulesets | Claude no puede hacerlo; ver pasos abajo |
| Validación con plan real de suelo/sedimento/lodo | no iniciado | — | Falta un plan `.xls` de esas matrices |
| Instructivos de campo (`docs/instructivo-campo`) | desactualizados | `.md` y `.docx` | No mencionan volumen y tiempo del caudal compuesto |
| Piloto en campo | no iniciado | — | |

**Pasos de la protección de `main` (que hace el usuario):** Settings → Rules → Rulesets → New branch ruleset; Enforcement Active; Target: default branch; marcar «Require status checks to pass» y agregar `Tipos, tests y build` y `Migraciones y RLS (Postgres 16)`; dejar sin marcar «Require a pull request» con aprobaciones, «Require branches to be up to date» y el chequeo «Entire Gates».

**Flujo git (no obvio):**
- La rama de Claude se rehace desde `origin/main` tras cada squash (`git checkout -B claude/determined-ramanujan-rj1pl1 origin/main`), pero si hay un PR abierto en la rama, partir de `origin/claude/determined-ramanujan-rj1pl1` para no perder sus commits.
- El force-push lo bloquea el sistema: usar `git merge -s ours origin/claude/determined-ramanujan-rj1pl1` y luego `git push` normal.
- El bot Entire abre solo un PR en borrador por la rama: reutilizarlo (título y descripción propios, conservando su marcador); para mergear, sacar de borrador y squash.
- Los hooks de parada exigen no dejar archivos sin guardar ni commits sin subir: el handoff y el guion viven en la rama (historial) y **no deben mergearse**; handoffs anteriores en los commits `a94b5ed` (#1), `11d8e64` (#2) y `f5df139` (#3). Si el hook marca un «commit sin subir» que ya está en `main`, alinear la copia local con `git checkout -B <rama> origin/<rama>` (no hay nada que subir).
- Sin `gh` (solo búsqueda): usar las herramientas MCP de GitHub; para producción, las de Supabase (`execute_sql`). Verificar un cambio de agua o de pantalla con un test o arnés temporal que se borra (no commitear datos de clientes).

## 11. Next steps
1. **Next action:** que el usuario haga la primera corrida del guion en un ambiente de pruebas de Sampler en modo simulación con el Excel de un plan real, para contestar si `...XSiglaParametro2` acepta el nombre completo o solo siglas, y si Sampler carga `.xlsx` o hace falta una descarga en CSV con «;» desde la app (Claude la agregaría); ajustar el guion con el resultado.
2. Confirmar la escritura exacta de «Agua - Conductividad Eléctrica - Compuesto» al cargar un plan real y borrar la variante que sobre.
3. El usuario activa la protección de `main` (pasos de la sección 10).
4. Pedir un plan real (`.xls`) de suelo, sedimento o lodo y validar nombres de parámetros con las reglas de `src/exportar/alistamiento.ts`.
5. Actualizar `docs/instructivo-campo` con el volumen y el tiempo del caudal compuesto (si el usuario lo pide); piloto con 1 o 2 técnicos.
6. Opcionales: alinear `supabase/seed.sql` con los valores de producción de «Agua - Caudal Compuesto»; subir `actions/checkout`/`setup-node` (aviso de Node 20); revisar las 2 moderadas de herramientas de build; backups de Supabase.

## 12. Open questions ⚠️
- ¿El procedimiento `ObtenerIdParametro…XSiglaParametro2` busca por nombre completo (como en el plan) o solo por sigla? Decide si hace falta una tabla nombre → sigla.
- ¿Sampler carga un `.xlsx` (el guion usa `ExcelDataReader`) o solo texto separado por «;»?
- ¿Idempotencia? No se sabe qué hace `GuardarLecturasDeLasVariables` si se importa dos veces el mismo archivo (¿duplica o reemplaza?).
- ¿Qué tabla manda para CIC/PSI/RAS (hoy 300-500 g ambiente en bolsa ziploc; el PDT real dice 2000 g < 10 °C), pH/conductividad (300-500 g vs 250 g) y densidad real? Sin respuesta; queda como está. Hoja3 y Hoja6 difieren en mínimos de pH/conductividad y metales; el bloque «ziploc, 300-500 g, 30 días» se aplicó a ocho parámetros por lectura de celdas combinadas.
- Preserva de metales y otros parámetros de sedimento y lodo (refrigerar, congelar o secar), su cantidad en g, y si comparten tabla (Hoja5); granulometría sin regla; detección de matriz por texto sin validar con un plan real; cómo vienen escritos «Sodio intercambiable» y las bases cambiables.
- Dureza con Metales: la fila de Metales conserva 500 mL y Hoja2 pide 500 mL para dureza cálcica aparte; si no alcanza, subir el mínimo (no pedido).
- El chequeo «Entire Gates» exige una aprobación humana que Claude no puede dar.

## 13. Re-attach checklist
- [ ] `Guion_InSitu.txt` (borrador del guion de importación a Sampler): el siguiente paso lo necesita. Está en la rama `claude/determined-ramanujan-rj1pl1`, carpeta `integracion-sampler/`, y como copia temporal fuera del repo.
- [ ] `Guion_ICP.txt` (guion original del ICP): referencia del patrón de importación.
- [ ] Un Excel de plan real de suelo, sedimento o lodo, y el Excel de resultados in situ exportado por la app (para la prueba del guion).
- [ ] `2._PDT_ES-479-25_SUELO.xlsm` (en realidad PDT de agua residual, ENEL; hojas ocultas Hoja2/3/5/6 con las tablas del laboratorio), `MONITOREO_DE_SUELOS_CAMPO_DE_INFILTRACION_POZOS_SEPTICOS_GRB.xlsm` (PDT real de suelos, ECOPETROL), `Muestreo_1217-26.xls` (plan de agua potable) y `acreditacion-ambienciq.md`: solo si hay que validar valores de nuevo; lo esencial ya está en la sección 8.

---
<sub>Audit: 13/13 sections · 12 rules · 6 corrections · 45 data points · secrets removed: none found · generated by active-memory</sub>
