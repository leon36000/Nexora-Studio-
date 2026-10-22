import type { ComboboxOption } from '@sim/emcn'
import { isValidTimezone, sanitizeTimezoneForDisplay } from '@/lib/core/utils/timezone'

export const AUTO_TIMEZONE_OPTION_VALUE = '__auto_timezone__'
export const INVALID_TIMEZONE_OPTION_VALUE = '__invalid_timezone__'

interface TimezonePickerPresentation {
  value: string
  options: ComboboxOption[]
}

interface TimezonePickerLabels {
  auto: (timezone: string) => string
  invalid: (timezone: string) => string
  empty: string
}

/** Builds the picker state without making an unset browser fallback look persisted. */
export function getTimezonePickerPresentation(
  savedTimezone: string | null,
  browserTimezone: string,
  timezoneOptions: readonly ComboboxOption[],
  labels: TimezonePickerLabels
): TimezonePickerPresentation {
  const hasInvalidTimezone = savedTimezone !== null && !isValidTimezone(savedTimezone)
  const unlistedTimezone =
    savedTimezone !== null &&
    !hasInvalidTimezone &&
    !timezoneOptions.some((option) => option.value === savedTimezone)
      ? savedTimezone
      : null
  const safeInvalidTimezone =
    savedTimezone === null ? '' : sanitizeTimezoneForDisplay(savedTimezone)
  const browserTimezoneLabel =
    timezoneOptions.find((option) => option.value === browserTimezone)?.label ??
    sanitizeTimezoneForDisplay(browserTimezone)

  return {
    value: hasInvalidTimezone
      ? INVALID_TIMEZONE_OPTION_VALUE
      : (savedTimezone ?? AUTO_TIMEZONE_OPTION_VALUE),
    options: [
      { label: labels.auto(browserTimezoneLabel), value: AUTO_TIMEZONE_OPTION_VALUE },
      ...(hasInvalidTimezone
        ? [
            {
              label: labels.invalid(safeInvalidTimezone || labels.empty),
              value: INVALID_TIMEZONE_OPTION_VALUE,
              disabled: true,
            },
          ]
        : []),
      ...(unlistedTimezone
        ? [
            {
              label: sanitizeTimezoneForDisplay(unlistedTimezone),
              value: unlistedTimezone,
            },
          ]
        : []),
      ...timezoneOptions,
    ],
  }
}

export function timezonePreferenceFromPickerValue(value: string): string | null | undefined {
  if (value === INVALID_TIMEZONE_OPTION_VALUE) return undefined
  return value === AUTO_TIMEZONE_OPTION_VALUE ? null : value
}
