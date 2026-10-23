import { db } from '@sim/db'
import { organization } from '@sim/db/schema'
import { isRecordLike } from '@sim/utils/object'
import { eq } from 'drizzle-orm'
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/nexora/onboarding-steps'

export interface OnboardingProgress {
  completed: OnboardingStep[]
  /** The panel is hidden ("Plus tard", or every step done). */
  dismissed: boolean
}

export interface OnboardingChange {
  complete?: OnboardingStep
  dismissed?: boolean
}

const METADATA_KEY = 'nexoraOnboarding'

function isStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value)
}

/** Reads the first-launch progress kept in `organization.metadata`, tolerating anything stored there. */
export function parseOnboarding(metadata: unknown): OnboardingProgress {
  const stored = isRecordLike(metadata) ? metadata[METADATA_KEY] : undefined
  if (!isRecordLike(stored)) return { completed: [], dismissed: false }
  const completed = Array.isArray(stored.completed) ? stored.completed.filter(isStep) : []
  return { completed: [...new Set(completed)], dismissed: stored.dismissed === true }
}

/**
 * The organization metadata with one change applied to its first-launch progress; every other
 * metadata key is kept. Completing the first run ends the first launch.
 */
export function mergeOnboarding(
  metadata: unknown,
  change: OnboardingChange
): Record<string, unknown> & { [METADATA_KEY]: OnboardingProgress } {
  const progress = parseOnboarding(metadata)
  const completed =
    change.complete && !progress.completed.includes(change.complete)
      ? [...progress.completed, change.complete]
      : progress.completed
  const dismissed =
    change.complete === 'first-run' ? true : (change.dismissed ?? progress.dismissed)
  return {
    ...(isRecordLike(metadata) ? metadata : {}),
    [METADATA_KEY]: { completed, dismissed },
  }
}

export async function readOnboarding(organizationId: string): Promise<OnboardingProgress> {
  const [row] = await db
    .select({ metadata: organization.metadata })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return parseOnboarding(row?.metadata)
}

/** Applies a change under a row lock, so two admins clicking at once both land. */
export async function updateOnboarding(
  organizationId: string,
  change: OnboardingChange
): Promise<OnboardingProgress> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ metadata: organization.metadata })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .for('update')
      .limit(1)
    const metadata = mergeOnboarding(row?.metadata, change)
    await tx.update(organization).set({ metadata }).where(eq(organization.id, organizationId))
    return metadata[METADATA_KEY]
  })
}
