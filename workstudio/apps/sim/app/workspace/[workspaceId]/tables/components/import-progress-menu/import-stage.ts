import type { ImportRow } from './use-workspace-imports'

/** Translator scoped to the `tables.importProgress` namespace. */
type Translate = (key: string, values?: Record<string, string | number>) => string

type ProgressStatus = 'pending' | 'success' | 'error'

/** Uniform view model for a tray entry — every stage fills the same slots. */
export interface ImportStageView {
  status: ProgressStatus
  /** Primary line: `{status} {name}`, e.g. `Processing data.csv`. */
  title: string
  /** Right-aligned on the title row: the percent (when known). */
  meta?: string
  /** Secondary line: the row count, or the error message on failure. */
  detail?: string
  dismissible: boolean
}

/**
 * Maps a tray entry to the stage shown in the import dropdown. The single place the import
 * stages (Uploading → Processing → Imported / Failed) are defined; the row component just
 * renders the returned slots, so every stage looks consistent: `{status} {name}`. While
 * uploading, the right slot shows the byte-based upload percent (from the client XHR). Once the
 * server is processing we only know the committed row count (polled from the table row), so the
 * detail line reads `{rows} rows` with no percent.
 */
export function getImportStage(entry: ImportRow, t: Translate): ImportStageView {
  const rows = entry.rowsProcessed.toLocaleString()
  const name = entry.title
  const meta = typeof entry.percent === 'number' ? `${entry.percent}%` : undefined

  if (entry.jobType === 'export') {
    if (entry.phase === 'failed') {
      return {
        status: 'error',
        title: t('stage.exportFailed', { name }),
        detail: entry.error ?? t('stage.somethingWentWrong'),
        dismissible: true,
      }
    }
    if (entry.phase === 'ready') {
      // The menu replaces `detail` with a Download action for ready exports.
      return {
        status: 'success',
        title: t('stage.exported', { name }),
        detail: t('stage.rows', { rows }),
        dismissible: true,
      }
    }
    return {
      status: 'pending',
      title: t('stage.exporting', { name }),
      detail: t('stage.rows', { rows }),
      dismissible: false,
    }
  }

  if (entry.phase === 'failed') {
    return {
      status: 'error',
      title: t('stage.failed', { name }),
      detail: entry.error ?? t('stage.somethingWentWrong'),
      dismissible: true,
    }
  }

  if (entry.phase === 'ready') {
    return {
      status: 'success',
      title: t('stage.imported', { name }),
      detail: t('stage.rows', { rows }),
      dismissible: true,
    }
  }

  // importing: rows only start arriving once the worker is processing; before that it's the upload.
  if (entry.rowsProcessed > 0) {
    return {
      status: 'pending',
      title: t('stage.processing', { name }),
      detail: t('stage.rows', { rows }),
      dismissible: false,
    }
  }
  return { status: 'pending', title: t('stage.uploading', { name }), meta, dismissible: false }
}
