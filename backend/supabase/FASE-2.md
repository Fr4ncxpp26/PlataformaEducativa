# Fase 2 — integridad y seguridad

## Orden obligatorio de despliegue

1. Ejecuta en orden las migraciones `202611110001_atomic_tutoring_and_guardian_invites.sql`, `202611110002_secure_definer_function_privileges.sql` y `202611110003_prevent_self_assigned_minor_role.sql` en el proyecto Supabase.
2. Verifica que las tres funciones RPC se hayan creado y que el rol `service_role` tenga permiso de ejecución.
3. Despliega el backend de esta rama.
4. Despliega el frontend sin cambios obligatorios en esta fase.
5. Comprueba login, renovación de sesión, logout, carga de archivos, creación/canje de invitaciones y reserva/cancelación de tutorías.

## Cambios

- `middlewares/csrf.ts`: exige Origin/Referer del frontend configurado en todas las mutaciones `/api`.
- Migración 002: revoca EXECUTE de funciones SECURITY DEFINER sensibles a `public`, `anon` y `authenticated`; las RPC usadas por el backend quedan concedidas a `service_role`, y se fija `search_path` seguro.
- Migración 003: corrige `handle_new_user`; los metadatos públicos solo pueden solicitar `alumno_adulto` o `padre_tutor`. `alumno_menor` solo se asigna desde el backend autorizado.
- `middlewares/auth.ts`: valida el JWT con Supabase y obtiene el rol desde `profiles`, no desde metadata del usuario.
- `middlewares/roles.ts`: respuesta 403 uniforme.
- `index.ts`: aplica CSRF, estandariza rate limit y devuelve JSON para rutas API inexistentes.
- `tutorings.controllers.ts`: reserva mediante RPC transaccional con bloqueo para evitar reservas simultáneas duplicadas.
- `guardian.controller.ts`: generación y canje de invitaciones transaccionales.
- `.github/workflows/ci.yml`: build de backend y frontend en GitHub Actions.

## Requisitos y notas

- La migración asume las tablas/columnas que ya usa el código: `profiles(id, rol)`, `teacher_availability(teacher_id, day_of_week, start_time, end_time)`, `tutoring_sessions(student_id, teacher_id, scheduled_at, status)`, `guardian_invites(code, student_id, expires_at, used_at)` y `guardian_student(guardian_id, student_id)`.
- El esquema entregado ya contiene `guardian_student_guardian_id_student_id_key` como UNIQUE compuesto sobre `(guardian_id, student_id)`; por tanto `ON CONFLICT (guardian_id, student_id)` está respaldado y NO debes crear otro índice.
- `guardian_invites.code` ya es PRIMARY KEY, por lo que también es único. NO debes crear otro índice.
- El middleware CSRF requiere que `FRONTEND_URL` sea el origen exacto desde el que el navegador llama a la API (protocolo, host y puerto). Si hay más de un frontend legítimo, implementa una allowlist explícita; no uses comodines.
- Las funciones RPC están concedidas solo a `service_role`; no las expongas a clientes web.
- La protección CSRF está diseñada para autenticación por cookies. Las integraciones servidor-a-servidor que escriban en `/api` deberán enviar el Origin configurado o usar un canal separado autenticado.

## Autenticación y advertencia de TypeScript

El patrón actual en `auth.controller.ts` es correcto:

```ts
const { id: _profileId, ...profileData } = profile;
return res.status(200).json({
  user: { id: data.user.id, email: data.user.email, ...profileData },
});
```

Se retira el `id` del perfil antes del spread, por lo que el ID de Supabase Auth es la única propiedad `id` de la respuesta. No volver a escribir `{ id: ..., ...profile }`.

## Pruebas manuales mínimas

- POST sin Origin/Referer o con origen distinto: debe devolver 403 `CSRF_ORIGIN_MISMATCH`.
- POST desde el frontend autorizado: debe pasar CSRF.
- Reservar el mismo horario dos veces en paralelo: solo una solicitud debe devolver 201; la otra 409.
- Canjear el mismo código simultáneamente: solo una solicitud debe consumirlo.
- Generar dos invitaciones simultáneamente para el mismo alumno: debe quedar una invitación sin usar.
- Perfil sin fila en `profiles`: debe devolver 403 sin iniciar sesión con rol inventado.
- Ejecutar ambos builds del workflow antes de fusionar.



## Verificación contra el esquema Supabase proporcionado

Se contrastó la migración con el volcado de estructura recibido:

- `profiles.id` es UUID y `profiles.rol` usa el enum de roles; el valor `profesor` ya se usa en el backend.
- `teacher_availability` contiene `teacher_id`, `day_of_week` (0-6), `start_time` y `end_time`. El backend documenta 0 = domingo; PostgreSQL `extract(dow)` usa la misma convención.
- `tutoring_sessions` contiene `student_id`, `teacher_id`, `scheduled_at` y el enum `session_status` con valor por defecto `programada`.
- `guardian_invites.code` es PRIMARY KEY; no se requiere índice adicional.
- `guardian_student` tiene la UNIQUE compuesta `guardian_student_guardian_id_student_id_key`; no se requiere índice adicional.
- `guardian_invites.student_id`, `guardian_student.guardian_id/student_id`, `teacher_availability.teacher_id` y los participantes de tutorías referencian `profiles.id`.

La migración usa solo esas columnas y tipos. La exportación de esquema no contiene datos existentes, políticas RLS, triggers previos ni definiciones de los enums; por ello no demuestra que no existan conflictos históricos ni que las políticas/triggers previos sean compatibles. Antes de producción, aplicar en staging y probar los flujos descritos.


## Revisión de las políticas RLS entregadas

- Las políticas actuales son solo SELECT. No hay políticas INSERT/UPDATE/DELETE en el listado recibido; los cambios de datos deben continuar pasando por el backend y `supabaseAdmin` (service_role), no por el cliente.
- `profiles` tiene dos políticas equivalentes para leer el propio perfil (`Ver mi perfil` y `Ver propio perfil`). Son redundantes, pero no amplían el acceso. Se pueden consolidar en una limpieza posterior; no las elimino automáticamente para no cambiar permisos durante esta fase.
- La política de perfiles de alumnos vinculados consulta `guardian_student`; la política de esa tabla permite al tutor leer sus propios vínculos. El patrón es coherente para el acceso del tutor autenticado.
- `progress` permite al alumno leer su progreso y al tutor leer el de alumnos vinculados.
- `tutoring_sessions` permite SELECT solo al alumno y profesor participantes; los tutores no tienen lectura directa mediante RLS. El panel de tutores debe seguir consultando a través del backend con comprobación explícita de vínculo.
- Las políticas de cursos, módulos y lecciones publicadas son de lectura. La política de lecciones exige publicación y curso gratuito o inscripción.
- El rol `public` en las políticas incluye tanto `anon` como `authenticated`; las expresiones `auth.uid()` mantienen los registros privados cuando no existe sesión.
- No se recibieron políticas para tablas como `payments`, `enrollments`, `certificates`, `quiz_attempts`, `student_achievements`, `guardian_invites` o `tutoring_sessions` para escritura. La API debe seguir haciendo cumplir autorización y propiedad; no habilites escritura directa del cliente sin políticas explícitas.

## Hallazgo crítico corregido: asignación de rol menor

La función original `handle_new_user()` aceptaba `alumno_menor` cuando `raw_app_meta_data.provider = 'email'`. Un registro público por correo también cumple esa condición, por lo que el comentario de la función no garantizaba que el menor solo pudiera ser creado por backend. La migración 003 corrige el origen de confianza: el trigger ya no acepta `alumno_menor` desde metadata; `registerMinor` asigna el rol en `profiles` con service_role y luego crea el vínculo. El controlador elimina la cuenta si falla cualquiera de esos pasos.

## Funciones SECURITY DEFINER

Las funciones entregadas `course_lesson_total`, `course_progress`, `award_points` y `weekly_leaderboard` se usan desde el backend mediante `supabaseAdmin`. La migración 002 restringe EXECUTE a `service_role` y revoca permisos a `anon`/`authenticated`. También fija el `search_path` de las funciones privilegiadas y las RPC nuevas. Esto es necesario porque `course_progress` admite un arreglo de estudiantes y `award_points` permite actualizar cualquier perfil si se expusieran directamente.

No se cambian las funciones `rls_auto_enable` ni `update_updated_at_column` salvo retirar ejecución directa del cliente; sus disparadores/event trigger siguen ejecutándose por el motor PostgreSQL.
