# Fase 2 — integridad y seguridad

## Orden obligatorio de despliegue

1. Ejecuta primero la migración `supabase/migrations/202611110001_atomic_tutoring_and_guardian_invites.sql` en el proyecto Supabase.
2. Verifica que las tres funciones RPC se hayan creado y que el rol `service_role` tenga permiso de ejecución.
3. Despliega el backend de esta rama.
4. Despliega el frontend sin cambios obligatorios en esta fase.
5. Comprueba login, renovación de sesión, logout, carga de archivos, creación/canje de invitaciones y reserva/cancelación de tutorías.

## Cambios

- `middlewares/csrf.ts`: exige Origin/Referer del frontend configurado en todas las mutaciones `/api`.
- `middlewares/auth.ts`: valida el JWT con Supabase y obtiene el rol desde `profiles`, no desde metadata del usuario.
- `middlewares/roles.ts`: respuesta 403 uniforme.
- `index.ts`: aplica CSRF, estandariza rate limit y devuelve JSON para rutas API inexistentes.
- `tutorings.controllers.ts`: reserva mediante RPC transaccional con bloqueo para evitar reservas simultáneas duplicadas.
- `guardian.controller.ts`: generación y canje de invitaciones transaccionales.
- `.github/workflows/ci.yml`: build de backend y frontend en GitHub Actions.

## Requisitos y notas

- La migración asume las tablas/columnas que ya usa el código: `profiles(id, rol)`, `teacher_availability(teacher_id, day_of_week, start_time, end_time)`, `tutoring_sessions(student_id, teacher_id, scheduled_at, status)`, `guardian_invites(code, student_id, expires_at, used_at)` y `guardian_student(guardian_id, student_id)`.
- `guardian_student` debe tener una restricción UNIQUE sobre `(guardian_id, student_id)` para que `ON CONFLICT` funcione. Si todavía no existe, añade una vez:
  `create unique index if not exists guardian_student_guardian_student_uidx on public.guardian_student(guardian_id, student_id);`
- `guardian_invites.code` debe ser UNIQUE. Si todavía no existe:
  `create unique index if not exists guardian_invites_code_uidx on public.guardian_invites(code);`
- No ejecutes esos índices sin revisar primero duplicados existentes.
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

