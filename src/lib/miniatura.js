// Fotos enviadas pelos donos ganham uma cópia pequena (-p.webp, até 640 px) para cartões e listas.
// Se a cópia não existir (fotos antigas), o <img> volta para a original pelo onError.
export function miniatura(url) {
  if (!url || !/\/fotos\/lugares\/.+\.webp$/.test(url) || /-p\.webp$/.test(url)) return url
  return url.replace(/\.webp$/, '-p.webp')
}
/** Props para um <img> de cartão: tenta a miniatura e, se faltar, usa a original. */
export function imgMini(url) {
  const mini = miniatura(url)
  return {
    src: mini,
    onError: mini !== url ? e => { if (e.currentTarget.src !== url) e.currentTarget.src = url } : undefined,
  }
}
