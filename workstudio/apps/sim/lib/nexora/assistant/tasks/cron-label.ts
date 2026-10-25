const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const

const INTEGER = /^\d{1,2}$/

function clock(hour: number, minute: number): string {
  return minute === 0 ? `${hour} h` : `${hour} h ${String(minute).padStart(2, '0')}`
}

function integer(field: string, max: number): number | null {
  if (!INTEGER.test(field)) return null
  const value = Number(field)
  return value <= max ? value : null
}

/**
 * A schedule's cron expression as a French sentence, for the shapes the Copilot writes (every few
 * minutes, hourly, daily, weekly, monthly). Anything else is shown as the expression itself.
 */
export function describeCron(cron: string): string {
  const fallback = `Planification (${cron})`
  const fields = cron.trim().split(/\s+/)
  if (fields.length !== 5) return fallback
  const [minuteField, hourField, dayField, monthField, weekdayField] = fields
  if (monthField !== '*') return fallback

  if (hourField === '*' && dayField === '*' && weekdayField === '*') {
    if (minuteField === '*') return 'Toutes les minutes'
    const every = /^\*\/(\d{1,2})$/.exec(minuteField)
    if (every) return Number(every[1]) === 1 ? 'Toutes les minutes' : `Toutes les ${every[1]} minutes`
    const minute = integer(minuteField, 59)
    if (minute === null) return fallback
    return minute === 0 ? 'Toutes les heures' : `Toutes les heures, à la minute ${minute}`
  }

  const minute = integer(minuteField, 59)
  const hour = integer(hourField, 23)
  if (minute === null || hour === null) return fallback
  const at = clock(hour, minute)

  if (dayField === '*' && weekdayField === '*') return `Tous les jours à ${at}`
  if (dayField === '*') {
    const weekday = integer(weekdayField, 7)
    return weekday === null ? fallback : `Chaque ${WEEKDAYS[weekday % 7]} à ${at}`
  }
  if (weekdayField === '*') {
    const day = integer(dayField, 31)
    if (day === null || day === 0) return fallback
    return `Le ${day === 1 ? '1er' : day} de chaque mois à ${at}`
  }
  return fallback
}
