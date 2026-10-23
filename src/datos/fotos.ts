/** Reduce la foto antes de guardarla: lado mayor 1600 px, JPEG al 70 %. */
export async function comprimir(archivo: Blob, maxLado = 1600, calidad = 0.7): Promise<Blob> {
  const img = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  const k = Math.min(1, maxLado / Math.max(img.width, img.height))
  const c = document.createElement('canvas')
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  img.close()
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('No se pudo comprimir la foto'))), 'image/jpeg', calidad))
}
