// i18n-defaults: common.emcn
'use client'

import { createContext, type ReactNode, useContext, useMemo } from 'react'

/**
 * The copy emcn renders when a consumer passes none: button captions, empty states,
 * placeholders, and screen-reader names.
 *
 * The package cannot depend on an application's translations, so this English set is the one
 * place its copy lives; an application supplies its own language through
 * {@link EmcnLabelsProvider}. A prop a consumer passes explicitly always wins over a label.
 */
const EMCN_DEFAULT_LABELS = {
  add: 'Add',
  addAnother: 'Add another',
  addNoun: 'Add {noun}',
  addTag: 'Add tag',
  all: 'All',
  apply: 'Apply',
  back: 'Back',
  cancel: 'Cancel',
  /** Name of the English captions track. */
  captionsEnglish: 'English',
  clear: 'Clear',
  close: 'Close',
  closeMediaViewer: 'Close media viewer',
  closeOptions: 'Close options',
  closeTab: 'Close {title}',
  collapse: 'Collapse',
  confirm: 'Confirm',
  copied: 'Copied',
  copy: 'Copy',
  copyToClipboard: 'Copy to clipboard',
  countSelected: '{count} selected',
  date: 'Date',
  /** BCP 47 locale for the dates emcn formats itself. */
  dateLocale: 'en-US',
  delete: 'Delete',
  dialog: 'Dialog',
  dismiss: 'Dismiss',
  dismissNotification: 'Dismiss notification',
  done: 'Done',
  dropFileHere: 'Drop file here',
  dropFilesHere: 'Drop files here',
  dropFilesOrBrowse: 'Drop files here or click to browse',
  enterEmails: 'Enter emails',
  enterValues: 'Enter values',
  expand: 'Expand',
  hidePassword: 'Hide password',
  highlightSeries: 'Highlight {label}',
  invalidEmailFormat: 'Invalid email format',
  invalidEmailOrDomain: 'Invalid email or domain',
  invalidSelection: 'Invalid selection.',
  loading: 'Loading...',
  loadingOptions: 'Loading options...',
  loadingValue: 'Loading value',
  loadMore: 'Load more',
  maxTabs: 'Maximum of {count} tabs',
  mediaControls: 'Media controls',
  mediaViewer: 'Media viewer',
  mediaZoom: 'Media zoom',
  /** Month names, January first, comma-separated. */
  months: 'January,February,March,April,May,June,July,August,September,October,November,December',
  moreInformation: 'More information',
  multiStepWizard: 'Multi-step wizard',
  mute: 'Mute',
  newTab: 'New tab',
  next: 'Next',
  nextMonth: 'Next month',
  noData: 'No data',
  noMatchesInLoadedOptions: 'No matches in loaded options',
  noMatchesInPartialResults: 'No matches in partial results',
  noMatchingOptions: 'No matching options found',
  noOptionsAvailable: 'No options available',
  noOptionsLoaded: 'No options loaded',
  noResults: 'No results',
  notifications: 'Notifications',
  openOptions: 'Open options',
  pause: 'Pause',
  play: 'Play',
  previousMonth: 'Previous month',
  removeItem: 'Remove {value}',
  requiredField: 'Required.',
  rangeTo: 'to',
  search: 'Search...',
  searchAllOptions: 'Search all options',
  searchingOptions: 'Searching options...',
  seekVideo: 'Seek video',
  select: 'Select...',
  selectDate: 'Select date',
  selectDateRange: 'Select date range',
  selectTime: 'Select time',
  showPassword: 'Show password',
  showingPartialResults: 'Showing partial results',
  tabBackgroundActivity: '{title}, Background activity',
  tabs: 'Tabs',
  tagInput: 'Tag input',
  time: 'Time',
  today: 'Today',
  tryAgain: 'Try again',
  unmute: 'Unmute',
  uploadFile: 'Upload file',
  value: 'Value',
  valuesByDate: 'Values by date',
  /** Weekday initials, Sunday first, comma-separated. */
  weekdays: 'Su,Mo,Tu,We,Th,Fr,Sa',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
} as const

export type EmcnLabels = { readonly [K in keyof typeof EMCN_DEFAULT_LABELS]: string }

const EmcnLabelsContext = createContext<EmcnLabels>(EMCN_DEFAULT_LABELS)

interface EmcnLabelsProviderProps {
  /** Labels in the interface language; a missing key keeps its English default. */
  labels?: Partial<EmcnLabels>
  children: ReactNode
}

/**
 * Supplies emcn's built-in copy in the application's language.
 *
 * @example
 * <EmcnLabelsProvider labels={translatedLabels}>{children}</EmcnLabelsProvider>
 */
export function EmcnLabelsProvider({ labels, children }: EmcnLabelsProviderProps) {
  const value = useMemo(() => ({ ...EMCN_DEFAULT_LABELS, ...labels }), [labels])
  return <EmcnLabelsContext.Provider value={value}>{children}</EmcnLabelsContext.Provider>
}

/** Fills the `{name}` placeholders of a label. */
export function formatEmcnLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match
  )
}

/** emcn's built-in copy, in the language its nearest {@link EmcnLabelsProvider} supplies. */
export function useEmcnLabels(): EmcnLabels {
  return useContext(EmcnLabelsContext)
}
