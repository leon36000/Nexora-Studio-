/** A message longer than this is a text to work on, not an instruction to schedule. */
const SCHEDULE_MAX_CHARS = 400

const WEEKDAYS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche'
const PERIODS = 'jour|semaine|mois|matin|soir|année|an'

const SCHEDULE_PHRASES: readonly RegExp[] = [
  new RegExp(`(?:^|[^\\p{L}])chaque (?:${WEEKDAYS}|${PERIODS})(?![\\p{L}])`, 'iu'),
  /(?:^|[^\p{L}])chaque \d{1,2}(?:er|e)? du mois(?![\p{L}])/iu,
  /(?:^|[^\p{L}])tous les (?:\d+ )?(?:jours|matins|soirs|mois|ans)(?![\p{L}])/iu,
  new RegExp(`(?:^|[^\\p{L}])tous les (?:${WEEKDAYS})s(?![\\p{L}])`, 'iu'),
  /(?:^|[^\p{L}])toutes les (?:\d+ )?(?:minutes|heures|semaines)(?![\p{L}])/iu,
  new RegExp(`(?:^|[^\\p{L}])du (?:${WEEKDAYS}) au (?:${WEEKDAYS})(?![\\p{L}])`, 'iu'),
  /(?:^|[^\p{L}])une fois par (?:jour|semaine|mois)(?![\p{L}])/iu,
]

/**
 * Whether what the member typed reads as an instruction to repeat (« chaque lundi à 9 h, … »,
 * « tous les matins à 8 h, … »), in which case the Assistant offers to schedule it as a task
 * instead of sending it to the agent. A question, or a long text, is left to the agent. The
 * member decides: this only proposes.
 */
export function looksLikeScheduledTask(message: string): boolean {
  const text = message.trim()
  if (text === '' || text.length > SCHEDULE_MAX_CHARS || text.endsWith('?')) return false
  return SCHEDULE_PHRASES.some((phrase) => phrase.test(text))
}

/** The link to the editor is for writers and administrators; a reader has nothing to edit. */
export function canOpenInEditor(permission: string | null | undefined): boolean {
  return permission === 'write' || permission === 'admin'
}
