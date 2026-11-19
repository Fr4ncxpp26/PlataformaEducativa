# Fase 3 — Notificaciones internas y Web Push

## Alcance implementado

- Bandeja de notificaciones por usuario y contador de no leídas.
- Marcar una notificación como leída, marcar todas y eliminar.
- Preferencias independientes para tutorías, actividad académica, cursos, cuenta y sistema.
- Suscripciones Web Push por dispositivo con límite de 10 por cuenta.
- Web Push cifrado con AES-128-GCM y autenticación VAPID P-256; no se añade una dependencia npm de push.
- Service Worker en `frontend/public/sw.js`.
- Mensajes push genéricos para no exponer nombres de menores, calificaciones ni datos privados en pantallas bloqueadas.
- Avisos internos al reservar, actualizar y cancelar tutorías.
- Avisos al publicar un curso (alumnos adultos y menores).
- Avisos de logros para el alumno y avisos neutros para los tutores vinculados.
- Recordatorios de tutorías programadas aproximadamente 15 minutos antes, mediante cron externo autenticado por secreto.

## Orden de despliegue en staging

Las migraciones de fase 2 y fase 3 se prueban juntas en orden:

1. `202611110001_atomic_tutoring_and_guardian_invites.sql`
2. `202611110002_secure_definer_function_privileges.sql`
3. `202611110003_prevent_self_assigned_minor_role.sql`
4. `202611190001_notifications.sql`

Ejecuta cada archivo desde Supabase SQL Editor o mediante tu flujo normal de migraciones. No ejecutes las migraciones en producción durante la validación.

La migración 4 crea:
- `notifications`
- `notification_preferences`
- `notification_subscriptions`

Activa RLS en las tres tablas. La bandeja y preferencias tienen lectura de solo propietario para `authenticated`; no hay permisos directos de escritura para el navegador. Las suscripciones no tienen permisos directos de cliente. Las operaciones de escritura y push pasan por el backend con `service_role`.

## Configurar Web Push (VAPID)

Desde la raíz del repositorio:

```bash
node backend/scripts/generate-vapid-keys.mjs
```

El script genera tres valores. Configura en el entorno del **backend**:

```dotenv
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:soporte@tudominio.com
```

- Usa el correo real de soporte o una URL HTTPS de contacto en `VAPID_SUBJECT`.
- `VAPID_PRIVATE_KEY` es secreta y solo existe en el backend.
- No uses el prefijo `VITE_` para estas variables.
- No copies claves en archivos del frontend, repositorio público, logs ni tickets.
- El par público/privado debe ser del mismo comando/ejecución.

Si las claves no están configuradas, la bandeja interna sigue funcionando; la API devuelve `PUSH_NOT_CONFIGURED` y la interfaz informa que push no está disponible.

## Configurar recordatorios de tutoría

Define un secreto aleatorio de al menos 32 caracteres en el entorno del backend:

```dotenv
NOTIFICATIONS_CRON_SECRET=un_secreto_aleatorio_largo_de_32_o_mas_caracteres
```

Configura un cron externo (Render Cron, GitHub Actions programado, Supabase Cron o un servicio equivalente) para llamar **cada 5 minutos**:

```http
POST https://TU_BACKEND/internal/notifications/tutoring-reminders
Authorization: Bearer TU_NOTIFICATIONS_CRON_SECRET
Content-Type: application/json
```

El endpoint está fuera de `/api` para que la protección CSRF de navegador de la fase 2 no bloquee llamadas servidor-a-servidor. Se autentica mediante comparación en tiempo constante del secreto.

El proceso consulta sesiones con estado `programada` entre 10 y 16 minutos desde la ejecución. La ventana se solapa intencionalmente y `dedupe_key` impide duplicados. El cron no contiene un nombre, email, título de curso ni dato personal en el payload push.

No configures este cron apuntando a producción hasta que hayas probado las migraciones y los flujos en staging.

## Configuración del frontend

- El Service Worker se sirve como `/sw.js` con alcance `/`.
- Push requiere HTTPS en producción. `localhost` funciona para desarrollo.
- El permiso de navegador lo solicita el usuario mediante el botón "Activar en este dispositivo".
- El usuario puede desactivar push globalmente, quitar un dispositivo o cambiar las categorías.
- La plataforma no solicita permiso de notificaciones automáticamente al iniciar sesión.

## Endpoints

Todos los endpoints bajo `/api/notifications` requieren sesión válida y pasan por CSRF para mutaciones:

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/notifications` | Bandeja y contador |
| GET | `/api/notifications/preferences` | Preferencias y disponibilidad |
| PATCH | `/api/notifications/preferences` | Cambiar preferencias |
| GET | `/api/notifications/push/config` | Clave pública VAPID |
| POST | `/api/notifications/push/subscriptions` | Registrar dispositivo |
| DELETE | `/api/notifications/push/subscriptions` | Quitar dispositivo |
| POST | `/api/notifications/push/test` | Enviar aviso de prueba (3/hora) |
| POST | `/api/notifications/read-all` | Marcar toda la bandeja como leída |
| PATCH | `/api/notifications/:id/read` | Marcar una notificación |
| DELETE | `/api/notifications/:id` | Eliminar una notificación |

## Guía de pruebas manuales

### A. Migración y seguridad de datos
- [ ] Ejecutar las cuatro migraciones en orden en staging.
- [ ] Confirmar que se crearon las tres tablas y sus índices.
- [ ] Confirmar RLS habilitado en las tres tablas.
- [ ] Con sesión del usuario A, comprobar que no se leen notificaciones/preferencias del usuario B.
- [ ] Con anon, comprobar que las nuevas tablas no son accesibles.
- [ ] Confirmar que un cliente autenticado no puede insertar/actualizar/eliminar directamente notificaciones ni leer suscripciones.
- [ ] Confirmar que el backend con service_role puede consultar y escribir.

### B. Bandeja y preferencias
- [ ] Iniciar sesión como alumno adulto y abrir `/notificaciones`.
- [ ] Repetir con alumno menor, padre/tutor, profesor, editor y admin.
- [ ] Confirmar que cada cuenta solo ve su bandeja.
- [ ] Marcar una notificación y después todas como leídas.
- [ ] Eliminar una notificación.
- [ ] Desactivar una categoría y comprobar que deja de generar nuevos avisos de esa categoría.
- [ ] Recargar y confirmar que las preferencias persisten.
- [ ] Confirmar que el contador del encabezado se actualiza después de abrir/leer y por polling.

### C. Web Push
- [ ] Configurar el par VAPID en el backend de staging.
- [ ] Acceder por HTTPS (o localhost).
- [ ] Activar push desde un navegador y aceptar el permiso.
- [ ] Confirmar que el dispositivo se inserta en `notification_subscriptions`.
- [ ] Enviar la notificación de prueba desde la página de ajustes.
- [ ] Comprobar que la notificación aparece con texto genérico, sin nombres ni calificaciones.
- [ ] Hacer clic en la notificación y confirmar que abre la plataforma en `/notificaciones` o en la ruta interna prevista.
- [ ] Registrar un segundo dispositivo y verificar que ambos pueden recibir.
- [ ] Desactivar push y confirmar que dejan de enviarse avisos push, pero la bandeja interna sigue funcionando.
- [ ] Quitar un solo dispositivo y confirmar que los demás siguen registrados.
- [ ] Revocar el permiso desde el navegador y probar recuperación/re-registro.
- [ ] Probar un navegador sin soporte push: la bandeja debe seguir funcionando.

### D. Eventos reales
- [ ] Reservar una tutoría como alumno: crear aviso para alumno y profesor.
- [ ] Cancelar como alumno: avisar al profesor.
- [ ] Cancelar como profesor: avisar al alumno.
- [ ] Actualizar URL/notas de tutoría como profesor: avisar al alumno.
- [ ] Crear y cancelar una tutoría desde el panel admin: avisar a ambos participantes.
- [ ] Publicar un curso que estaba en borrador: avisar a alumnos adultos y menores.
- [ ] Editar un curso ya publicado sin despublicarlo: no emitir otro aviso de publicación.
- [ ] Completar una lección y desbloquear un logro: avisar al alumno.
- [ ] Si el alumno está vinculado a un padre/tutor, enviar un aviso neutro al tutor.
- [ ] Desactivar una categoría y verificar que sus eventos no insertan avisos.

### E. Recordatorios programados
- [ ] Configurar `NOTIFICATIONS_CRON_SECRET` en staging.
- [ ] Llamar al endpoint sin Authorization: debe responder 401.
- [ ] Llamar con un secreto incorrecto: debe responder 401.
- [ ] Llamar con el secreto correcto: debe responder 200.
- [ ] Crear una tutoría a 12-15 minutos en el futuro y ejecutar el cron.
- [ ] Confirmar aviso interno para alumno y profesor.
- [ ] Ejecutar dos veces dentro de la ventana: no deben duplicarse los avisos.
- [ ] Confirmar que sesiones canceladas no generan recordatorios.
- [ ] Confirmar que las preferencias de tutorías desactivadas se respetan.

### F. Regresión de fases anteriores
- [ ] Login, refresh, logout y OAuth.
- [ ] Registro de adulto y padre/tutor.
- [ ] Creación de menor con asignación correcta de rol.
- [ ] Reservas concurrentes y protección contra solapamientos.
- [ ] Canje y generación de invitaciones.
- [ ] Gestión de cursos y permisos por profesor.
- [ ] Uploads.
- [ ] Builds de backend y frontend / CI.

## Notas de operación y límites de esta fase

- La bandeja interna es persistente y funciona sin VAPID.
- Web Push depende del permiso del navegador, HTTPS y credenciales VAPID válidas.
- Los recordatorios requieren un cron externo. El backend no ejecuta trabajos programados en segundo plano por sí solo.
- La primera versión envía notificaciones push genéricas por privacidad; el detalle se consulta tras iniciar sesión.
- La página muestra las últimas 100 notificaciones. La API acepta un límite de hasta 100.
- La difusión administrativa masiva y preferencias horarias/silenciosas quedan fuera de esta fase.
- El sistema no sustituye email transaccional para recuperación de cuenta ni comunicaciones críticas.
- Probar primero en staging y revisar el CI antes de promover a producción.
