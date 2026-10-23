import { createClient } from '@supabase/supabase-js'

// Solo la clave pública (anon); la service_role nunca va en el cliente.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
