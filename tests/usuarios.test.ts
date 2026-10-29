import { describe, expect, test } from 'vitest'
import { correoDe, manejar, nombreUsuario, type Deps } from '../supabase/functions/gestionar-usuarios/logica'

function falso(perfiles: Record<string, { rol: 'oficina' | 'comision'; activo: boolean }>) {
  const reg = { creados: [] as string[], borrados: [] as string[], perfiles: [] as any[], activo: [] as any[], bloqueos: [] as any[], claves: [] as string[], falloPerfil: false }
  const d: Deps = {
    usuarioDe: async (t) => (t === 'malo' ? null : { id: t }),
    perfil: async (id) => perfiles[id] ?? null,
    crear: async (c) => (c === 'dup@lab.co' ? { error: 'User already registered' } : (reg.creados.push(c), { id: `id-${c}` })),
    borrar: async (id) => void reg.borrados.push(id),
    insertarPerfil: async (p) => { if (reg.falloPerfil) throw new Error('boom'); reg.perfiles.push(p) },
    actualizarActivo: async (id, a) => void reg.activo.push([id, a]),
    bloquearAcceso: async (id, b) => void reg.bloqueos.push([id, b]),
    cambiarClave: async (id, c) => void reg.claves.push(`${id}:${c}`),
    generarClave: () => 'Clave12345ab',
  }
  return { d, reg }
}
const O = { rol: 'oficina', activo: true } as const
const C = { rol: 'comision', activo: true } as const

describe('usuario sin correo', () => {
  test('el nombre de usuario se convierte en un correo interno y se muestra sin él', async () => {
    expect(correoDe(' Ana.Perez ')).toBe('ana.perez@usuarios.ambienciq.invalid')
    expect(correoDe('Jefe@Lab.co')).toBe('jefe@lab.co') // cuentas con correo real siguen igual
    expect(nombreUsuario('ana.perez@usuarios.ambienciq.invalid')).toBe('ana.perez'); expect(nombreUsuario('jefe@lab.co')).toBe('jefe@lab.co')
    const { d, reg } = falso({ of: O })
    const r = await manejar('of', { accion: 'crear', usuario: 'Comision1', nombre: 'Comisión 1', rol: 'comision' }, d)
    expect(r.json).toMatchObject({ usuario: 'comision1', correo: 'comision1@usuarios.ambienciq.invalid' })
    expect(reg.perfiles[0]).toMatchObject({ correo: 'comision1@usuarios.ambienciq.invalid' })
    for (const u of ['ab', 'con espacio', 'tildé', 'x'.repeat(31)]) expect((await manejar('of', { accion: 'crear', usuario: u, nombre: 'A', rol: 'comision' }, d)).status).toBe(400)
  })
})

describe('contraseña elegida por la oficina', () => {
  test('si se indica se usa; si falta se genera; si no es válida se rechaza', async () => {
    const { d, reg } = falso({ of: O, co: C })
    const nuevo = { accion: 'crear', usuario: 'ana', nombre: 'Ana', rol: 'comision' }
    expect((await manejar('of', { ...nuevo, clave: 'Mi clave 2026' }, d)).json.clave).toBe('Mi clave 2026')
    expect((await manejar('of', { ...nuevo, usuario: 'luis', clave: '' }, d)).json.clave).toBe('Clave12345ab')
    for (const mala of ['corta', ' con espacios ', 'x'.repeat(73)]) expect((await manejar('of', { ...nuevo, usuario: 'pedro', clave: mala }, d)).status).toBe(400)
    expect(reg.creados).toHaveLength(2) // las rechazadas no crean cuenta
    expect((await manejar('of', { accion: 'clave', id: 'co', clave: 'Otra clave 99' }, d)).json.clave).toBe('Otra clave 99')
    expect(reg.claves).toEqual(['co:Otra clave 99'])
    expect((await manejar('of', { accion: 'clave', id: 'co', clave: 'corta' }, d)).status).toBe(400)
    expect((await manejar('of', { accion: 'clave', id: 'co' }, d)).json.clave).toBe('Clave12345ab')
  })
})

describe('gestionar-usuarios', () => {
  test('rechaza sin sesión o sin ser oficina activa', async () => {
    const { d } = falso({ of: O, co: C, off: { rol: 'oficina', activo: false } })
    expect((await manejar(null, {}, d)).status).toBe(401)
    expect((await manejar('malo', {}, d)).status).toBe(401)
    expect((await manejar('co', { accion: 'crear' }, d)).status).toBe(403)
    expect((await manejar('off', { accion: 'crear' }, d)).status).toBe(403)
    expect((await manejar('sinperfil', { accion: 'crear' }, d)).status).toBe(403)
  })

  test('crea usuario con perfil y devuelve la clave generada', async () => {
    const { d, reg } = falso({ of: O })
    const r = await manejar('of', { accion: 'crear', correo: ' Ana@Lab.co ', nombre: 'Ana', rol: 'comision' }, d)
    expect(r).toEqual({ status: 200, json: { id: 'id-ana@lab.co', usuario: 'ana@lab.co', correo: 'ana@lab.co', clave: 'Clave12345ab' } })
    expect(reg.perfiles).toEqual([{ id: 'id-ana@lab.co', rol: 'comision', nombre: 'Ana', correo: 'ana@lab.co' }])
  })

  test('valida datos y correo repetido', async () => {
    const { d } = falso({ of: O })
    for (const b of [{ correo: 'x', nombre: 'A', rol: 'comision' }, { correo: 'a@b.co', nombre: ' ', rol: 'comision' }, { correo: 'a@b.co', nombre: 'A', rol: 'admin' }])
      expect((await manejar('of', { accion: 'crear', ...b }, d)).status).toBe(400)
    const r = await manejar('of', { accion: 'crear', correo: 'dup@lab.co', nombre: 'A', rol: 'comision' }, d)
    expect(r.json.error).toBe('Ya existe un usuario con ese nombre')
  })

  test('si falla el perfil se deshace la cuenta', async () => {
    const { d, reg } = falso({ of: O }); reg.falloPerfil = true
    const r = await manejar('of', { accion: 'crear', correo: 'a@b.co', nombre: 'A', rol: 'comision' }, d)
    expect(r.status).toBe(500); expect(reg.borrados).toEqual(['id-a@b.co'])
  })

  test('desactivar bloquea el acceso; reactivar lo devuelve; no a uno mismo', async () => {
    const { d, reg } = falso({ of: O, co: C })
    await manejar('of', { accion: 'estado', id: 'co', activo: false }, d)
    await manejar('of', { accion: 'estado', id: 'co', activo: true }, d)
    expect(reg.activo).toEqual([['co', false], ['co', true]]); expect(reg.bloqueos).toEqual([['co', true], ['co', false]])
    expect((await manejar('of', { accion: 'estado', id: 'of', activo: false }, d)).status).toBe(400)
    expect((await manejar('of', { accion: 'estado', id: 'nadie', activo: false }, d)).status).toBe(400)
  })

  test('restablecer clave devuelve una nueva', async () => {
    const { d, reg } = falso({ of: O, co: C })
    expect((await manejar('of', { accion: 'clave', id: 'co' }, d)).json).toEqual({ clave: 'Clave12345ab' })
    expect(reg.claves).toEqual(['co:Clave12345ab'])
    expect((await manejar('of', { accion: 'clave', id: 'nadie' }, d)).status).toBe(400)
  })
})
