'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Button,
  ChipButtonGroup,
  ChipButtonGroupItem,
  ChipCombobox,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  type ComboboxOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from '@sim/emcn'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { truncate } from '@sim/utils/string'
import { useTranslations } from 'next-intl'
import {
  buildAutoMapping,
  CSV_DELIMITER_SNIFF_BYTES,
  type CsvDelimiter,
  detectCsvDelimiter,
  parseCsvBuffer,
} from '@/lib/table/import'
import type { TableDefinition } from '@/lib/table/types'
import { type CsvImportMode, useImportCsvIntoTable } from '@/hooks/queries/tables'
import { useImportTrayStore } from '@/stores/table/import-tray/store'

const logger = createLogger('ImportCsvDialog')

const MAX_SAMPLE_ROWS = 5
const MAX_EXAMPLES_IN_ERROR = 3
/**
 * Bytes read for the preview/mapping. We never parse the whole file client-side — the importer
 * streams it server-side and the DB row-count trigger enforces the row limit.
 */
const CSV_PREVIEW_BYTES = 512 * 1024
/**
 * Sentinel value for the "Do not import" option in the mapping combobox. The
 * whitespace is intentional: valid column names must match `NAME_PATTERN`
 * (`/^[A-Za-z_][A-Za-z0-9_]*$/`), so no real column can share this value.
 */
const SKIP_VALUE = '__ skip __'
/**
 * Sentinel for the "Create new column" option. Same whitespace trick as
 * `SKIP_VALUE` to avoid colliding with any valid column name.
 */
const CREATE_VALUE = '__ create __'

/** Translator scoped to the `tables.importCsv` namespace. */
type Translate = (key: string, values?: Record<string, string | number>) => string

/**
 * Converts the verbose backend error messages into a short, human-friendly
 * summary suitable for the modal footer. Specifically collapses repeated
 * `Row N: Column "X" must be unique. Value "Y" already exists in row M`
 * segments into a single concise summary.
 */
function summarizeImportError(message: string, t: Translate): string {
  const uniqueMatches = [
    ...message.matchAll(/Column\s+"([^"]+)"\s+must be unique\.\s+Value\s+"([^"]+)"/g),
  ]
  if (uniqueMatches.length > 0) {
    const column = uniqueMatches[0][1]
    const values = Array.from(new Set(uniqueMatches.map((m) => m[2])))
    const preview = values
      .slice(0, MAX_EXAMPLES_IN_ERROR)
      .map((v) => `"${v}"`)
      .join(', ')
    const extra = values.length - MAX_EXAMPLES_IN_ERROR
    const suffix = extra > 0 ? t('errors.moreSuffix', { extra }) : ''
    return t('errors.uniqueConflict', { count: values.length, column, preview, suffix })
  }

  const requiredMatch = message.match(/missing required columns?:\s*(.+)/i)
  if (requiredMatch) {
    return t('errors.missingRequired', { columns: requiredMatch[1].replace(/[.;]+$/, '') })
  }

  const rowLimitMatch = message.match(/row limit[^.;]*/i)
  if (rowLimitMatch) {
    return rowLimitMatch[0].trim()
  }

  const trimmed = message.trim()
  if (trimmed.length > 180) return truncate(trimmed, 177)
  return trimmed
}

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  table: TableDefinition
  onImported?: (result: { insertedCount?: number; deletedCount?: number }) => void
}

interface ParsedCsv {
  file: File
  headers: string[]
  sampleRows: Record<string, unknown>[]
}

/**
 * Parses the head of a CSV/TSV for the mapping + sample, dropping any truncated final line.
 *
 * The separator is sniffed from the same leading bytes the server sniffs, so the mapping shown
 * here always matches the columns the import will actually produce.
 */
async function parseCsvPreview(file: File, fallbackDelimiter: CsvDelimiter) {
  const sliced = file.size > CSV_PREVIEW_BYTES
  const blob = sliced ? file.slice(0, CSV_PREVIEW_BYTES) : file
  let bytes = new Uint8Array(await blob.arrayBuffer())
  if (sliced) {
    const lastNewline = bytes.lastIndexOf(0x0a)
    if (lastNewline > 0) bytes = bytes.subarray(0, lastNewline + 1)
  }
  // The sniff sample is the whole file only when nothing was sliced off and it fits the window;
  // otherwise it's a truncated prefix whose last line may be partial.
  const delimiter = await detectCsvDelimiter(
    bytes.subarray(0, CSV_DELIMITER_SNIFF_BYTES),
    fallbackDelimiter,
    { complete: !sliced && bytes.length <= CSV_DELIMITER_SNIFF_BYTES }
  )
  return parseCsvBuffer(bytes, delimiter)
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  workspaceId,
  table,
  onImported,
}: ImportCsvDialogProps) {
  const t = useTranslations('tables.importCsv')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [mapping, setMapping] = useState<Record<string, string | null>>({})
  const [createHeaders, setCreateHeaders] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<CsvImportMode>('append')
  const importMutation = useImportCsvIntoTable()

  function resetState() {
    setParsed(null)
    setParseError(null)
    setSubmitError(null)
    setMapping({})
    setCreateHeaders(new Set())
    setMode('append')
    setParsing(false)
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) resetState()
    onOpenChange(newOpen)
  }

  const prevTableIdRef = useRef(table.id)
  if (prevTableIdRef.current !== table.id) {
    prevTableIdRef.current = table.id
    resetState()
  }

  // Replace deletes every existing row and creating columns is a schema change,
  // so each needs its own lock clear. Withholding them here keeps the dialog
  // from offering a configuration the server can only answer with a 423.
  const canReplace = !table.locks?.deleteLocked
  const canCreateColumns = !table.locks?.schemaLocked

  const columnOptions: ComboboxOption[] = useMemo(() => {
    const options: ComboboxOption[] = [
      { label: t('mapping.doNotImport'), value: SKIP_VALUE },
      ...(canCreateColumns ? [{ label: t('mapping.createNewColumn'), value: CREATE_VALUE }] : []),
    ]
    for (const col of table.schema.columns) {
      options.push({
        label: col.required ? t('mapping.requiredColumn', { name: col.name }) : col.name,
        value: col.name,
      })
    }
    return options
  }, [table.schema.columns, canCreateColumns, t])

  async function handleFileSelected(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'csv' && ext !== 'tsv') {
      setParseError(t('errors.unsupportedFile'))
      return
    }
    setParsing(true)
    setParseError(null)
    try {
      const { headers, rows } = await parseCsvPreview(file, ext === 'tsv' ? '\t' : ',')
      const autoMapping = buildAutoMapping(headers, table.schema)
      setParsed({
        file,
        headers,
        sampleRows: rows.slice(0, MAX_SAMPLE_ROWS),
      })
      setMapping(autoMapping)
    } catch (err) {
      const message = getErrorMessage(err, t('errors.parseFailed'))
      logger.error('CSV parse failed', err)
      setParseError(message)
    } finally {
      setParsing(false)
    }
  }

  function handleFilesSelected(files: File[]) {
    const file = files[0]
    if (file) void handleFileSelected(file)
  }

  function handleMappingChange(header: string, value: string) {
    setSubmitError(null)
    if (value === CREATE_VALUE) {
      setCreateHeaders((prev) => {
        const next = new Set(prev)
        next.add(header)
        return next
      })
      setMapping((prev) => ({ ...prev, [header]: null }))
      return
    }
    setCreateHeaders((prev) => {
      if (!prev.has(header)) return prev
      const next = new Set(prev)
      next.delete(header)
      return next
    })
    setMapping((prev) => ({
      ...prev,
      [header]: value === SKIP_VALUE ? null : value,
    }))
  }

  function handleCreateAllUnmapped() {
    if (!parsed) return
    setSubmitError(null)
    setCreateHeaders((prev) => {
      const next = new Set(prev)
      for (const header of parsed.headers) {
        if (!mapping[header] && !next.has(header)) next.add(header)
      }
      return next
    })
  }

  function handleModeChange(value: string) {
    setSubmitError(null)
    if (value === 'replace' && !canReplace) return
    setMode(value as CsvImportMode)
  }

  const { missingRequired, duplicateTargets, mappedCount, skipCount, createCount } = useMemo(() => {
    const mappedTargets = new Map<string, string[]>()
    let mapped = 0
    let skipped = 0
    let creating = 0
    for (const header of parsed?.headers ?? []) {
      if (createHeaders.has(header)) {
        creating++
        continue
      }
      const target = mapping[header]
      if (!target) {
        skipped++
        continue
      }
      mapped++
      const existing = mappedTargets.get(target) ?? []
      existing.push(header)
      mappedTargets.set(target, existing)
    }
    const dupes = [...mappedTargets.entries()]
      .filter(([, headers]) => headers.length > 1)
      .map(([col]) => col)
    const mappedSet = new Set(mappedTargets.keys())
    const missing = table.schema.columns
      .filter((c) => c.required && !mappedSet.has(c.name))
      .map((c) => c.name)
    return {
      missingRequired: missing,
      duplicateTargets: dupes,
      mappedCount: mapped,
      skipCount: skipped,
      createCount: creating,
    }
  }, [mapping, parsed?.headers, table.schema.columns, createHeaders])

  const canSubmit =
    parsed !== null &&
    !importMutation.isPending &&
    missingRequired.length === 0 &&
    duplicateTargets.length === 0 &&
    mappedCount + createCount > 0

  async function handleSubmit() {
    if (!parsed || !canSubmit) return
    setSubmitError(null)
    // Hiding the Replace control doesn't clear an already-selected `mode`, so a
    // delete lock landing while the dialog is open would still submit replace.
    const effectiveMode: CsvImportMode = canReplace ? mode : 'append'
    const createColumns =
      canCreateColumns && createHeaders.size > 0 ? [...createHeaders] : undefined

    let importId: string | null = null
    onOpenChange(false)
    toast.success(t('importingInBackground', { file: parsed.file.name, table: table.name }))
    importMutation.mutate(
      {
        workspaceId,
        tableId: table.id,
        file: parsed.file,
        mode: effectiveMode,
        mapping,
        createColumns,
        onCreated: (createdImportId) => {
          importId = createdImportId
          useImportTrayStore.getState().startUpload({
            uploadId: createdImportId,
            tableId: table.id,
            workspaceId,
            title: parsed.file.name,
          })
        },
        onProgress: (percent) => {
          if (importId) useImportTrayStore.getState().setUploadPercent(importId, percent)
        },
      },
      {
        onSuccess: () => {
          if (importId) {
            useImportTrayStore.getState().endUpload(importId)
            useImportTrayStore.getState().consumeCanceled(importId)
          }
          onImported?.({})
        },
        onError: (error) => {
          if (importId) useImportTrayStore.getState().endUpload(importId)
          setSubmitError(summarizeImportError(error.message, t))
        },
      }
    )
  }

  const hasWarning = missingRequired.length > 0 || duplicateTargets.length > 0

  return (
    <ChipModal
      open={open}
      onOpenChange={handleOpenChange}
      srTitle={t('titleInto', { name: table.name })}
      size='lg'
    >
      <ChipModalHeader onClose={() => handleOpenChange(false)}>
        {t('titleInto', { name: table.name })}
      </ChipModalHeader>
      <ChipModalBody>
        {!parsed ? (
          <ChipModalField
            type='file'
            title={t('title')}
            accept='.csv,.tsv'
            disabled={parsing}
            onChange={handleFilesSelected}
            label={parsing ? t('parsing') : t('dropzone')}
            draggingLabel={t('dropHere')}
            description={t('dropzoneDescription')}
            error={parseError ?? undefined}
          />
        ) : (
          <>
            <ChipModalField type='custom' title={t('file')}>
              <div className='flex items-center justify-between gap-3 rounded-sm border border-[var(--border)] p-2'>
                <div className='flex min-w-0 flex-col'>
                  <span className='truncate text-[var(--text-primary)] text-caption'>
                    {parsed.file.name}
                  </span>
                  <span className='text-[var(--text-tertiary)] text-xs'>
                    {t('columnCount', { count: parsed.headers.length })}
                  </span>
                </div>
                <Button variant='ghost' size='sm' onClick={resetState}>
                  {t('changeFile')}
                </Button>
              </div>
            </ChipModalField>

            <ChipModalField type='custom' title={t('mode')}>
              <ChipButtonGroup value={mode} onValueChange={handleModeChange}>
                <ChipButtonGroupItem value='append'>{t('append')}</ChipButtonGroupItem>
                {canReplace && (
                  <ChipButtonGroupItem value='replace'>{t('replaceAll')}</ChipButtonGroupItem>
                )}
              </ChipButtonGroup>
            </ChipModalField>

            <ChipModalField type='custom' title={t('mapping.title')}>
              {skipCount > 0 && (
                <div className='flex justify-end'>
                  <Button
                    variant='ghost'
                    size='sm'
                    disabled={!canCreateColumns}
                    onClick={handleCreateAllUnmapped}
                  >
                    {t('mapping.createForUnmapped', { count: skipCount })}
                  </Button>
                </div>
              )}
              <div className='overflow-hidden rounded-sm border border-[var(--border)]'>
                <div className='max-h-[320px] overflow-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('mapping.csvColumn')}</TableHead>
                        <TableHead>{t('mapping.targetColumn')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.headers.map((header) => {
                        const sample = parsed.sampleRows
                          .map((r) =>
                            r[header] === '' || r[header] == null ? '' : String(r[header])
                          )
                          .filter(Boolean)
                          .slice(0, 2)
                          .join(', ')
                        return (
                          <TableRow key={header}>
                            <TableCell>
                              <div className='flex min-w-0 flex-col'>
                                <span className='truncate text-[var(--text-primary)]'>
                                  {header}
                                </span>
                                {sample && (
                                  <span className='truncate text-[var(--text-tertiary)] text-xs'>
                                    {sample}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <ChipCombobox
                                options={columnOptions}
                                value={
                                  createHeaders.has(header)
                                    ? CREATE_VALUE
                                    : (mapping[header] ?? SKIP_VALUE)
                                }
                                onChange={(value) => handleMappingChange(header, value)}
                                className='w-full'
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <span className='text-[var(--text-tertiary)] text-xs'>
                {t('mapping.mapped', { count: mappedCount })}
                {createCount > 0 ? t('mapping.newColumns', { count: createCount }) : ''}
                {' · '}
                {t('mapping.skipped', { count: skipCount })}
              </span>
            </ChipModalField>

            {missingRequired.length > 0 && (
              <ChipModalError>
                {t('errors.missingRequired', { columns: missingRequired.join(', ') })}
              </ChipModalError>
            )}
            {duplicateTargets.length > 0 && (
              <ChipModalError>
                {t('errors.duplicateTargets', { columns: duplicateTargets.join(', ') })}
              </ChipModalError>
            )}

            {mode === 'replace' && !hasWarning && (
              <ChipModalError>
                {t('replaceWarning', { rows: table.rowCount.toLocaleString() })}
              </ChipModalError>
            )}

            <ChipModalError title={submitError ?? undefined}>{submitError}</ChipModalError>
          </>
        )}
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        cancelDisabled={importMutation.isPending}
        defaultAction={mode === 'replace' ? 'none' : 'primary'}
        primaryAction={{
          label: importMutation.isPending
            ? mode === 'replace'
              ? t('submit.replacing')
              : t('submit.importing')
            : mode === 'replace'
              ? t('submit.replace')
              : t('submit.append'),
          onClick: handleSubmit,
          disabled: !canSubmit,
          variant: mode === 'replace' ? 'destructive' : 'primary',
        }}
      />
    </ChipModal>
  )
}
