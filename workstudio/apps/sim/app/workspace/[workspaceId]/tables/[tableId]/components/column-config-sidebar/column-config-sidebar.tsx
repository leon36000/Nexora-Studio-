'use client'

import { useState } from 'react'
import {
  Button,
  ChipCombobox,
  ChipInput,
  cn,
  FieldDivider,
  Label,
  Switch,
  Tooltip,
  toast,
} from '@sim/emcn'
import { X } from '@sim/emcn/icons'
import { toError } from '@sim/utils/errors'
import { useTranslations } from 'next-intl'
import { findValidationIssue, isValidationError } from '@/lib/api/client/errors'
import type { ColumnDefinition, SelectOption } from '@/lib/table'
import {
  DEFAULT_CURRENCY_CODE,
  getCurrencyOptions,
  resolveCurrencyCode,
} from '@/lib/table/currency'
import {
  FieldError,
  RequiredLabel,
} from '@/app/workspace/[workspaceId]/tables/[tableId]/components/sidebar-fields'
import { useAddTableColumn, useUpdateColumn } from '@/hooks/queries/tables'
import { SelectOptionsEditor } from '../select-field'
import { columnTypeOptionsForTable } from './column-types'

/** Whether a column type carries an option set. */
function isSelectType(type: ColumnDefinition['type']): boolean {
  return type === 'select'
}

/**
 * Picker entries, built once at module load: the option list is derived from the
 * runtime's currency data and never varies per column.
 */
const CURRENCY_COMBOBOX_OPTIONS = getCurrencyOptions().map((c) => ({
  value: c.code,
  label: `${c.code} · ${c.name}`,
}))

function optionsEqual(a: SelectOption[], b: SelectOption[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Discriminates the two flows the column-config sidebar handles. Workflow
 * configuration is a separate component (`<WorkflowSidebar>`) so this surface
 * never has to branch on `isWorkflow`.
 */
export type ColumnConfig =
  | { mode: 'create'; proposedName: string; type: ColumnDefinition['type'] }
  | { mode: 'edit'; columnName: string }

interface ColumnConfigSidebarProps {
  /** When non-null the sidebar is open. */
  config: ColumnConfig | null
  onClose: () => void
  /** Existing column record for `mode: 'edit'`; ignored otherwise. */
  existingColumn: ColumnDefinition | null
  allColumns: readonly ColumnDefinition[]
  workspaceId: string
  tableId: string
  /** Notify parent of a rename so it can rewrite local `columnOrder` /
   *  `columnWidths` keys that reference the old name. */
  onColumnRename?: (oldName: string, newName: string) => void
  /**
   * Opens the panel for reading only — every field is inert and Save is
   * disabled behind {@link readOnlyReason}. The header click that opens this
   * sidebar is a primary affordance, so a schema-locked (or read-only) table
   * shows the column's settings rather than swallowing the click.
   */
  readOnly?: boolean
  /** Why saving is unavailable; surfaced on the disabled Save button. */
  readOnlyReason?: string
}

/**
 * Right-edge sidebar for plain (non-workflow) column configuration. Handles
 * create (with type pre-chosen by the parent's "+ New column" dropdown) and
 * edit. No `isWorkflow` branches — workflow-output columns route through
 * `<WorkflowSidebar>` instead.
 *
 * Form state seeds from props via lazy `useState` initializers; the parent
 * uses `key={config?.columnName ?? 'closed'}` to remount when switching
 * columns, eliminating the prop-mirroring `useEffect` the previous combined
 * sidebar relied on.
 */
export function ColumnConfigSidebar(props: ColumnConfigSidebarProps) {
  // Mount the form body with `key` keyed on the config identity so opening a
  // different column / mode remounts and re-seeds state from props.
  const t = useTranslations('tables.columnSidebar')
  const open = props.config !== null
  return (
    <aside
      role='dialog'
      aria-label={t('title')}
      className={cn(
        'absolute top-0 right-0 bottom-0 z-[var(--z-modal)] flex w-full flex-col overflow-hidden border-[var(--border)] border-l bg-[var(--bg)] transition-transform duration-200 ease-out motion-reduce:transition-none md:w-[400px]',
        open ? 'translate-x-0 shadow-overlay' : 'translate-x-full'
      )}
    >
      {props.config && (
        <ColumnConfigBody key={configKey(props.config)} {...props} config={props.config} />
      )}
    </aside>
  )
}

function configKey(config: ColumnConfig): string {
  return config.mode === 'edit' ? `edit:${config.columnName}` : `create:${config.proposedName}`
}

interface ColumnConfigBodyProps extends Omit<ColumnConfigSidebarProps, 'config'> {
  config: ColumnConfig
}

function ColumnConfigBody({
  config,
  onClose,
  existingColumn,
  allColumns,
  workspaceId,
  tableId,
  onColumnRename,
  readOnly,
  readOnlyReason,
}: ColumnConfigBodyProps) {
  const t = useTranslations('tables.columnSidebar')
  const tSidebar = useTranslations('tables.sidebar')
  const tTypes = useTranslations('tables.columnTypes')
  const updateColumn = useUpdateColumn({ workspaceId, tableId })
  const addColumn = useAddTableColumn({ workspaceId, tableId })

  const [nameInput, setNameInput] = useState<string>(() =>
    config.mode === 'edit' ? (existingColumn?.name ?? config.columnName) : config.proposedName
  )
  const [typeInput, setTypeInput] = useState<ColumnDefinition['type']>(() =>
    config.mode === 'edit' ? (existingColumn?.type ?? 'string') : config.type
  )
  const [uniqueInput, setUniqueInput] = useState<boolean>(() =>
    config.mode === 'edit' ? !!existingColumn?.unique : false
  )
  const [optionsInput, setOptionsInput] = useState<SelectOption[]>(() =>
    config.mode === 'edit' ? (existingColumn?.options ?? []) : []
  )
  const [multipleInput, setMultipleInput] = useState<boolean>(() =>
    config.mode === 'edit' ? !!existingColumn?.multiple : false
  )
  const [currencyInput, setCurrencyInput] = useState<string>(() =>
    config.mode === 'edit'
      ? resolveCurrencyCode(existingColumn?.currencyCode)
      : DEFAULT_CURRENCY_CODE
  )
  const [showValidation, setShowValidation] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const saveDisabled = updateColumn.isPending || addColumn.isPending
  const trimmedName = nameInput.trim()
  const wantsOptions = isSelectType(typeInput)
  const wantsCurrency = typeInput === 'currency'
  const trimmedOptions = optionsInput.map((o) => ({ ...o, name: o.name.trim() }))

  /** Client-side option validation mirroring the server rules; returns an error message or null. */
  function validateOptions(): string | null {
    if (!wantsOptions) return null
    if (trimmedOptions.length === 0) return t('options.atLeastOne')
    if (trimmedOptions.some((o) => !o.name)) return t('options.emptyName')
    const names = trimmedOptions.map((o) => o.name.toLowerCase())
    if (new Set(names).size !== names.length) return t('options.uniqueNames')
    return null
  }

  async function handleSave() {
    // Belt and braces: the button is disabled, and the server refuses too.
    if (readOnly) return
    if (!trimmedName) {
      setShowValidation(true)
      return
    }

    const optionsIssue = validateOptions()
    if (optionsIssue) {
      setOptionsError(optionsIssue)
      return
    }

    try {
      if (config.mode === 'create') {
        await addColumn.mutateAsync({
          name: trimmedName,
          type: typeInput,
          // Select columns don't expose a unique constraint.
          ...(!wantsOptions && uniqueInput ? { unique: true } : {}),
          ...(wantsOptions ? { options: trimmedOptions } : {}),
          ...(wantsOptions && multipleInput ? { multiple: true } : {}),
          ...(wantsCurrency ? { currencyCode: currencyInput } : {}),
        })
        toast.success(t('added', { name: trimmedName }))
        onClose()
        return
      }

      // `config.columnName` is the column id; compare against the current display
      // name to detect an actual rename.
      const renamed = trimmedName !== (existingColumn?.name ?? config.columnName)
      const typeChanged = !!existingColumn && existingColumn.type !== typeInput
      const uniqueChanged =
        !wantsOptions && !!existingColumn && !!existingColumn.unique !== uniqueInput
      // Select columns don't offer a Unique control, so converting a unique
      // column to select would strand the constraint with no way to clear it.
      const uniqueCleared = wantsOptions && !!existingColumn?.unique
      const optionsChanged =
        wantsOptions && !optionsEqual(existingColumn?.options ?? [], trimmedOptions)
      const multipleChanged = wantsOptions && !!existingColumn?.multiple !== multipleInput
      const currencyChanged =
        wantsCurrency && resolveCurrencyCode(existingColumn?.currencyCode) !== currencyInput

      const updates: {
        name?: string
        type?: ColumnDefinition['type']
        unique?: boolean
        options?: SelectOption[]
        multiple?: boolean
        currencyCode?: string
      } = {
        ...(renamed ? { name: trimmedName } : {}),
        ...(typeChanged ? { type: typeInput } : {}),
        ...(uniqueChanged ? { unique: uniqueInput } : {}),
        ...(uniqueCleared ? { unique: false } : {}),
        ...(wantsOptions && (typeChanged || optionsChanged) ? { options: trimmedOptions } : {}),
        ...(wantsOptions && (typeChanged || multipleChanged) ? { multiple: multipleInput } : {}),
        ...(wantsCurrency && (typeChanged || currencyChanged)
          ? { currencyCode: currencyInput }
          : {}),
      }
      if (Object.keys(updates).length === 0) {
        onClose()
        return
      }

      await updateColumn.mutateAsync({ columnName: config.columnName, updates })
      if (renamed) onColumnRename?.(config.columnName, trimmedName)
      toast.success(t('saved', { name: trimmedName }))
      onClose()
    } catch (err) {
      if (isValidationError(err)) {
        const nameIssue =
          findValidationIssue(err, ['updates', 'name']) ??
          findValidationIssue(err, ['name']) ??
          findValidationIssue(err, ['columnName'])
        if (nameIssue) {
          setNameError(nameIssue.message)
          return
        }
        toast.error(toError(err).message)
      }
    }
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex min-h-[48px] items-center justify-between border-[var(--border)] border-b px-3 py-[8.5px] max-md:pointer-coarse:py-0.5'>
        <h2 className='text-[var(--text-primary)] text-small'>{t('title')}</h2>
        <Button
          variant='ghost'
          size='sm'
          onClick={onClose}
          iconPadding='sm'
          className='size-7 max-md:pointer-coarse:size-11'
          aria-label={tSidebar('close')}
        >
          <X className='size-[14px]' />
        </Button>
      </div>

      <div className='flex-1 overflow-y-auto overflow-x-hidden px-2 pt-3 pb-2 [overflow-anchor:none]'>
        {/* `disabled` on the fieldset reaches every native control inside,
            including the comboboxes' trigger buttons; `contents` keeps the
            existing layout. Values stay readable and selectable. */}
        <fieldset disabled={readOnly} className='contents'>
          <div className='flex flex-col gap-[9.5px]'>
            <RequiredLabel htmlFor='column-sidebar-name'>{tSidebar('columnName')}</RequiredLabel>
            <ChipInput
              id='column-sidebar-name'
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value)
                if (nameError) setNameError(null)
              }}
              spellCheck={false}
              autoComplete='off'
              error={Boolean((showValidation && !trimmedName) || nameError)}
              aria-invalid={(showValidation && !trimmedName) || nameError ? true : undefined}
            />
            {showValidation && !trimmedName && <FieldError message={t('nameRequired')} />}
            {nameError && !(showValidation && !trimmedName) && <FieldError message={nameError} />}
          </div>

          {config.mode === 'edit' && (
            <>
              <FieldDivider />
              <div className='flex flex-col gap-[9.5px]'>
                <RequiredLabel>{t('type')}</RequiredLabel>
                <ChipCombobox
                  options={columnTypeOptionsForTable(allColumns, existingColumn, tTypes)
                    .filter((option) => option.type !== 'workflow')
                    .map((option) => ({
                      label: option.label,
                      value: option.type,
                      icon: option.icon,
                      disabled: option.disabledReason !== undefined,
                    }))}
                  value={typeInput}
                  onChange={(v) => setTypeInput(v as ColumnDefinition['type'])}
                  placeholder={t('selectType')}
                  maxHeight={300}
                />
              </div>
            </>
          )}

          {wantsCurrency && (
            <>
              <FieldDivider />
              <div className='flex flex-col gap-[9.5px]'>
                <RequiredLabel>{t('currency')}</RequiredLabel>
                <ChipCombobox
                  options={CURRENCY_COMBOBOX_OPTIONS}
                  value={currencyInput}
                  onChange={setCurrencyInput}
                  placeholder={t('selectCurrency')}
                  searchable
                  searchPlaceholder={t('searchCurrencies')}
                  maxHeight={260}
                />
              </div>
            </>
          )}

          {wantsOptions && (
            <>
              <FieldDivider />
              <div className='flex flex-col gap-[9.5px]'>
                <RequiredLabel>{t('options.label')}</RequiredLabel>
                <SelectOptionsEditor
                  options={optionsInput}
                  onChange={(next) => {
                    setOptionsInput(next)
                    if (optionsError) setOptionsError(null)
                  }}
                />
                {optionsError && <FieldError message={optionsError} />}
              </div>
              <FieldDivider />
              <div className='flex items-center justify-between pl-0.5'>
                <Label htmlFor='column-sidebar-multiple'>{t('multiselect')}</Label>
                <Switch
                  id='column-sidebar-multiple'
                  checked={multipleInput}
                  onCheckedChange={(v) => setMultipleInput(!!v)}
                />
              </div>
            </>
          )}

          {/* Select columns don't expose a unique constraint. */}
          {!wantsOptions && (
            <>
              <FieldDivider />
              <div className='flex flex-col gap-[9.5px]'>
                <div className='flex items-center justify-between pl-0.5'>
                  <Label htmlFor='column-sidebar-unique'>{t('unique')}</Label>
                  <Switch
                    id='column-sidebar-unique'
                    checked={uniqueInput}
                    onCheckedChange={(v) => setUniqueInput(!!v)}
                  />
                </div>
              </div>
            </>
          )}
        </fieldset>
      </div>

      <div className='flex items-center justify-end gap-2 border-[var(--border)] border-t px-2 py-3'>
        <Button
          variant='default'
          size='sm'
          onClick={onClose}
          className='max-md:pointer-coarse:min-h-11 max-md:pointer-coarse:min-w-11'
        >
          {readOnly ? tSidebar('close') : tSidebar('cancel')}
        </Button>
        {readOnly ? (
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <span className='inline-flex'>
                <Button
                  variant='primary'
                  size='sm'
                  disabled
                  className='max-md:pointer-coarse:min-h-11 max-md:pointer-coarse:min-w-11'
                >
                  {tSidebar('save')}
                </Button>
              </span>
            </Tooltip.Trigger>
            {readOnlyReason && <Tooltip.Content>{readOnlyReason}</Tooltip.Content>}
          </Tooltip.Root>
        ) : (
          <Button
            variant='primary'
            size='sm'
            onClick={handleSave}
            disabled={saveDisabled}
            className='max-md:pointer-coarse:min-h-11 max-md:pointer-coarse:min-w-11'
          >
            {saveDisabled ? t('saving') : tSidebar('save')}
          </Button>
        )}
      </div>
    </div>
  )
}
