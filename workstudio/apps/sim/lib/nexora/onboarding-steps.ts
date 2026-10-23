/** The first-launch steps, in the order the home page shows them. */
export const ONBOARDING_STEPS = ['organization', 'model', 'team', 'tools', 'first-run'] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]
