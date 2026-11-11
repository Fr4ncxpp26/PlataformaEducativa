-- Fase 2.2: el rol de menor nunca se acepta desde user_metadata del cliente.
-- Los registros públicos solo pueden solicitar alumno_adulto o padre_tutor.
-- Las cuentas de alumno_menor se crean con service_role y luego el backend
-- asigna explícitamente profiles.rol dentro de registerMinor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    rol_solicitado text := new.raw_user_meta_data->>'rol';
    rol_final public.user_role;
begin
    if rol_solicitado in ('alumno_adulto', 'padre_tutor') then
        rol_final := rol_solicitado::public.user_role;
    else
        rol_final := 'alumno_adulto'::public.user_role;
    end if;

    insert into public.profiles (id, nombre, avatar_url, rol)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data->>'nombre',
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            'Nuevo Usuario'
        ),
        coalesce(
            new.raw_user_meta_data->>'avatar_url',
            new.raw_user_meta_data->>'picture'
        ),
        rol_final
    );

    return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
alter function public.handle_new_user() set search_path = pg_catalog, public;
