-- Fase 3: notificaciones internas, preferencias y suscripciones Web Push.
-- Ejecutar después de las migraciones de fase 2 en un proyecto de staging.

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    category text not null check (category in ('tutoring', 'academic', 'courses', 'account', 'system')),
    title text not null check (char_length(title) between 1 and 120),
    message text not null check (char_length(message) between 1 and 500),
    href text null check (href is null or (left(href, 1) = '/' and left(href, 2) <> '//')),
    dedupe_key text null,
    read_at timestamptz null,
    created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
    on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
    on public.notifications (user_id, created_at desc)
    where read_at is null;
create unique index if not exists notifications_user_dedupe_uidx
    on public.notifications (user_id, dedupe_key)
    where dedupe_key is not null;

create table if not exists public.notification_preferences (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    push_enabled boolean not null default false,
    tutoring_enabled boolean not null default true,
    academic_enabled boolean not null default true,
    courses_enabled boolean not null default true,
    account_enabled boolean not null default true,
    system_enabled boolean not null default true,
    updated_at timestamptz not null default now()
);

create table if not exists public.notification_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    endpoint text not null unique check (left(endpoint, 8) = 'https://'),
    p256dh text not null,
    auth text not null,
    user_agent text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists notification_subscriptions_user_idx
    on public.notification_subscriptions (user_id);

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_subscriptions enable row level security;

-- La aplicación opera mediante el backend con service_role. Los permisos directos
-- del navegador se limitan a leer su propia bandeja/preferencias; nunca puede
-- insertar notificaciones, escribir preferencias ni leer claves de suscripción.
revoke all on public.notifications from public, anon, authenticated;
revoke all on public.notification_preferences from public, anon, authenticated;
revoke all on public.notification_subscriptions from public, anon, authenticated;

grant select on public.notifications to authenticated;
grant select on public.notification_preferences to authenticated;

drop policy if exists "Leer mis notificaciones" on public.notifications;
create policy "Leer mis notificaciones"
    on public.notifications
    for select
    to authenticated
    using (user_id = (select auth.uid()));

drop policy if exists "Leer mis preferencias de notificaciones" on public.notification_preferences;
create policy "Leer mis preferencias de notificaciones"
    on public.notification_preferences
    for select
    to authenticated
    using (user_id = (select auth.uid()));

-- No se crea ninguna política de lectura/escritura para notification_subscriptions.
-- El navegador no necesita consultar endpoints ni secretos de cifrado: todo pasa
-- por la API autenticada y la service_role del servidor.

comment on table public.notifications is
    'Bandeja privada de notificaciones; escrituras realizadas únicamente por el backend.';
comment on table public.notification_preferences is
    'Preferencias del usuario para categorías y Web Push.';
comment on table public.notification_subscriptions is
    'Endpoints Web Push y claves públicas del cliente; acceso exclusivo del backend.';

