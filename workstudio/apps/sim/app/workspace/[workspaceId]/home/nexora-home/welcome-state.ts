const KEY_PREFIX = 'nexora:welcome:'

type WelcomeStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): WelcomeStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * Whether the person closed the welcome panel. Kept in this browser only: a person who cleared
 * it, or opens WorkStudio elsewhere, simply sees the invitation once more.
 */
export function readWelcomeDismissed(
  userId: string,
  storage: WelcomeStorage | null = browserStorage()
): boolean {
  try {
    return storage?.getItem(`${KEY_PREFIX}${userId}`) === 'closed'
  } catch {
    return false
  }
}

export function writeWelcomeDismissed(
  userId: string,
  storage: WelcomeStorage | null = browserStorage()
): void {
  try {
    storage?.setItem(`${KEY_PREFIX}${userId}`, 'closed')
  } catch {
    // storage refused: the panel returns next visit
  }
}
