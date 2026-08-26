/**
 * Corre `fn` sobre todos los items con como maximo `limit` en vuelo a la vez.
 * Bajar 60 fotos de a una tarda ~10s; de a 6 tarda menos de 2.
 */
export async function pool<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++]!
      await fn(item)
    }
  })
  await Promise.all(workers)
}
