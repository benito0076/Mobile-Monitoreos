---
title: "Instructivo para técnicos de campo"
subtitle: "Monitoreos de campo · Ambienciq Ingenieros S.A.S"
lang: es-CO
---

# 1. Para qué sirve

La aplicación **Monitoreos de campo** reemplaza el registro en papel de las mediciones in situ. Con ella usted:

- ve las muestras de su proyecto y registra los valores medidos en cada punto;
- guarda la descripción del punto y las fotos;
- cierra cada muestra cuando termina;
- prepara el **envío** de las muestras al laboratorio y genera la cadena de custodia (FM-017).

**Funciona sin internet.** Todo queda guardado en el teléfono y se envía a la oficina cuando hay señal.

# 2. Antes de salir a campo

Con conexión a internet (en la oficina o con datos móviles):

1. **Instale la aplicación.** La oficina le entrega el instalador (APK) o le indica cómo agregar la página a la pantalla de inicio. Abra la aplicación al menos una vez con internet.
2. **Entre con su usuario y contraseña.** Se los entrega la oficina. Escriba el usuario en minúsculas y sin espacios.
3. **Permita el acceso a la ubicación y a la cámara** cuando el teléfono lo pida. Sin la ubicación las mediciones quedan sin coordenadas.
4. **Descargue su proyecto** (ver sección 3). Sin este paso no hay muestras para registrar.
5. **Compruebe la hora del teléfono.** Debe estar en automático. Si el reloj está desfasado más de 5 minutos, las mediciones quedan marcadas para revisión.
6. **Cargue la batería** y lleve un cargador portátil.

> La sesión dura como máximo **16 horas**. Si se cierra, vuelva a entrar con su usuario y contraseña (también funciona sin internet si ya había entrado antes en ese teléfono).

# 3. Descargar su proyecto

Al entrar por primera vez aparece **Elige tu plan** con los proyectos disponibles.

| Botón | Qué significa |
|---|---|
| **Descargar** | El proyecto ya está asignado a usted (o a usted y a su compañero). Es lo normal. |
| **Tomar este plan** | El proyecto no tenía a nadie asignado y usted lo toma. Si otra comisión lo tomó antes, la aplicación se lo dice. |
| **Actualizar** | El proyecto ya está en su teléfono; vuelve a bajar los cambios de la oficina (por ejemplo, la lista de parámetros in situ). |

Si tiene varios proyectos, use **Plan en uso** para cambiar de uno a otro y **Ver o descargar otros planes** para bajar más. Solo se trabaja con un proyecto a la vez.

**Pida a la oficina que le asigne el proyecto antes de salir.** Una vez descargado, puede trabajar sin conexión todo el tiempo que necesite.

# 4. La lista de muestras

Muestra todas las muestras del proyecto. Cada una indica:

- su **código** y el nombre del punto;
- su **estado**: *pendiente* (nadie la ha abierto), *en campo* (ya se abrió) o *cerrada* (terminada);
- cuántas mediciones in situ lleva (por ejemplo, **in situ 3/5**) o, si es una muestra compuesta, cuántas **alícuotas**;
- **enviada dd/mm/aaaa**, cuando ya salió hacia el laboratorio.

Si el proyecto tiene muchas muestras, aparece un buscador (por código o punto) y un filtro por estado.

Toque **Abrir** para registrar una muestra. Al abrirla pasa sola a *en campo*.

# 5. Registrar una muestra

## 5.1 Mediciones in situ

Cada parámetro tiene su casilla. Para registrar un valor:

1. Escriba el número (con punto o con coma). Escriba solo el número, sin unidades.
2. Toque **Guardar** (o la tecla Enter). La aplicación lee **sola** la ubicación y guarda el valor con la hora, el usuario y el teléfono.

Al guardar, la fila muestra el valor, la unidad, la hora y la precisión del GPS (por ejemplo, *GPS ±8 m*).

**Avisos que puede ver**

- **«Valor fuera del rango plausible»:** el número parece un error de digitación (por ejemplo, un pH de 15). Revíselo. Si es correcto, toque **Guardar así**; si no, **Cancelar**.
- **«Precisión del GPS…» o «Sin señal GPS» en rojo:** la medición **sí se guardó**, pero queda señalada. Si está en un sitio abierto y quiere mejorar la ubicación, corrija la medición (ver 5.2).
- **«Rechazada por servidor»:** la oficina debe revisarla. Avísele.
- **«obligatorio»:** parámetro que no debe quedar sin medir.

## 5.2 Corregir un valor

Un valor guardado **no se borra ni se edita**. Para corregirlo:

1. Toque **Corregir** junto al valor.
2. Escriba el valor correcto y el **motivo de la corrección** (obligatorio).
3. Toque **Guardar corrección**.

Queda una versión nueva (v2, v3…) y la anterior se conserva en el historial. Esto protege los datos y es lo que pide el sistema de calidad.

## 5.3 Muestras compuestas (alícuotas)

En una muestra compuesta se mide cada parámetro **en cada alícuota**.

- Aparece **Alícuota 1** con todos los parámetros in situ.
- Cuando termine esa alícuota, toque **+ Agregar alícuota** para abrir la siguiente.
- Si abrió una alícuota de más y está vacía, toque **Quitar alícuota vacía**.
- Cada alícuota guarda su propia hora y ubicación. Las correcciones también son por alícuota.

## 5.4 Descripción del punto

Escriba cómo está el punto y las condiciones observadas (clima, olor, color, caudal, presencia de obras…) y toque **Guardar descripción**. Para cambiarla use **Corregir**, que también pide motivo.

## 5.5 Fotos

1. En **Fotos**, toque **Seleccionar archivo** y elija la cámara.
2. Tome la foto. La aplicación la reduce de tamaño y la guarda con la ubicación.
3. Si la foto salió mal y **aún no se ha sincronizado**, toque la **×** de la miniatura y confirme con **Borrar**.

Tome fotos del punto, del recipiente rotulado y de lo que sea relevante para la oficina.

## 5.6 Cerrar la muestra

Cuando termine de medir y describir el punto, toque **Cerrar muestra**.

- Si falta algún parámetro obligatorio o la descripción, la aplicación se lo avisa. Puede completarlo o elegir **Cerrar de todos modos**.
- **Una muestra cerrada no se reabre.** Si después descubre un error, se corrige con una versión nueva, no se reabre la muestra.

# 6. Sincronizar (enviar los datos a la oficina)

El botón de arriba dice **Sincronizar (N pendientes)**. Los pendientes son lo que aún no llegó a la oficina.

- Es **automático**: al recuperar la señal y cada minuto mientras haya pendientes.
- También puede tocar el botón. Al terminar dice **Todo sincronizado.**
- Al sincronizar la aplicación también **baja lo que registró su compañero** en el mismo proyecto.
- Si algo no se pudo enviar, aparece una lista de errores. Tome captura de pantalla y avise a la oficina.

**Reglas importantes**

1. **Sincronice al terminar la jornada**, antes de cerrar la sesión o de apagar el teléfono.
2. **No desinstale la aplicación ni borre los datos** del navegador mientras haya pendientes.
3. Lo ya sincronizado se conserva en el teléfono 7 días y luego se limpia solo.
4. Si cierra sesión con pendientes, la aplicación se lo advierte. Y si otra persona entra en su teléfono, le avisa que usted dejó datos sin enviar.

## Exportación de emergencia

Si no logra sincronizar (por ejemplo, el proyecto se reasignó o no tiene señal en días), toque **Exportación de emergencia**. Se descarga un archivo (.json) con **todo lo guardado en el teléfono, fotos incluidas**. Entréguelo a la oficina por correo o mensajería: ellos pueden importarlo al sistema.

# 7. Envíos al laboratorio y cadena de custodia

Cuando el proyecto tiene muchos puntos, no todas las muestras salen el mismo día. Cada **envío** es el lote de muestras que sale un día determinado, con su cadena de custodia (formato FM-017).

1. Cierre las muestras que va a enviar.
2. En la lista de muestras toque **Envíos al laboratorio**.
3. Aparecen las muestras **cerradas que todavía no se han enviado**, todas marcadas. **Quite la marca de las que no van** en este envío.
4. Complete:
   - **Fecha del envío** (por defecto, hoy);
   - **Medio de transporte** (terrestre, aéreo, acuático u otro);
   - **Verificado en campo:** marque solo lo que realmente verificó (marcación del nivel, preservación, refrigeración en cada nevera, rotulación). Lo que no marque queda en blanco en el formato;
   - **Testigo de temperatura** (°C);
   - **Responsable de la entrega** (por defecto, usted) y **Observaciones**.
5. Toque **Crear envío y generar cadena de custodia**. Se descarga el **PDF** del FM-017 con solo esas muestras.
6. Imprima el PDF (o muéstrelo al transportador) y acompañe con él las muestras. El laboratorio completa la recepción.

**Para tener en cuenta**

- Una muestra va en **un solo envío**. Si intenta incluirla otra vez, la aplicación se lo impide.
- Puede volver a descargar el PDF de cualquier envío desde **Envíos de este plan**.
- Si se equivocó al armar el envío, **avise a la oficina**: ellos pueden anularlo y las muestras quedan libres.
- El envío se crea aunque no haya internet; se sincroniza después. Mientras tanto aparece **sin sincronizar**.
- Las fechas y horas de cada muestra en el formato salen de sus mediciones. Si una muestra no tiene mediciones, esos campos quedan en blanco.

# 8. Buenas prácticas

- Mida y registre **en el punto**, no al final del día de memoria.
- Espere a que el valor del equipo se **estabilice** antes de guardarlo.
- Use **Corregir** con un motivo claro (por ejemplo, «error de lectura del equipo»).
- Revise la **descripción** y las **fotos** antes de cerrar.
- No comparta su contraseña. Cada integrante entra con su propio usuario.
- Si trabaja con un compañero, cada uno sincroniza su teléfono; la aplicación junta ambos registros.
- Avise a la oficina de cualquier punto que no pudo muestrear: la muestra queda sin cerrar y se explica en la descripción.

# 9. Problemas frecuentes

| Situación | Qué hacer |
|---|---|
| «Usuario o contraseña incorrectos» | Revise mayúsculas y espacios. Si la olvidó, pida a la oficina una contraseña nueva. |
| No aparece mi proyecto | Verifique que la oficina se lo asignó y toque **Ver o descargar otros planes** con conexión. |
| Falta un parámetro in situ en una muestra | La oficina puede haber cambiado la lista. Con conexión, toque **Actualizar** en el proyecto. |
| «Sin señal GPS» o precisión mala | Salga a un lugar abierto, active la ubicación del teléfono y corrija la medición si es necesario. |
| Quedan pendientes y no sincroniza | Verifique que tiene datos móviles o Wi-Fi y toque **Sincronizar**. Si persiste, use **Exportación de emergencia** y avise a la oficina. |
| Aparece un error rojo en una medición | Tome captura de pantalla del mensaje y envíela a la oficina. |
| Cerré una muestra por error | No se reabre. Si faltaban datos, corrija con **Corregir**; si la muestra no debe contarse, avise a la oficina. |
| «La muestra ya va en otro envío» | Su compañero o la oficina ya la enviaron. Avise a la oficina para anular el envío equivocado. |
| Cambié de teléfono | Entre con su usuario en el teléfono nuevo y descargue el proyecto. Lo ya sincronizado vuelve a bajar; lo pendiente del teléfono viejo se recupera con su exportación de emergencia. |

# 10. Resumen de una jornada

1. Con internet: abrir la aplicación, **Actualizar** el proyecto y comprobar que no hay pendientes.
2. En el punto: abrir la muestra, medir y **Guardar** cada parámetro, escribir la descripción, tomar fotos y **Cerrar muestra**.
3. Al final del día: **Sincronizar** hasta ver **Todo sincronizado.**
4. Si hay muestras para el laboratorio: **Envíos al laboratorio**, crear el envío e imprimir el FM-017.
5. Cargar el teléfono para el día siguiente.
