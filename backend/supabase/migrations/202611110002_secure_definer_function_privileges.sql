-- Fase 2.1: limitar las funciones SECURITY DEFINER al backend de confianza.
-- La API las invoca mediante supabaseAdmin (service_role). El cliente anon/authenticated
-- no debe poder invocarlas directamente y saltarse los controles del backend/RLS.

-- Funciones de consulta/estadística invocadas exclusivamente por el backend.
revoke all on function public.course_lesson_total(uuid) from public, anon, authenticated;
grant execute on function public.course_lesson_total(uuid) to service_role;

revoke all on function public.course_progress(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.course_progress(uuid, uuid[]) to service_role;

revoke all on function public.weekly_leaderboard(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.weekly_leaderboard(timestamptz, integer) to service_role;

-- Esta función permite modificar puntos/rachas de cualquier perfil: solo backend.
revoke all on function public.award_points(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.award_points(uuid, integer, text) to service_role;

-- Funciones invocadas por triggers: no se exponen como RPC al cliente.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.update_updated_at_column() from public, anon, authenticated;
revoke all on function public.prevent_tutoring_session_overlap() from public, anon, authenticated;

-- El event trigger es administrado por el propietario de la BD, no por clientes.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Fijar el search_path de funciones privilegiadas. pg_catalog primero evita que
-- objetos homónimos en public alteren la resolución de funciones/operadores.
alter function public.course_lesson_total(uuid) set search_path = pg_catalog, public;
alter function public.course_progress(uuid, uuid[]) set search_path = pg_catalog, public;
alter function public.weekly_leaderboard(timestamptz, integer) set search_path = pg_catalog, public;
alter function public.award_points(uuid, integer, text) set search_path = pg_catalog, public;
alter function public.handle_new_user() set search_path = pg_catalog, public;

-- RPC de la migración anterior: solo service_role y ruta de búsqueda segura.
revoke all on function public.book_tutoring_session(uuid, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.book_tutoring_session(uuid, uuid, timestamptz, text) to service_role;
alter function public.book_tutoring_session(uuid, uuid, timestamptz, text) set search_path = pg_catalog, public;

revoke all on function public.create_guardian_invite(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_guardian_invite(uuid, text, timestamptz) to service_role;
alter function public.create_guardian_invite(uuid, text, timestamptz) set search_path = pg_catalog, public;

revoke all on function public.redeem_guardian_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_guardian_invite(uuid, text) to service_role;
alter function public.redeem_guardian_invite(uuid, text) set search_path = pg_catalog, public;
