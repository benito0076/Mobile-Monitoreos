# active-memory handoff: Mobile-Monitoreos (PWA de campo de Ambienciq) y PDT FM-081

**Handoff #1** · 2026-11-04 · Lineage: #1 (2026-11-04): revisión de producción; CORS obligatorio y reporte de errores; arreglo del panel Envíos; PDT FM-081 de agua, suelo, sedimento y lodo; prueba en producción y limpieza de usuario de prueba.

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
- **Done looks like:** el PDT generado por la app coincide con lo que el laboratorio usa en la práctica (agua, suelo, sedimento, lodo); los pendientes de producción (xlsx, CI, piloto en campo) resueltos.
- **Context:** el laboratorio es AMBIENCIQ INGENIEROS S.A.S. (acreditado IDEAM, NTC-ISO/IEC 17025:2017). Interfaz y documentos en español (Colombia).

## 2. About the user (as relevant to this work)
- Dueño o responsable del módulo Mobile y del laboratorio (conoce AT-002/AT-003, PDT, acreditación). Escribe en español, respuestas cortas ("Haz el merge", "Estoy de acuerdo").
- Herramientas: repo GitHub `benito0076/Mobile-Monitoreos`; Supabase (proyecto `ytcnnipltpfzagfuwtih`); Vercel (proyecto `mobile-monitoreos`, producción `https://mobile-monitoreos.vercel.app`).
- Aporta documentos reales (acreditación, PDT en `.xlsm`) y decide qué cambia y qué no.

## 3. Style & communication
- **Language:** español (Colombia) en todo: respuestas, PRs, commits, textos de la app.
- **Tone:** directo, sin relleno.
- **Reply length:** corto; tablas para comparaciones; el detalle largo solo cuando se pide un informe o análisis.
- **Formatting:** tablas y viñetas; comandos de terminal en bloque `bash` propio; enlaces a PR como `[owner/repo#N](url)`.
- **Working style:** hacer solo lo pedido; decirle al usuario lo que no se pudo verificar; antes de borrar algo en producción, mirarlo primero. Plugin "ponytail" activo por hook: código mínimo, explicaciones cortas. Compromiso propio de Claude: no inventar valores de preservas/recipientes; lo no confirmado queda «Por definir» y marcado como pendiente.
- **Avoid:** cambiar agua; incluir laboratorios subcontratados; mergear sin que el usuario lo pida.

## 4. Hard rules (word for word)
1. "No tomes en cuenta los laboratorio subcontratados, esos suelen cambiar frecuentemente. No cambies nada en agua, la información que ya tienes es la actualizada"
2. "Solo cambias los dos que tenias por definir." (sobre suelo, al comparar con el PDT real de ECOPETROL; se refiere a los grupos de suelo que estaban «por definir»: intercambiables Ca/Mg/K y fósforo/nitrógeno total)
3. "Para matriz sólida, cambias la etiqueta a g en vez de mL"
4. "Aceites y Grasas, refrigerado, sea para suelos, lodos o sedimentos"
5. "Prueba de infiltración si es una prueba In Situ, solo que por el momento no vamos a realizar esos registros mediante la App"
6. Los merges los ordena el usuario con frases como "Haz el merge del PR #N"; sin esa orden no se mergea.

## 5. Corrections log
| # | Claude did | The user wanted |
|---|---|---|
| 1 | Reportó diferencias entre el código de agua y la tabla de agua del laboratorio (DQO, aceites y grasas, metales, ortofosfatos, sulfuros) y ofreció alinearlas; incluyó parámetros subcontratados en las tablas de suelo | "No tomes en cuenta los laboratorio subcontratados… No cambies nada en agua, la información que ya tienes es la actualizada" |
| 2 | Ofreció adoptar del PDT real de ECOPETROL también CIC/PSI/RAS (2000 g, < 10 °C), pH/CE (250 g), densidad real con anillos, aceites y grasas ambiente | "Solo cambias los dos que tenias por definir." |
| 3 | Dejó aceites y grasas en suelo a temperatura ambiente (tomado de la tabla de suelo del laboratorio) | "Aceites y Grasas, refrigerado, sea para suelos, lodos o sedimentos" |
| 4 | Habló de la etiqueta «mL» sin decidir qué hacer con sólidos | "Para matriz sólida, cambias la etiqueta a g en vez de mL" |
| 5 | Propuso comprobar/registrar «Prueba de infiltración» en los parámetros in situ del servidor | Es in situ, pero por ahora no se registra en la app |

## 6. Decisions
| Decision | Why |
|---|---|
| CORS de `gestionar-usuarios`: sin `ALLOWED_ORIGIN` (o con `*`) la función no arranca. Secreto aplicado: `https://mobile-monitoreos.vercel.app`; función v5 desplegada; probado creando un usuario en producción | Cerrar CORS abierto por defecto |
| Reporte de errores: tabla `errores_cliente` (migración 0015 aplicada, RLS: cada usuario inserta los suyos, solo oficina lee), `src/datos/errores.ts` (error y unhandledrejection, máx. 20 por sesión, no encola offline). Consulta: `select * from errores_cliente order by creado_en desc` | Visibilidad de fallos en teléfonos |
| Panel Envíos: clase propia `envios` en `PanelEnvios.tsx` + CSS acotado en `src/estilos.css` | La rejilla `.tarjeta.ancha` (filtros) superponía el formulario |
| Agua, 4 parámetros acreditados que salían «por definir»: Sulfuro→SULFUROS; Nitrógeno orgánico→DQO; Bicarbonatos/carbonatos/hidróxidos→VARIOS; Conductividad (laboratorio)→VARIOS | El usuario aprobó; la tabla de agua del laboratorio (Hoja2) lo confirma |
| Suelo/sedimento/lodo: enrutamiento por matriz de cada muestra (`tipoSolido`: texto «suelo», «sedimento» o «lodo» en matriz/submatriz); reglas y grupos propios en gramos (`GRUPOS_SOLIDO`, `agruparSolidos` en `src/exportar/alistamiento.ts`); agua intacta | Antes caían en «por definir» o con preserva de agua (ej. HNO3 para Pb en suelo) |
| Etiqueta de la columna de cantidad (celda D de la fila de encabezado, plantilla `public/fm-081.xlsx`, que dice «TAMAÑO MINIMO DE MUESTRA (Unidad)»): solo sólidos → «(g)»; agua + sólidos → «(mL / g)»; solo agua → sin cambio | Orden del usuario; la «(mL)» está en los `.xlsm` del laboratorio, no en la plantilla de la app |
| «Prueba de infiltración» (regex `infiltracion`) se lista en in situ del PDT en `src/exportar/pdt.ts`, sin tocar la base de datos ni la app | Orden del usuario |
| Sodio cambiable en fila propia; acidez, aluminio e hidrógeno intercambiables en una sola fila | Recomendación de Claude aprobada por el usuario ("Estoy de acuerdo") |
| Sedimento y lodo usan los mismos grupos (tomados de Hoja5) | Supuesto de Claude (Hoja5 no dice matriz) |
| `usuario_prueba_2` eliminado de Supabase (perfiles + auth.users) tras verificar que no tenía datos; `usuario_prueba_1` nunca existió; perfiles quedan en 5 | Orden del usuario |
| PRs mergeados como squash: #3, #4, #5, #6, #7; `main` en `0ac1a5d` | Órdenes del usuario |

## 7. Changed / rejected
- Mi propuesta de preservas para sólidos (basada en normas) → reemplazada por las tablas del laboratorio (hojas ocultas Hoja3, Hoja5, Hoja6 de los `.xlsm`) y por el PDT real de ECOPETROL.
- Aceites y grasas en suelo a temperatura ambiente (tabla de suelo y PDT ECOPETROL) → refrigerado, por orden del usuario.
- Mostrar bases cambiables, acidez, Al e H intercambiables como «por definir» → agrupados (ver sección 8), por recomendación aprobada.
- ❌ Cambios en agua (alinear con Hoja2): rechazado, "la información que ya tienes es la actualizada".
- ❌ Parámetros subcontratados en tablas de suelo: rechazado; quedan «por definir».
- ❌ Adoptar valores del PDT real para CIC/PSI/RAS, pH/CE y densidad real: rechazado (solo los dos grupos «por definir»).
- ❌ Registrar «Prueba de infiltración» en los parámetros in situ del servidor: no por ahora.

## 8. Data & facts (exact)

**Grupos de sólidos en el PDT** (columnas: GRUPO · cantidad · PRESERVANTE · RECIPIENTE · OBSERVACIONES):
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

**Valores del PDT real de ECOPETROL (monitoreo de suelos, campo de infiltración pozos sépticos) NO adoptados salvo los dos grupos:** CIC/PSI/RAS 2000 g, bolsa hermética, refrigerar < 10 °C; pH y conductividad 250 g, bolsa hermética, ambiente; densidad aparente y densidad real juntas 20 g, anillos 5x5 cm; aceites y grasas 100 g ambiente. Errores propios de ese PDT: tipo de muestreo marcado PUNTUAL con objetivo «compuesto»; observaciones hablan de «matriz de Lodos»; typos «Desidad», «Calclo», «Intercamblable».

**Diferencias de la tabla de agua del laboratorio (Hoja2) frente al código; el usuario dijo NO cambiar agua:** DQO mínimo 2000 (código) vs 1000 (Hoja2); aceites y grasas 1000 vs 2000; metales 500 vs 1000; ortofosfatos preserva «Filtración en campo» vs refrigeración; sulfuros recipiente «Vidrio ámbar» vs «plástico o vidrio, 2 envases de 250».

**Hojas ocultas de los `.xlsm`:** Hoja2 = agua (grupo, preservante, recipiente, volumen). Hoja3 y Hoja6 = suelo (mínimo de peso seco, preservación, contenedor, cantidad del monitoreo en g, tiempo máximo). Hoja5 = almacenamiento de sedimento/lodo (recipiente, preservación, duración). Discrepancias entre Hoja3 y Hoja6: pH/conductividad 100 g vs 50 g; metales pesados 50 g vs 100 g.

**Acreditación IDEAM:** Resolución 1004 del 24-ago-2026; vigencia hasta el 1-jun-2030. Res. 1004 amplía CO y NO₂ (aire). No ampliados: PM₁₀/PM₂.₅ con EDM 180 serial 18A22005 y SO₂ con APSA-370 serial 1W9EXTOR.

**Técnico:** `tsc` limpio y 175 tests (`npm test`); `npm run test:db` (RLS en Postgres 16) OK; `xlsx` 0.18.5 con 2 vulnerabilidades altas (prototype pollution y ReDoS, sin parche en npm); bundle 599 kB (176 kB gzip).

## 9. People, terms & names
- **People:** el usuario (dueño del módulo). Cliente de los PDT de ejemplo: ENEL (agua residual) y ECOPETROL (suelos). Laboratorios subcontratados nombrados en las tablas: LMB, Gaia, Serambiente, SGI, Biopolimeros (ignorados por orden).
- **Terms:** PDT = Formato de planeación de monitoreos FM-081; AT-002 / AT-003 = documentos de preservación (fisicoquímicos / subcontratados); «por definir» = sin regla; PSI = porcentaje de sodio intercambiable; CIC = capacidad de intercambio catiónico; RAS = relación de adsorción de sodio; in situ = medido en campo.
- **Names in use:** rama de Claude `claude/determined-ramanujan-rj1pl1`; archivos `src/exportar/alistamiento.ts`, `src/exportar/pdt.ts`, `tests/pdt.test.ts`, `public/fm-081.xlsx`, `src/datos/errores.ts`, `supabase/functions/gestionar-usuarios/index.ts`, `supabase/migrations/0015_errores_cliente.sql`; secreto `ALLOWED_ORIGIN`.

## 10. Work state
| Item | Status | Version / location | Notes |
|---|---|---|---|
| CORS obligatorio + reporte de errores | final, mergeado | PR #3; migración 0015 y función v5 aplicadas en Supabase | Probado creando un usuario en producción |
| Panel Envíos | final, mergeado | PR #4 | |
| PDT agua (4 parámetros) y base de sólidos | final, mergeado | PR #5 | |
| Aceites y grasas refrigerados en sólidos | final, mergeado | PR #6 | |
| Suelos: intercambiables, P/N total, unidad g, infiltración, sodio, acidez/Al/H | final, mergeado | PR #7; `main` `0ac1a5d` | |
| Validación con un plan real de suelo/sedimento/lodo | no iniciado | — | Falta Excel de plan real |
| `xlsx` vulnerable | no iniciado | `package.json` | |
| CI (GitHub Actions) y reporte de errores externo | no iniciado | no existe `.github` | |
| Piloto en campo | no iniciado | — | |

**Flujo git (no obvio):**
- La rama de Claude se rehace desde `origin/main` tras cada squash: `git checkout -B claude/determined-ramanujan-rj1pl1 origin/main`.
- El force-push lo bloquea el sistema. Para poder empujar: `git merge -s ours origin/claude/determined-ramanujan-rj1pl1` y luego `git push` normal (el diff contra `main` queda limpio).
- El bot Entire abre solo un PR en borrador por la rama (con marcador `<!-- entire-shadow-pr -->` que hay que conservar): se reutiliza, editando título y descripción. Para mergear: sacar de borrador y squash.

## 11. Next steps
1. **Next action:** pedirle al usuario un Excel de plan real (.xls de plan) de suelo, sedimento o lodo y comprobar con él que los nombres de parámetros coinciden con las reglas de `src/exportar/alistamiento.ts` (matriz detectada por texto, nombres de intercambiables, PSI, etc.); ajustar y probar.
2. Decidir con el usuario el reemplazo de `xlsx` (versión corregida del CDN de SheetJS u otra) y aplicarlo.
3. Agregar CI (tsc + `npm test`) y confirmar backups de Supabase, cabeceras de seguridad y `ALLOWED_ORIGIN`.
4. Piloto con 1 o 2 técnicos en una salida real.

## 12. Open questions ⚠️
- ¿Qué tabla manda para CIC/PSI/RAS (hoy 300-500 g ambiente, bolsa ziploc; el PDT real dice 2000 g < 10 °C), pH/conductividad (300-500 g vs 250 g) y densidad real (bolsa general vs anillos)? Sin respuesta; el usuario pidió cambiar solo los dos grupos «por definir», así que queda como está.
- Pendiente de confirmar: el bloque «ziploc, 300-500 g, 30 días» se aplicó a ocho parámetros por lectura de celdas combinadas de Hoja3; Hoja3 y Hoja6 difieren en mínimos de pH/conductividad y metales pesados.
- Preserva de metales y otros parámetros de sedimento y lodo (refrigerar, congelar o secar) y su cantidad en g.
- Granulometría sin regla: ¿misma bolsa que textura?
- Detección de matriz por texto «suelo/sedimento/lodo»: sin validar con un plan real.
- Cómo vienen escritos en los planes «Sodio intercambiable» (¿PSI o la base?) y las bases cambiables.
- Sedimento y lodo usan la misma tabla (Hoja5): supuesto sin confirmar.
- Decisión sobre el reemplazo de `xlsx`.

## 13. Re-attach checklist
- [ ] `2._PDT_ES-479-25_SUELO.xlsm` (en realidad PDT de agua residual, ENEL; sus hojas ocultas Hoja2/3/5/6 son las tablas del laboratorio): solo si hay que validar valores de nuevo; lo esencial ya está en la sección 8.
- [ ] `MONITOREO_DE_SUELOS_CAMPO_DE_INFILTRACION_POZOS_SEPTICOS_GRB.xlsm` (PDT real de suelos, ECOPETROL): ídem.
- [ ] `acreditacion-ambienciq.md` (alcance acreditado IDEAM): si se necesita revisar parámetros acreditados.
- [ ] Un Excel de plan real de suelo, sedimento o lodo: lo necesita el siguiente paso.

---
<sub>Audit: 13/13 sections · 6 rules · 5 corrections · 11 data points · secrets removed: none found · generated by active-memory</sub>
