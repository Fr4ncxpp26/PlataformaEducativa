-- Fase 2: operaciones atómicas para evitar reservas dobles y códigos de tutor reutilizados.
-- Ejecutar en Supabase SQL Editor o mediante la CLI de Supabase antes de desplegar el backend.

create or replace function public.book_tutoring_session(
    p_student_id uuid,
    p_teacher_id uuid,
    p_scheduled_at timestamptz,
    p_timezone text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_local timestamp;
    v_dow integer;
    v_minute integer;
    v_session public.tutoring_sessions%rowtype;
    v_lock_id text;
begin
    if p_student_id is null or p_teacher_id is null or p_scheduled_at is null
       or p_timezone is null or length(trim(p_timezone)) = 0 then
        raise exception using errcode = '22023', message = 'INVALID_ARGUMENT';
    end if;

    -- Bloqueos en orden determinista: dos reservas simultáneas no pueden
    -- validar el mismo horario para profesor o alumno al mismo tiempo.
    for v_lock_id in
        select x from unnest(array[p_student_id::text, p_teacher_id::text]) as t(x) order by x
    loop
        perform pg_advisory_xact_lock(hashtextextended(v_lock_id, 0));
    end loop;

    if p_scheduled_at < now() + interval '1 hour'
       or p_scheduled_at > now() + interval '60 days' then
        raise exception using errcode = '22023', message = 'OUTSIDE_BOOKING_WINDOW';
    end if;

    if not exists (
        select 1 from public.profiles
        where id = p_teacher_id and rol = 'profesor'
    ) then
        raise exception using errcode = 'P0002', message = 'TEACHER_NOT_FOUND';
    end if;

    v_local := p_scheduled_at at time zone p_timezone;
    v_dow := extract(dow from v_local)::integer;
    v_minute := extract(hour from v_local)::integer * 60 + extract(minute from v_local)::integer;

    if not exists (
        select 1 from public.teacher_availability a
        where a.teacher_id = p_teacher_id
          and a.day_of_week = v_dow
          and v_minute >= extract(hour from a.start_time)::integer * 60 + extract(minute from a.start_time)::integer
          and v_minute + 60 <= extract(hour from a.end_time)::integer * 60 + extract(minute from a.end_time)::integer
    ) then
        raise exception using errcode = '22023', message = 'OUTSIDE_TEACHER_AVAILABILITY';
    end if;

    if exists (
        select 1 from public.tutoring_sessions s
        where s.status = 'programada'
          and (s.teacher_id = p_teacher_id or s.student_id = p_student_id)
          and s.scheduled_at > p_scheduled_at - interval '60 minutes'
          and s.scheduled_at < p_scheduled_at + interval '60 minutes'
    ) then
        raise exception using errcode = '23P01', message = 'SLOT_ALREADY_BOOKED';
    end if;

    insert into public.tutoring_sessions(student_id, teacher_id, scheduled_at)
    values (p_student_id, p_teacher_id, p_scheduled_at)
    returning * into v_session;

    return to_jsonb(v_session);
end;
$$;

revoke all on function public.book_tutoring_session(uuid, uuid, timestamptz, text) from public, anon, authenticated;
grant execute on function public.book_tutoring_session(uuid, uuid, timestamptz, text) to service_role;

create or replace function public.redeem_guardian_invite(p_guardian_id uuid, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_student_id uuid;
begin
    if p_guardian_id is null or p_code is null then
        raise exception using errcode = '22023', message = 'INVALID_ARGUMENT';
    end if;

    -- El UPDATE condicional bloquea y consume el código en una sola operación.
    update public.guardian_invites
       set used_at = now()
     where code = upper(trim(p_code))
       and used_at is null
       and expires_at > now()
    returning student_id into v_student_id;

    if v_student_id is null then
        raise exception using errcode = 'P0002', message = 'INVITE_INVALID_OR_EXPIRED';
    end if;

    insert into public.guardian_student(guardian_id, student_id)
    values (p_guardian_id, v_student_id)
    on conflict (guardian_id, student_id) do nothing;

    return v_student_id;
end;
$$;

revoke all on function public.redeem_guardian_invite(uuid, text) from public, anon, authenticated;
grant execute on function public.redeem_guardian_invite(uuid, text) to service_role;

create or replace function public.create_guardian_invite(
    p_student_id uuid,
    p_code text,
    p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invite public.guardian_invites%rowtype;
begin
    if p_student_id is null or p_code !~ '^[A-Z0-9]{8}$' or p_expires_at <= now() then
        raise exception using errcode = '22023', message = 'INVALID_ARGUMENT';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

    delete from public.guardian_invites
     where student_id = p_student_id and used_at is null;

    insert into public.guardian_invites(code, student_id, expires_at)
    values (p_code, p_student_id, p_expires_at)
    returning * into v_invite;

    return jsonb_build_object('code', v_invite.code, 'expires_at', v_invite.expires_at);
end;
$$;

revoke all on function public.create_guardian_invite(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_guardian_invite(uuid, text, timestamptz) to service_role;
