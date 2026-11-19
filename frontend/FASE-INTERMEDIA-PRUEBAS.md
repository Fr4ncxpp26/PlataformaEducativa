# Fase intermedia — Frontend, experiencia de usuario y guía de pruebas

## Objetivo

Esta fase mejora el comportamiento del frontend antes de la fase 4 de validación funcional integral. El alcance es deliberadamente centrado en experiencia, rendimiento percibido, accesibilidad y estabilidad de la interfaz. No añade permisos de backend ni cambia el esquema de Supabase.

## Cambios incluidos

- La carga común de datos se administra desde `useApi`: el estado de carga se deriva de la clave de petición y no se activa con `setState` síncrono dentro del efecto.
- La bandeja de notificaciones y el panel administrativo usan esa misma carga común. Las acciones de lectura, lectura masiva y eliminación actualizan la vista sin obligar a recargar toda la bandeja.
- El caché es temporal y solo vive en memoria del navegador. Se limita al catálogo público (45 segundos) y a listas de opciones administrativas/de gestión (90 segundos). No se cachean sesiones, perfiles, progreso, notificaciones, estadísticas ni respuestas de autenticación. Un cambio de usuario o cualquier mutación limpia el caché.
- La tabla administrativa conserva scroll horizontal accesible en pantallas pequeñas, filtros flexibles, búsqueda con debounce y atributos semánticos.
- El editor del curso ya no sincroniza el estado de publicación mediante efectos. La previsualización abre la ficha pública real del curso publicado; no simula una ruta de aprendizaje inexistente.
- El reproductor evita renderizar dos veces el mismo recurso multimedia y ajusta el visor PDF y el contenido a pantallas estrechas.
- El menú del administrador tiene controles más claros para abrir/cerrar y atributos ARIA.
- No se agregan migraciones ni se ejecutan operaciones sobre la base de datos.

## Antes de probar

1. Usa un entorno de staging, nunca la base ni las cuentas de producción.
2. Comprueba que backend y frontend estén configurados con las variables de staging. No copies secretos en el repositorio.
3. Prepara cuentas separadas para: admin, profesor, alumno adulto, alumno menor y padre/tutor. Para probar el editor de cursos, usa una cuenta de profesor propietaria del curso y una cuenta admin.
4. Prepara un curso de pruebas con portada, varios módulos, lecciones de texto, video, PDF y al menos un cuestionario. Conserva otro curso como borrador.
5. Prepara disponibilidad de tutoría y alumnos/padres de prueba ya vinculados. No uses datos reales de menores.
6. Si se probarán notificaciones push, usa un navegador HTTPS o localhost que permita Service Worker y permisos de notificación.

## Comandos en Windows PowerShell

Abre dos terminales en la raíz del repositorio.

Terminal 1 — backend:

```powershell
Set-Location .\backend
npm ci
npm run dev
```

Terminal 2 — frontend:

```powershell
Set-Location .\frontend
npm ci
npm run lint
npm run build
npm run dev
```

Abre la URL local que indique Vite. Ejecuta `npm run lint` y `npm run build` desde `frontend`. El lint es importante: debe detectar el patrón `react-hooks/set-state-in-effect` sin desactivar la regla ni añadir excepciones para estos archivos.

## 1. Comprobación técnica de la advertencia React

1. Ejecuta `npm run lint` desde `frontend`.
2. Confirma que no aparezca `react-hooks/set-state-in-effect` en `src/hooks/useApi.ts`, `src/pages/Notifications.tsx`, `src/components/admin/ResourceTable.tsx`, `src/pages/admin/AdminDashboard.tsx` ni `src/pages/manage/CourseEditor.tsx`.
3. Navega entre varias páginas que consumen `useApi`; confirma que la pantalla muestra carga, datos y errores correctamente.
4. Cambia rápidamente entre dos cursos/páginas mientras cargan. La respuesta de una petición anterior no debe reemplazar los datos de la página actual.
5. Desconecta la red durante una carga y vuelve a conectarla. Debe mostrarse el error y permitir reintentar; no debe quedar un spinner permanente.
6. Usa React Strict Mode en desarrollo, si está activo en el proyecto, y comprueba que las peticiones duplicadas no generen actualizaciones fuera de la vista.

## 2. Caché de navegador

Usa DevTools → Network y conserva el registro de red:

1. Abre el catálogo público y vuelve a consultar exactamente la misma ruta durante los siguientes 45 segundos. La segunda lectura debe poder resolverse desde la caché en memoria.
2. Espera a que expire ese intervalo y vuelve a entrar/actualizar. Debe consultar de nuevo al servidor.
3. Consulta una lista de opciones del editor/administración y repite la lectura antes de 90 segundos.
4. Crea, edita o elimina un registro y repite la consulta. La mutación debe invalidar la caché para no mostrar el valor anterior.
5. Inicia sesión como cuenta A, visita el catálogo y cierra sesión. Inicia sesión como cuenta B en el mismo navegador. Comprueba que no aparecen datos privados de A.
6. Verifica que perfiles, progreso, tutorías, notificaciones, sesiones y estadísticas sigan llegando al servidor; no deben quedar guardados en caché.
7. Cierra la pestaña y vuelve a abrir el sitio: la caché de esta implementación desaparece al terminar la sesión de la página, porque no se guarda en localStorage ni IndexedDB.

Resultado esperado: menos lecturas repetidas del catálogo y listas de opciones, sin almacenar permanentemente información sensible ni compartir respuestas entre usuarios.

## 3. Administrador

Inicia sesión como admin y recorre:

1. Abre el panel principal. Actualiza estadísticas varias veces y comprueba estados de carga, error y reintento.
2. Abre usuarios, materias, cursos, inscripciones, tutores/vínculos, tutorías, pagos, certificados, logros y auditoría.
3. En las tablas, busca, combina filtros, cambia de página, crea/edita/elimina registros de prueba y confirma que la lista se actualice y la página vuelva a una posición válida.
4. En un teléfono/tablet, desplaza horizontalmente las tablas sin que la página completa se desborde.
5. Navega usando Tab, Shift+Tab, Enter y Escape. Los botones de acciones deben tener nombres accesibles y los diálogos deben poder cerrarse con el control de cierre y Escape.
6. Abre el menú hamburguesa, navega a otra sección, ciérralo y vuelve a abrirlo. Comprueba que el contenido no quede cubierto por el menú y que el foco no desaparezca.

## 4. Profesor y editor del curso

Inicia sesión como profesor propietario de un curso de prueba:

1. Abre el panel del profesor y verifica enlaces a cursos y tutorías.
2. Crea un curso en borrador. Completa título, descripción y portada.
3. Agrega módulos, lecciones de texto, video y PDF. Cambia el orden, edita y guarda.
4. Configura una evaluación/cuestionario y revisa que los cambios persistan al salir y volver a entrar.
5. Comprueba la barra de preparación del curso: cada elemento debe reflejar los datos reales.
6. Intenta publicar un curso incompleto y confirma que la interfaz impida la acción. Completa los requisitos y publica el curso de prueba.
7. Abre la previsualización pública. Debe cargar la ficha en `/cursos/:slug`, no una ruta de aprendizaje. Comprueba también el enlace que abre la ficha en una pestaña nueva.
8. Pasa el curso nuevamente a borrador y verifica que la previsualización deje de ofrecerse.
9. En otra cuenta de profesor que no sea propietaria, intenta abrir el editor de ese curso. El backend debe seguir denegando la acción; no se debe confiar solo en ocultar enlaces del frontend.
10. Abre la agenda de tutorías, revisa disponibilidad y gestiona una sesión de prueba.

## 5. Alumno adulto

1. Abre el dashboard y verifica cursos, progreso, logros y accesos.
2. Explora el catálogo, abre una ficha y entra a un curso disponible.
3. En el reproductor recorre el menú de unidades y lecciones.
4. Comprueba contenido de texto, video y PDF. El recurso no debe aparecer duplicado ni provocar scroll horizontal innecesario.
5. Completa una lección y un cuestionario válido; verifica el progreso, puntos, logros y certificado según las reglas configuradas.
6. Intenta abrir una lección bloqueada; la interfaz no debe permitir avanzar antes de cumplir los requisitos.
7. Abre tutorías, consulta disponibilidad, reserva una sesión de prueba y comprueba su estado. Prueba cancelación y notificación relacionada.
8. Comprueba que el ranking esté disponible para el alumno adulto, conforme a las reglas actuales.

## 6. Alumno menor

1. Repite catálogo, ficha, curso, lecciones, cuestionarios y progreso con una cuenta de menor.
2. Revisa que no se muestre el ranking que está reservado a adultos.
3. Revisa los avisos y notificaciones: no deben exponer información privada en el cuerpo de las notificaciones push.
4. Comprueba que no haya acceso a pantallas administrativas ni a datos de otros alumnos.
5. Realiza una tutoría de prueba y confirma que el historial y los avisos se muestren a los participantes autorizados.

## 7. Padre/tutor

1. En una cuenta de prueba, canjea una invitación y verifica el vínculo con el alumno menor.
2. Abre el panel del tutor y selecciona al menor vinculado.
3. Consulta información permitida, progreso, cursos, logros y actividad.
4. Prueba con un segundo menor que no esté vinculado. No debe poder consultarse.
5. Prueba un vínculo sin datos y estados vacíos; deben explicarse con texto claro, sin pantallas rotas.
6. Comprueba la navegación móvil y el acceso de regreso al panel del tutor.

## 8. Notificaciones

1. Genera al menos un evento real de cada categoría que se vaya a probar.
2. Enciende y apaga una preferencia por categoría y genera un evento nuevo para verificar que se respete.
3. Marca una notificación como leída, marca todas y elimina una. Comprueba el contador y que la lista se actualice sin recargar manualmente.
4. Activa push en un dispositivo de prueba y manda una notificación de prueba.
5. Comprueba la llegada con la página cerrada y la apertura de la ruta interna desde el aviso.
6. Antes de desactivar push globalmente, prueba “Desvincular solo este dispositivo”. Después prueba desactivar push en todos los dispositivos y confirma que ya no haya entregas.
7. Verifica que el permiso denegado/no soportado muestre una explicación accionable y que el resto de la bandeja siga funcionando.

## 9. Menús, tamaños y accesibilidad

Repite los flujos principales en estos tamaños de viewport:

| Dispositivo de prueba | Viewport aproximado |
| --- | --- |
| Teléfono pequeño | 360 × 800 |
| Teléfono habitual | 390 × 844 |
| Tablet vertical | 768 × 1024 |
| Tablet horizontal | 1024 × 768 |
| Escritorio | 1440 × 900 |

En cada tamaño comprueba:

- El menú hamburguesa abre/cierra y no tapa los controles importantes.
- Los encabezados, botones y filtros no se cortan.
- No existe scroll horizontal de la página completa. El scroll horizontal debe quedar limitado a tablas o elementos que realmente lo necesitan.
- El texto se puede ampliar al 200% sin perder controles.
- Se puede recorrer la interfaz con teclado y el foco visible tiene contraste suficiente.
- Los formularios tienen etiquetas, los iconos decorativos están ocultos a lectores de pantalla y los botones de solo icono tienen nombre accesible.
- Los estados de carga, éxito, error y listas vacías se entienden sin depender solo del color.

## 10. Editor como rol separado

El repositorio contiene un rol `editor`, pero la autorización de gestión de cursos en el backend actualmente está reservada a `admin` y `profesor`. Esta fase no le concede permisos nuevos. Si “editor” debe ser un rol que pueda crear/publicar cursos, debe definirse primero qué acciones puede realizar y actualizar backend, permisos y pruebas de seguridad en una tarea explícita. Mientras no se decida, prueba que el rol editor no obtiene acceso accidental a rutas de gestión.

## Criterios para dar esta fase por validada

- `npm run lint` y `npm run build` del frontend finalizan sin errores.
- CI confirma los mismos controles en la rama.
- Los recorridos por rol pasan en staging.
- No hay cruces de datos tras cambiar de cuenta.
- El catálogo/opciones respetan los TTL y la invalidación del caché.
- Los principales recorridos funcionan en teléfono, tablet y escritorio.
- No hay regresiones de autenticación, permisos, reservas, progreso ni notificaciones.

Registra cada caso como **Aprobado / Fallido / Bloqueado**, incluyendo cuenta/rol, tamaño de pantalla, pasos, resultado esperado y resultado real. Si falla, anota la ruta, captura y mensaje exacto.

## Límites de esta fase

La compilación y el lint no sustituyen pruebas reales de integración. Las pruebas de pagos deben usar Stripe en modo de prueba; las notificaciones push necesitan navegador compatible y claves VAPID de staging. La fase 4 seguirá siendo la auditoría final de todos los flujos y permisos antes de considerar producción.
