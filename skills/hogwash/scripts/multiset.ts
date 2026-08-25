/**
 * The items that occur more times in `items` than in `others`, in their
 * original order. A multiset difference: an item repeated three times here
 * and twice there appears once in the result. `keyOf` decides which items
 * count as the same.
 */
export function multisetExcess<T>(
  items: readonly T[],
  others: readonly T[],
  keyOf: (item: T) => string,
): readonly T[] {
  const counts = new Map<string, number>()
  for (const other of others) {
    const key = keyOf(other)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const seen = new Map<string, number>()
  const result: T[] = []
  for (const item of items) {
    const key = keyOf(item)
    const rank = (seen.get(key) ?? 0) + 1
    seen.set(key, rank)
    if (rank > (counts.get(key) ?? 0)) result.push(item)
  }
  return result
}
