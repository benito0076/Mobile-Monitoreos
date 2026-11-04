import { expect, test, vi } from 'vitest'

const insert = vi.fn(async () => ({}))
vi.mock('../src/datos/supabase', () => ({ supabase: { from: () => ({ insert }) } }))
vi.stubGlobal('__VERSION_APP__', '9.9.9')
vi.stubGlobal('location', { href: 'https://x/y' })

test('reporta el error recortado y se detiene en el tope', async () => {
  const { reportarError } = await import('../src/datos/errores')
  await reportarError(new Error('x'.repeat(900)))
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'x'.repeat(500), version_app: '9.9.9' }))
  for (let i = 0; i < 40; i++) await reportarError('texto suelto')
  expect(insert).toHaveBeenCalledTimes(20)
})

test('nunca lanza aunque falle el envío', async () => {
  insert.mockRejectedValueOnce(new Error('offline'))
  const { reportarError } = await import('../src/datos/errores')
  await expect(reportarError('a')).resolves.toBeUndefined()
})
