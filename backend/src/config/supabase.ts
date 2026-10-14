import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Clientes SIN estado: nunca guardan sesión en memoria (evita mezclar usuarios entre peticiones)
const stateless = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

// Poder absoluto (ignora RLS). Solo backend, nunca exponer al cliente.
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: stateless });

// Uno NUEVO por petición para signIn/signUp/refresh (nunca compartir tras iniciar sesión)
export const createAnonClient = () =>
    createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: stateless });

// Cliente que actúa COMO el usuario (aplica RLS con su JWT)
export const createUserClient = (accessToken: string) =>
    createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: stateless,
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

// Compatibilidad con controladores existentes: SOLO lecturas públicas, jamás hacer login con este
export const supabase = createAnonClient();

// Cliente PKCE para Google: el code_verifier viaja en una cookie porque el backend no tiene estado
export const PKCE_KEY = 'sb-auth-code-verifier';
export const createPkceClient = (store: Map<string, string>) =>
    createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            flowType: 'pkce',
            persistSession: true, // necesario para que use el storage custom
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: 'sb-auth',
            storage: {
                getItem: (k) => store.get(k) ?? null,
                setItem: (k, v) => { store.set(k, v); },
                removeItem: (k) => { store.delete(k); },
            },
        },
    });