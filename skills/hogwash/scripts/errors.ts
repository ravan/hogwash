import type { ModelFamily } from './types.js'

export type HogwashFailure =
  | { readonly kind: 'usage'; readonly message: string }
  | { readonly kind: 'config'; readonly message: string }
  | { readonly kind: 'io'; readonly path: string; readonly message: string }
  | { readonly kind: 'adapter'; readonly family: ModelFamily; readonly message: string }

export class HogwashError extends Error {
  readonly failure: HogwashFailure

  constructor(failure: HogwashFailure) {
    super(failure.message)
    this.name = 'HogwashError'
    this.failure = failure
  }
}
