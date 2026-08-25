/**
 * bun:test types the equality matchers as `toBe(expected: T)`, which rejects a
 * plain literal against a zod-branded value (`Threshold`, `RuleId`, offsets).
 * The runtime compares values either way, so these overloads restore the loose
 * contract vitest had, instead of casting at hundreds of call sites.
 */
declare module 'bun:test' {
  interface Matchers<T> {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toStrictEqual(expected: unknown): void
    toContain(expected: unknown): void
    toContainEqual(expected: unknown): void
  }
}
