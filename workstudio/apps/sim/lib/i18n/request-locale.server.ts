import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, resolveLocale } from '@/lib/i18n/config'

interface Storage<T> {
  getStore(): T | undefined
  run<R>(store: T, fn: () => R): R
}

/** AsyncLocalStorage exists only in Node.js; elsewhere every message uses the default language. */
let storage: Storage<Locale>

if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
  const { AsyncLocalStorage } = require('node:async_hooks') as typeof import('node:async_hooks')
  storage = new AsyncLocalStorage<Locale>()
} else {
  storage = {
    getStore: () => undefined,
    run: <R>(_store: Locale, fn: () => R) => fn(),
  }
}

/**
 * Runs `run` as answering a request in `locale`, so messages raised far from the request (use
 * cases, repositories) are worded in the caller's language. `withRouteHandler` sets it for every
 * route; this module has no other runtime import because every route loads it.
 */
export function runWithRequestLocale<R>(locale: Locale, run: () => R): R {
  return storage.run(locale, run)
}

/** The language of the request being answered, else the instance default (French). */
export function requestLocale(): Locale {
  return storage.getStore() ?? DEFAULT_LOCALE
}

/** The interface language a request asks for: the saved choice, then the browser's language. */
export function localeOfRequest(request: Request & { cookies?: { get?(name: string): unknown } }) {
  const saved = request.cookies?.get?.(LOCALE_COOKIE)
  const cookie =
    saved && typeof saved === 'object' && 'value' in saved && typeof saved.value === 'string'
      ? saved.value
      : undefined
  return resolveLocale({
    cookie,
    acceptLanguage: request.headers?.get?.('accept-language') ?? undefined,
  })
}
