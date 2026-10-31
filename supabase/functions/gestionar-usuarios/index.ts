import { createClient } from 'jsr:@supabase/supabase-js@2'
import { manejar, type Deps } from './logica.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const deps: Deps = {
  async usuarioDe(token) {
    const { data, error } = await admin.auth.getUser(token)
    return error || !data.user ? null : { id: data.user.id }
  },
  async perfil(id) {
    const { data } = await admin.from('perfiles').select('rol,activo').eq('id', id).maybeSingle()
    return data
  },
  async crear(correo, clave) {
    const { data, error } = await admin.auth.admin.createUser({ email: correo, password: clave, email_confirm: true })
    return error || !data.user ? { error: error?.message ?? 'No se pudo crear' } : { id: data.user.id }
  },
  async borrar(id) { await admin.auth.admin.deleteUser(id) },
  async insertarPerfil(p) {
    const { error } = await admin.from('perfiles').insert(p)
    if (error) throw new Error(error.message)
  },
  async actualizarActivo(id, activo) {
    const { error } = await admin.from('perfiles').update({ activo }).eq('id', id)
    if (error) throw new Error(error.message)
  },
  async bloquearAcceso(id, bloquear) {
    await admin.auth.admin.updateUserById(id, { ban_duration: bloquear ? '876000h' : 'none' })
  },
  async cambiarClave(id, clave) {
    const { error } = await admin.auth.admin.updateUserById(id, { password: clave })
    if (error) throw new Error(error.message)
  },
  generarClave() {
    const letras = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin caracteres que se confunden
    return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => letras[b % letras.length]).join('')
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null
  const cuerpo = await req.json().catch(() => null)
  const r = await manejar(token, cuerpo, deps)
  return new Response(JSON.stringify(r.json), { status: r.status, headers: { ...CORS, 'Content-Type': 'application/json' } })
})
