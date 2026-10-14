import { supabaseAdmin } from '../../config/supabase';
 
// Campos de perfil que viajan al cliente (nunca stripe_customer_id ni datos internos)
export const PROFILE_FIELDS = 'id, nombre, avatar_url, rol, headline, bio, telefono, pais, ranking_visible';
 
export const getProfile = async (id: string) =>
    (await supabaseAdmin.from('profiles').select(PROFILE_FIELDS).eq('id', id).single()).data;
 