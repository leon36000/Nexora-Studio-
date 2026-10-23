/**
 * Why a schedule was turned off. Threaded from the disable call site into the
 * notification, because `workflow_schedule` has no column that records it. The
 * notification shows fixed copy per reason (`emails` messages,
 * `scheduleDisabled.reasons`) rather than the underlying error string, which can
 * contain credentials or customer data.
 */
export type ScheduleDisableReason =
  | 'consecutive_failures'
  | 'authentication_error'
  | 'authorization_error'
  | 'workflow_not_found'
  | 'invalid_schedule'
