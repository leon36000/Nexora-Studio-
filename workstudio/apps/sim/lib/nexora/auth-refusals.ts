/**
 * Nexora edition: refusal messages of the sign-in and sign-up policy (`auth-policy.ts`). Kept in a
 * module without server imports so the forms can recognize them and answer in French.
 */
export const NEXORA_SIGN_UP_REFUSED =
  'This address cannot sign up on its own. Ask your administrator for an invitation.'

export const NEXORA_SSO_REQUIRED = 'Single sign-on is required. Sign in with your company account.'

export const NEXORA_SSO_LINK_REFUSED =
  'This account cannot be linked to the company identity provider on sign-in. Sign in with your password.'
