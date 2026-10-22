import type { AuthType } from '@/hooks/queries/chats'

type ExistingPasswordState = {
  authType: AuthType
  hasPassword: boolean
}

export function hasExistingPassword(
  existingChat: ExistingPasswordState | null | undefined
): boolean {
  return existingChat?.authType === 'password' && existingChat.hasPassword
}

export function isPasswordRequired(
  authType: AuthType,
  password: string,
  existingPassword: boolean
): boolean {
  return authType === 'password' && !existingPassword && !password.trim()
}

export function isWhitespaceOnlyPassword(password: string): boolean {
  return password.length > 0 && password.trim().length === 0
}

/**
 * Whether submitting should confirm before overwriting the stored password.
 * Only a genuine replacement warrants the prompt — keying this on "a chat
 * exists" asked an admin to confirm changing a password that was never set,
 * e.g. when switching a public chat to password protection for the first time.
 */
export function shouldConfirmPasswordChange(
  existingPassword: boolean,
  authType: AuthType,
  password: string
): boolean {
  return existingPassword && authType === 'password' && password.trim().length > 0
}

export function getPasswordPlaceholderKey(
  existingPassword: boolean
): 'passwordPlaceholderChange' | 'passwordPlaceholder' {
  return existingPassword ? 'passwordPlaceholderChange' : 'passwordPlaceholder'
}

export function getPasswordHelperTextKey(
  existingPassword: boolean
): 'passwordHelperKeep' | 'passwordHelperRequired' {
  return existingPassword ? 'passwordHelperKeep' : 'passwordHelperRequired'
}
