---
title: "Instructivo para el usuario de oficina"
subtitle: "Monitoreos de campo · Ambienciq Ingenieros S.A.S"
lang: es-CO
---

# 1. Para qué sirve

El panel de oficina de **Monitoreos de campo** le permite:

- cargar los planes de monitoreo (Excel) y asignarlos a las comisiones;
- administrar los usuarios y los parámetros que se miden in situ;
- ver el avance de cada plan y exportar los resultados (Excel, fotos, cadena de custodia FM-017 y PDT FM-081);
- consultar y, si hace falta, anular los envíos de muestras al laboratorio.

Las comisiones trabajan en el teléfono, sin internet, y sincronizan cuando hay señal. **Usted ve lo que ya se sincronizó.**

# 2. Ingreso

1. Abra la aplicación (https://mobile-monitoreos.vercel.app o el APK).
2. Escriba su **usuario** y contraseña. Las cuentas de oficina creadas con correo entran con el **correo completo** en el campo «Usuario».
3. Al entrar se muestra el panel con cuatro pestañas: **Planes**, **Cargar plan**, **Parámetros in situ** y **Usuarios**.

La sesión dura como máximo 16 horas.

# 3. Usuarios

Pestaña **Usuarios**.

## Crear un usuario

1. Escriba el **usuario** (minúsculas, sin espacios; no necesita correo), el **nombre** completo y el **rol**:
   - **Comisión de muestreo:** técnicos de campo.
   - **Oficina:** acceso a este panel.
2. Opcional: escriba una **contraseña** (8 a 72 caracteres). Si la deja vacía, la aplicación **genera una de 12 caracteres**.
3. Toque **Crear usuario**.
4. Si la contraseña fue generada, aparece en pantalla. **Anótela y entréguela ahora: no se vuelve a mostrar.** Toque **Listo**.

## Otras acciones

| Botón | Para qué |
|---|---|
| **Desactivar / Activar** | Bloquea o devuelve el acceso (por ejemplo, quien deja la empresa). No puede desactivarse a sí mismo. |
| **Nueva contraseña** | Si el técnico la olvidó: escriba una nueva o déjela vacía para generarla y toque **Guardar contraseña**. |

# 4. Parámetros in situ

Pestaña **Parámetros in situ**. Define qué se mide en campo, con qué unidad y en qué rango.

1. En la lista **Elige un parámetro de los planes cargados…** seleccione uno, complete **unidad**, **mínimo**, **máximo** y si es **obligatorio**, y toque **Agregar**.
2. Para cambiar uno existente, modifique sus datos y toque **Guardar**. Para sacarlo de la lista, **Quitar** y **Confirmar quitar**.
3. Toque **Aplicar a planes cargados** para marcar el parámetro como in situ en los planes que ya están cargados. (Los planes que cargue después lo toman solos.)
4. **Cada teléfono debe pulsar «Actualizar»** en su plan, con internet, para recibir el cambio.

> El mínimo y el máximo sirven para avisar de valores sospechosos (pH de 15, por ejemplo). Fuera de rango, el técnico debe confirmar; no se bloquea el registro.

# 5. Cargar un plan

Pestaña **Cargar plan**.

1. Seleccione el archivo Excel (.xls o .xlsx) del plan.
2. Revise el **nombre del plan** y la sección **Validaciones**: los errores (en rojo) impiden guardar; corrija el Excel y vuelva a cargarlo.
3. Si ya existe un plan con ese nombre, la aplicación avisa. Elija **Guardar de todos modos** solo si es otro plan; de lo contrario, **Cancelar**.
4. Toque **Guardar plan**.

El plan aparece en la pestaña **Planes**, sin asignar.

# 6. Planes

Pestaña **Planes**. Cada plan muestra su **avance** (muestras cerradas, mediciones) y **Asignado a** (quién lo trabaja).

## Asignar un plan

1. En **Asignar a…**, elija la comisión (el técnico).
2. Opcional: en **Segundo integrante (opcional)**, elija al compañero. Un plan admite **hasta dos integrantes**, que ven y completan los mismos datos.
3. Toque **Asignar**.

Los técnicos también pueden tomar un plan libre desde su teléfono con **Tomar este plan**.

> **Liberar y reasignar con cuidado.** Si el técnico no sincronizó, sus datos siguen en su teléfono y no llegarán al nuevo responsable. Antes de liberar o reasignar, confirme que sincronizó. Si ya ocurrió, pida su **Exportación de emergencia** (ver más abajo).

**Liberar** deja el plan sin asignar. La aplicación pide confirmación (**Confirmar**).

## Datos del plan

Toque **Datos del plan** para llenar la ficha que usan la cadena de custodia y el PDT: cliente, dirección, contacto, teléfonos, código de muestreo y cotización. Toque **Guardar**. Se llena una vez por plan.

## Exportar resultados

| Botón | Qué entrega |
|---|---|
| **Exportar** | Excel con muestras, mediciones (con versiones y correcciones), descripciones y datos de calidad. |
| **Fotos (.zip)** | Todas las fotos del plan, organizadas por muestra. |
| **Custodia: todo el plan** | PDF FM-017 con todas las muestras del plan (7 por hoja). |
| **PDT** | Formato de planeación FM-081 en Excel, con puntos, matriz, tipo de muestreo, parámetros agrupados por preservación (AT-002 / AT-003) y parámetros in situ. Revise coordenadas y altitud, que se completan a mano. |

# 7. Envíos al laboratorio

Las muestras no salen todas el mismo día. Cada **envío** reúne las muestras cerradas que salen en una fecha, y tiene su propia cadena de custodia. **Una muestra va en un solo envío.**

En un plan, toque **Envíos**:

- Verá cada envío con su fecha y el número de muestras, y podrá **descargar su PDF** (FM-017).
- También puede **crear un envío** con las muestras cerradas que aún no se han enviado (mismo formulario que en el teléfono: fecha, medio de transporte, verificaciones de campo, testigo de temperatura, responsable de entrega y observaciones).

## Anular un envío

Solo la oficina puede anular.

1. En **Envíos**, toque **Anular** junto al envío.
2. Escriba el **motivo** (obligatorio).
3. Toque **Confirmar anulación**. Las muestras quedan libres para ir en otro envío.

Los teléfonos reciben la anulación al tocar **Actualizar**.

# 8. Importar una exportación de emergencia

Si un técnico no pudo sincronizar (plan liberado o reasignado, sin señal por días), le entregará un archivo **.json** (**Exportación de emergencia**).

1. En **Planes**, busque **Importar exportación de emergencia (.json)**.
2. Seleccione el archivo.
3. La aplicación sube lo que falta; lo que ya estaba en el sistema no se duplica.

# 9. Rutina recomendada

**Antes de la salida**

1. Cargue el plan y llene **Datos del plan**.
2. Revise **Parámetros in situ**.
3. Cree los usuarios nuevos y entregue contraseñas.
4. **Asigne** el plan (y el segundo integrante).
5. Pida a los técnicos que lo descarguen con internet.

**Durante el muestreo**

- Consulte el **avance** en la pestaña **Planes**.
- Si hay envíos, descargue la cadena de custodia desde **Envíos**.

**Al terminar**

1. Confirme con los técnicos que sincronizaron (avance completo).
2. Descargue **Exportar**, **Fotos (.zip)** y **PDT**.
3. Si hace falta, **Custodia: todo el plan**.

# 10. Problemas frecuentes

| Situación | Qué hacer |
|---|---|
| El avance no se mueve | El técnico no ha sincronizado. Que abra la aplicación con internet y toque **Sincronizar**. |
| Un técnico no puede entrar | Revise que esté **activo**. Si olvidó la contraseña, **Nueva contraseña**. |
| Un valor aparece «Rechazada por servidor» | Revise el detalle con el técnico; puede corregirlo (nueva versión con motivo). |
| Envío creado por error | **Anular** con motivo y crear el correcto. |
| Un técnico perdió el teléfono | Asigne el plan a su cuenta en otro teléfono; lo ya sincronizado se recupera. Lo pendiente solo existe en el teléfono perdido. |
| El nombre de usuario no se acepta | Use minúsculas, sin espacios ni tildes. Si el sistema rechaza el usuario sin correo, avise al administrador del proyecto. |
| Cambié parámetros in situ y el técnico no los ve | Debe tocar **Actualizar** en su plan, con internet. |

# 11. Buenas prácticas

- Entregue contraseñas por un canal privado y pida cambiarlas si se compartieron.
- Desactive usuarios que ya no trabajan en la empresa en lugar de dejarlos activos.
- No libere ni reasigne planes sin confirmar la sincronización.
- Descargue y archive **Exportar** y **Fotos (.zip)** al terminar cada plan.
