// Storage namespace. Lets a second deployment (v2) keep its data fully separate
// from v1 even though all *.github.io sites share one browser storage origin.
// Defaults to "dindin" so v1's existing IndexedDB and localStorage keys are
// unchanged. v2 sets VITE_DINDIN_NS=dindin_v2 at build time.
const NS = (import.meta.env.VITE_DINDIN_NS as string | undefined)?.trim() || 'dindin'

/** IndexedDB database name for this deployment. */
export const DB_NAME = NS

/** Namespaced localStorage key, e.g. ns('lastDate') -> "dindin.lastDate". */
export function ns(key: string): string {
  return `${NS}.${key}`
}

/** Human label for the current build (shown subtly in v2). */
export const APP_VARIANT = NS === 'dindin' ? '' : NS.replace('dindin_', 'v')
