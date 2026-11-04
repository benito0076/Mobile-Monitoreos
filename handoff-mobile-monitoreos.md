# active-memory handoff: Mobile-Monitoreos (PWA de campo de Ambienciq) y PDT FM-081

**Handoff #2** · 2026-11-04 · Lineage: #1 (2026-11-04): revisión de producción; CORS obligatorio y reporte de errores; arreglo del panel Envíos; PDT FM-081 de agua, suelo, sedimento y lodo; prueba en producción y limpieza de usuario de prueba; #2 (2026-11-04): `xlsx` corregido, PDT de agua potable (plan 1217-26: E-Coli, tiosulfato, cloro in situ) y CI con GitHub Actions.

## 0. Instructions for Claude (read first)

You are continuing work from a previous chat. That chat is gone; this file is the complete context and the source of truth.

1. Read this whole file before replying.
2. Follow sections 3 (Style), 4 (Hard rules) and 5 (Corrections) in every reply, for the rest of this chat. They override your defaults.
3. Use the values in section 8 exactly. Never round, re-estimate, or "correct" them.
4. Do not suggest anything listed in section 7 (Changed / rejected) again unless the user brings it up.
5. Code word: None active. If the user types /amcodeword, start every reply with the phrase they choose (default "Yes Boss!").
6. Your first reply: at most 5 lines covering the goal, the current state, and the next step (section 11). Mention any files from section 13 that were not attached. Ask the questions in section 12 if there are any. End with "Ready to continue with <next step>?" Then wait for the user's go.

## 1. Mission
- **Goal:** dejar el módulo Mobile (PWA offline de captura de campo para muestreo ambiental + panel de oficina, backend Supabase) listo para producción, y que el PDT (Formato de planeación de monitoreos, FM-081) salga **sin errores de preservas y recipientes** para cada matriz.
- **Done looks like:** el PDT generado por la app coincide con lo que el laboratorio usa en la práctica (agua, suelo, sedimento, lodo); pendientes de producción cerrados (queda el piloto en campo).
- **Context:** el laboratorio es AMBIENCIQ INGENIEROS S.A.S. (acreditado IDEAM, NTC-ISO/IEC 17025:2017). Interfaz y documentos en español (Colombia).

## 2. About the user (as relevant to this work)
- Dueño o responsable del módulo Mobile y del laboratorio (conoce AT-002/AT-003, PDT, acreditación). Escribe en español, respuestas cortas ("Haz el merge del PR #N", "Aprobado todo", "Dejalo así, está bien").
- Herramientas: repo GitHub `benito0076/Mobile-Monitoreos`; Supabase (proyecto `ytcnnipltpfzagfuwtih`); Vercel (proyecto `mobile-monitoreos`, producción `https://mobile-monitoreos.vercel.app`).
- Aporta documentos reales (acreditación, PDT en `.xlsm`, plan Excel) y decide qué cambia y qué no; aprueba por bloques.

## 3. Style & communication
- **Language:** español (Colombia) en todo: respuestas, PRs, commits, textos de la app.
- **Tone:** directo, sin relleno.
- **Reply length:** corto; tablas para comparaciones; detalle largo solo cuando se pide un informe o análisis.
- **Formatting:** tablas y viñetas; comandos de terminal en bloque `bash` propio; enlaces a PR como `[owner/repo#N](url)`.
- **Working style:** hacer solo lo pedido; decir lo que no se pudo verificar; antes de borrar o escribir en producción, mirar primero el objetivo; probar con el plan real cuando exista. Plugin "ponytail" activo por hook: código mínimo, explicaciones cortas. Compromiso propio de Claude: no inventar valores de preservas/recipientes; lo no confirmado queda «Por definir» y marcado pendiente. Al abrir un PR, proponer los cambios y esperar el "aprobado" antes de tocar agua o la base de datos.
- **Avoid:** cambiar agua sin permiso; incluir laboratorios subcontratados; mergear sin que el usuario lo pida.

## 4. Hard rules (word for word)
1. "No tomes en cuenta los laboratorio subcontratados, esos suelen cambiar frecuentemente. No cambies nada en agua, la información que ya tienes es la actualizada"
2. "Solo cambias los dos que tenias por definir." (sobre suelo, al comparar con el PDT real de ECOPETROL: los grupos de suelo que estaban «por definir»)
3. "Para matriz sólida, cambias la etiqueta a g en vez de mL"
4. "Aceites y Grasas, refrigerado, sea para suelos, lodos o sedimentos"
5. "Prueba de infiltración si es una prueba In Situ, solo que por el momento no vamos a realizar esos registros mediante la App"
6. "Aprobado todo, Cloro con medición en campo, en mg/L, obligatorio, rango de 0 a 5" (E-Coli, tiosulfato solo en microbiología de agua potable y cloro residual in situ)
7. "Dejalo así, está bien" (sobre no agregar tiosulfato a otros parámetros: solo microbiología; HAPs ya traía el suyo)
8. Los merges los ordena el usuario con frases como "Haz el merge del PR #N"; sin esa orden no se mergea.

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
| CORS de `gestionar-usuarios`: sin `ALLOWED_ORIGIN` (o con `*`) la función no arranca; secreto `https://mobile-monitoreos.vercel.app` aplicado; función v5; probado creando un usuario en producción | Cerrar CORS abierto |
| Reporte de errores: tabla `errores_cliente` (migración 0015 aplicada; RLS: cada usuario inserta los suyos, solo oficina lee), `src/datos/errores.ts` (máx. 20 por sesión, no encola offline). Consulta: `select * from errores_cliente order by creado_en desc` | Visibilidad de fallos |
| Panel Envíos: clase `envios` + CSS acotado | La rejilla `.tarjeta.ancha` superponía el formulario |
| Agua, 4 parámetros: Sulfuro→SULFUROS; Nitrógeno orgánico→DQO; Bicarbonatos/carbonatos/hidróxidos→VARIOS; Conductividad (laboratorio)→VARIOS | Aprobado; Hoja2 lo confirma |
| Sólidos: enrutamiento por matriz de cada muestra (`tipoSolido`: texto «suelo», «sedimento» o «lodo» en matriz/submatriz); grupos en gramos (`GRUPOS_SOLIDO`, `agruparSolidos` en `src/exportar/alistamiento.ts`); agua intacta | Antes caían en «por definir» o con preserva de agua |
| Etiqueta de cantidad (celda D de la fila de encabezado de `public/fm-081.xlsx`, «TAMAÑO MINIMO DE MUESTRA (Unidad)»): solo sólidos → «(g)»; agua + sólidos → «(mL / g)»; solo agua → sin cambio | Orden del usuario |
| «Prueba de infiltración» (regex `infiltracion`) se lista in situ en el PDT (`src/exportar/pdt.ts`), sin tocar BD ni app | Orden del usuario |
| Sodio cambiable en fila propia; acidez, aluminio e hidrógeno intercambiables en una sola fila; sedimento y lodo usan los grupos de Hoja5 | Recomendación aprobada; sedimento/lodo = supuesto de Claude |
| Agua potable (plan 1217-26): regla de E-Coli admite guion (`e[.\- ]?coli`); si alguna muestra es potable (matriz/submatriz con «potable») el preservante de MICROBIOLOGICOS pasa a la constante `TIOSULFATO`; sin potable, queda «N/A» | Aprobado ("Aprobado todo") |
| «Cloro Residual Libre In Situ» insertado en producción en `parametros_insitu` (mg/L, 0 a 5, obligatorio) y agregado a `supabase/seed.sql` | Aprobado |
| `xlsx` 0.18.5 → 0.20.3 desde el CDN oficial de SheetJS (en npm solo existe la 0.18.5, vulnerable); el lock fija el hash | Orden del usuario; el usuario habilitó `cdn.sheetjs.com` en el entorno |
| CI en `.github/workflows/ci.yml`: trabajo «Tipos, tests y build» (Node 22: `npm ci`, `npm test`, `npm run build`) y trabajo «Migraciones y RLS (Postgres 16)» (`scripts/db-test.sh`, repo copiado a `/tmp`, runner `ubuntu-24.04`) | Orden del usuario |
| `usuario_prueba_2` eliminado de Supabase; `usuario_prueba_1` nunca existió; perfiles = 5 | Orden del usuario |
| PRs mergeados como squash: #3, #4, #5, #6, #7, #9, #10. `main` en `1d40805` | Órdenes del usuario |

## 7. Changed / rejected
- Mi propuesta de preservas para sólidos (basada en normas) → reemplazada por las tablas y PDT reales del laboratorio.
- Aceites y grasas en suelo a temperatura ambiente → refrigerado (4 ± 2 °C), por orden del usuario.
- Bases cambiables, acidez, Al e H como «por definir» → agrupados (sección 8).
- `xlsx` 0.18.5 → 0.20.3.
- Runner del CI `ubuntu-latest` → `ubuntu-24.04` para el trabajo de base de datos (ubuntu-latest es 26.04 y no trae Postgres 16; la primera corrida falló por eso).
- ❌ Cambios en agua (alinear con Hoja2): rechazado.
- ❌ Parámetros subcontratados en tablas de suelo: rechazado; quedan «por definir».
- ❌ Adoptar valores del PDT real para CIC/PSI/RAS, pH/CE y densidad real: rechazado.
- ❌ Registrar «Prueba de infiltración» en los parámetros in situ del servidor: no por ahora.
- ❌ Tiosulfato en otros parámetros (fenoles, THM, BTEX, cianuro…): rechazado ("Dejalo así").
- ❌ Reemplazar `xlsx` por un fork de terceros: no se hizo (solo el CDN oficial).
- ❌ Force-push: lo bloquea el sistema; no insistir.

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

**Metales propios en suelo** (→ SUELO · GENERAL): aluminio, antimonio, bario, cadmio, cobre, cromo, hierro, magnesio, manganeso, mercurio, níquel, plata, plomo, potasio, sodio, vanadio, zinc.

**Quedan «POR DEFINIR» a propósito:** subcontratados (fluoruros, nitritos, nitratos, DQO, Kjeldahl, cianuro; metales arsénico, selenio, litio, berilio, estaño, calcio, boro, cobalto); «Bases cambiables» sin elemento; granulometría; metales y demás parámetros de sedimento y lodo (Hoja5 ofrece refrigerar/congelar/secar sin elegir). «Sodio intercambiable» a secas = PSI → SUELO · GENERAL.

**Agua potable:** `TIOSULFATO` = «Refrigerar a < 10 °C · Agua potable: 5 gotas de tiosulfato de sodio al 3%» (texto de Hoja2, solo MICROBIOLOGICOS y solo si hay muestra potable). HAPs ya traía «con cloro residual: 0,8 mL de tiosulfato de sodio al 10 %» (Hoja2: «por cada litro de muestra»). En Hoja2 no hay otros parámetros con tiosulfato. Cloro residual libre: nombre exacto «Cloro Residual Libre In Situ», mg/L, mínimo 0, máximo 5, obligatorio. Parámetros in situ actuales en producción (11): Agua - Caudal > 2 m3/s y < 10 m3/s; Agua - Caudal Compuesto; Agua - Conductividad a 25°C In Situ - Puntual; Agua - Oxígeno Disuelto ; Agua - pH Compuesto; Agua - Sólidos Sedimentables - Compuesto; Agua - Temperatura ; Agua - Temperatura - Compuesto; Agua - Temperatura en la zona de mezcla térmica; pH; Cloro Residual Libre In Situ.

**Plan 1217-26 (agua potable):** 13 muestras puntuales (códigos 11929-26 a 11941-26), 23 parámetros; tras los cambios el PDT sale sin «por definir» (in situ: Cloro Residual Libre In Situ, pH, Temperatura; microbiología con tiosulfato).

**Valores del PDT real de ECOPETROL NO adoptados salvo los dos grupos:** CIC/PSI/RAS 2000 g, bolsa hermética, refrigerar < 10 °C; pH y conductividad 250 g, bolsa hermética, ambiente; densidad aparente y real juntas 20 g, anillos 5x5 cm; aceites y grasas 100 g ambiente. Errores propios de ese PDT: tipo «PUNTUAL» con objetivo «compuesto»; observaciones hablan de «Lodos»; typos «Desidad», «Calclo», «Intercamblable».

**Diferencias de Hoja2 (agua) frente al código; NO cambiar:** DQO mínimo 2000 (código) vs 1000; aceites y grasas 1000 vs 2000; metales 500 vs 1000; ortofosfatos «Filtración en campo» vs refrigeración; sulfuros «Vidrio ámbar» vs «plástico o vidrio, 2 envases de 250».

**Hojas ocultas de los `.xlsm`:** Hoja2 = agua; Hoja3 y Hoja6 = suelo (mínimo de peso seco, preservación, contenedor, cantidad del monitoreo en g, tiempo máximo); Hoja5 = almacenamiento de sedimento/lodo. Hoja3 vs Hoja6: pH/conductividad 100 g vs 50 g; metales pesados 50 g vs 100 g.

**Acreditación IDEAM:** Resolución 1004 del 24-ago-2026; vigencia hasta el 1-jun-2030. Amplía CO y NO₂ (aire); no ampliados: PM₁₀/PM₂.₅ con EDM 180 serial 18A22005 y SO₂ con APSA-370 serial 1W9EXTOR.

**Técnico:** `tsc` limpio y 181 tests (`npm test`); `npm run test:db` OK (Postgres 16; en CI corre en `ubuntu-24.04`). `xlsx` = `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (la más reciente en el CDN; integrity `sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==`); `npm audit --omit=dev`: 0 vulnerabilidades; el audit completo muestra 2 moderadas en herramientas de build (`deepmerge`, `glob`; arreglarlas exige `--force`). Bundle 599 kB (176 kB gzip).

## 9. People, terms & names
- **People:** el usuario (dueño del módulo). Clientes de los PDT de ejemplo: ENEL (agua residual), ECOPETROL (suelos). Subcontratados nombrados en las tablas (ignorados por orden): LMB, Gaia, Serambiente, SGI, Biopolimeros.
- **Terms:** PDT = FM-081; AT-002 / AT-003 = documentos de preservación (fisicoquímicos / subcontratados); «por definir» = sin regla; PSI = porcentaje de sodio intercambiable; CIC = capacidad de intercambio catiónico; RAS = relación de adsorción de sodio; in situ = medido en campo.
- **Names in use:** rama de Claude `claude/determined-ramanujan-rj1pl1`; archivos `src/exportar/alistamiento.ts`, `src/exportar/pdt.ts`, `tests/pdt.test.ts`, `public/fm-081.xlsx`, `src/datos/errores.ts`, `supabase/functions/gestionar-usuarios/index.ts`, `supabase/migrations/0015_errores_cliente.sql`, `supabase/seed.sql`, `.github/workflows/ci.yml`, `scripts/db-test.sh`; secreto `ALLOWED_ORIGIN`; el bot «Entire» (abre solo un PR en borrador por rama, marcador `<!-- entire-shadow-pr -->`, y publica el chequeo «Entire Gates» que exige una aprobación humana).

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| CORS + reporte de errores | final, mergeado | PR #3; migración 0015 y función v5 en Supabase | Probado en producción |
| Panel Envíos | final, mergeado | PR #4 | |
| PDT agua (4 parámetros) y base de sólidos | final, mergeado | PR #5 | |
| Aceites y grasas refrigerados en sólidos | final, mergeado | PR #6 | |
| Suelos: intercambiables, P/N total, unidad g, infiltración, sodio, acidez/Al/H | final, mergeado | PR #7 | |
| Agua potable (E-Coli, tiosulfato, cloro in situ) + `xlsx` 0.20.3 | final, mergeado | PR #9; cloro ya insertado en producción | |
| CI con GitHub Actions | final, mergeado; primera corrida verde en el PR | PR #10; `main` en `1d40805` | Falta ver la primera corrida sobre `main` |
| Validación con plan real de suelo/sedimento/lodo | no iniciado | — | Falta un plan `.xls` de esas matrices |
| Protección de `main` exigiendo el CI | no iniciado | GitHub → Settings → Branches | Decisión del usuario |
| Piloto en campo | no iniciado | — | |

**Flujo git (no obvio):**
- La rama de Claude se rehace desde `origin/main` tras cada squash: `git checkout -B claude/determined-ramanujan-rj1pl1 origin/main`.
- El force-push lo bloquea el sistema: usar `git merge -s ours origin/claude/determined-ramanujan-rj1pl1` y luego `git push` normal.
- El bot Entire abre solo un PR en borrador por la rama: reutilizarlo editando título y descripción y conservando su marcador; para mergear, sacar de borrador y squash.
- Los hooks de parada exigen no dejar archivos sin guardar ni commits sin subir; este archivo vive en la rama (historial) y no debe mergearse.
- Sin `gh`: usar las herramientas MCP de GitHub; para producción usar las de Supabase (`execute_sql`).

## 11. Next steps
1. **Next action:** pedir al usuario un plan real (`.xls` de plan) de suelo, sedimento o lodo y comprobar con él que los nombres de parámetros coinciden con las reglas de `src/exportar/alistamiento.ts` (matriz detectada por texto, intercambiables, PSI, etc.); ajustar y probar.
2. Preguntarle si protege `main` exigiendo el CI y confirmar que la primera corrida sobre `main` salió verde.
3. Piloto con 1 o 2 técnicos en una salida real.
4. Opcionales: subir `actions/checkout`/`setup-node` (aviso de Node 20); revisar las 2 moderadas de herramientas de build; confirmar backups de Supabase y cabeceras de seguridad.

## 12. Open questions ⚠️
- ¿Qué tabla manda para CIC/PSI/RAS (hoy 300-500 g ambiente en bolsa ziploc; el PDT real dice 2000 g < 10 °C), pH/conductividad (300-500 g vs 250 g) y densidad real (bolsa general vs anillos)? Sin respuesta; queda como está.
- Hoja3 y Hoja6 difieren en mínimos de pH/conductividad y metales; el bloque «ziploc, 300-500 g, 30 días» se aplicó a ocho parámetros por lectura de celdas combinadas.
- Preserva de metales y otros parámetros de sedimento y lodo (refrigerar, congelar o secar) y su cantidad en g; ¿sedimento y lodo comparten tabla (Hoja5)?
- Granulometría sin regla: ¿misma bolsa que textura?
- Detección de matriz por texto «suelo/sedimento/lodo»: sin validar con un plan real; cómo vienen escritos «Sodio intercambiable» y las bases cambiables.
- ¿Proteger `main` exigiendo el CI? El chequeo «Entire Gates» exige una aprobación humana que Claude no puede dar.

## 13. Re-attach checklist
- [ ] Un Excel de plan real de suelo, sedimento o lodo: lo necesita el siguiente paso.
- [ ] `2._PDT_ES-479-25_SUELO.xlsm` (en realidad PDT de agua residual, ENEL; sus hojas ocultas Hoja2/3/5/6 son las tablas del laboratorio): solo si hay que validar valores; lo esencial ya está en la sección 8.
- [ ] `MONITOREO_DE_SUELOS_CAMPO_DE_INFILTRACION_POZOS_SEPTICOS_GRB.xlsm` (PDT real de suelos, ECOPETROL): ídem.
- [ ] `Muestreo_1217-26.xls` (plan de agua potable): solo si se quiere repetir la prueba.
- [ ] `acreditacion-ambienciq.md` (alcance acreditado IDEAM): si se necesita revisar parámetros acreditados.

---
<sub>Audit: 13/13 sections · 8 rules · 6 corrections · 30 data points · secrets removed: none found · generated by active-memory</sub>
