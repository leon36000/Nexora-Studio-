'use client'

import { memo, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Checkbox,
  ChipCombobox,
  ChipInput,
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  ChipTextarea,
  type ComboboxOption,
  cn,
  toast,
} from '@sim/emcn'
import { Loader, X } from '@sim/emcn/icons'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { type FieldErrors, useForm } from 'react-hook-form'
import { z } from 'zod'
import { MAX_CHUNKING_SEPARATOR_LENGTH, MAX_CHUNKING_SEPARATORS } from '@/lib/chunkers/constants'
import type { StrategyOptions } from '@/lib/chunkers/types'
import { KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH } from '@/lib/knowledge/constants'
import {
  assertMultiFileUploadAdmission,
  MultiFileUploadAdmissionError,
} from '@/lib/uploads/client/admission'
import { formatFileSize, validateKnowledgeBaseFile } from '@/lib/uploads/utils/file'
import { ACCEPT_ATTRIBUTE } from '@/lib/uploads/utils/validation'
import { useKnowledgeUpload } from '@/app/workspace/[workspaceId]/knowledge/hooks/use-knowledge-upload'
import { useCreateKnowledgeBase, useDeleteKnowledgeBase } from '@/hooks/queries/kb/knowledge'

const logger = createLogger('CreateBaseModal')

interface CreateBaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * Folder the new base is filed under — the folder the list is currently showing, so a
   * base created inside a folder appears where the user is looking. `null` is the root.
   */
  folderId?: string | null
}

const STRATEGY_OPTIONS = ['auto', 'text', 'recursive', 'sentence', 'token', 'regex'] as const

/** Arguments every validation message may interpolate (messages are stored as keys). */
const VALIDATION_ARGS = {
  descriptionMax: KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH,
  maxSeparators: MAX_CHUNKING_SEPARATORS,
  maxSeparatorLength: MAX_CHUNKING_SEPARATOR_LENGTH,
}

/** Splits the comma-separated separator field into the list the API receives. */
function parseSeparators(value: string | undefined): string[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((separator) => separator.trim().replace(/\\n/g, '\n').replace(/\\t/g, '\t'))
}

const FormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'nameRequired')
      .max(100, 'nameTooLong')
      .refine((value) => value.trim().length > 0, 'nameEmpty'),
    description: z
      .string()
      .max(KNOWLEDGE_BASE_DESCRIPTION_MAX_LENGTH, 'descriptionTooLong')
      .optional(),
    minChunkSize: z.number().min(1, 'minChunkTooSmall').max(2000, 'minChunkTooLarge'),
    maxChunkSize: z.number().min(100, 'maxChunkTooSmall').max(4000, 'maxChunkTooLarge'),
    overlapSize: z.number().min(0, 'overlapNegative').max(500, 'overlapTooLarge'),
    strategy: z.enum(['auto', 'text', 'regex', 'recursive', 'sentence', 'token']).default('auto'),
    regexPattern: z.string().optional(),
    regexStrictBoundaries: z.boolean().default(false),
    customSeparators: z.string().optional(),
  })
  .refine(
    (data) => {
      const maxChunkSizeInChars = data.maxChunkSize * 4
      return data.minChunkSize < maxChunkSizeInChars
    },
    {
      message: 'minChunkVsMax',
      path: ['minChunkSize'],
    }
  )
  .refine(
    (data) => {
      return data.overlapSize < data.maxChunkSize
    },
    {
      message: 'overlapVsMax',
      path: ['overlapSize'],
    }
  )
  .refine(
    (data) => {
      if (data.strategy === 'regex' && !data.regexPattern?.trim()) {
        return false
      }
      return true
    },
    {
      message: 'regexRequired',
      path: ['regexPattern'],
    }
  )
  /**
   * Gated on the strategy for the same reason the regex pattern is: the field only
   * renders for `recursive` and only that strategy submits it, so an out-of-bound
   * value left behind by a strategy switch must not block a submit that drops it.
   */
  .refine(
    (data) =>
      data.strategy !== 'recursive' ||
      parseSeparators(data.customSeparators).length <= MAX_CHUNKING_SEPARATORS,
    {
      message: 'tooManySeparators',
      path: ['customSeparators'],
    }
  )
  .refine(
    (data) =>
      data.strategy !== 'recursive' ||
      parseSeparators(data.customSeparators).every(
        (separator) => separator.length <= MAX_CHUNKING_SEPARATOR_LENGTH
      ),
    {
      message: 'separatorTooLong',
      path: ['customSeparators'],
    }
  )

type FormInputValues = z.input<typeof FormSchema>
type FormValues = z.output<typeof FormSchema>

interface SubmitStatus {
  type: 'success' | 'error'
  message: string
}

export const CreateBaseModal = memo(function CreateBaseModal({
  open,
  onOpenChange,
  folderId = null,
}: CreateBaseModalProps) {
  const t = useTranslations('knowledge.createBase')
  const tValidation = useTranslations('knowledge.createBase.validation')
  const validationText = (key: string | undefined) =>
    key ? tValidation(key, VALIDATION_ARGS) : undefined
  const strategyOptions: ComboboxOption[] = STRATEGY_OPTIONS.map((value) => ({
    label: t(`strategies.${value}`),
    value,
  }))
  const params = useParams()
  const workspaceId = params.workspaceId as string

  const createKnowledgeBaseMutation = useCreateKnowledgeBase()
  const deleteKnowledgeBaseMutation = useDeleteKnowledgeBase()

  const [submitStatus, setSubmitStatus] = useState<SubmitStatus | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  const { uploadFiles, isUploading, uploadProgress, uploadError, clearError } = useKnowledgeUpload({
    workspaceId,
  })

  const handleClose = (open: boolean) => {
    if (!open) {
      clearError()
    }
    onOpenChange(open)
  }

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: '',
      description: '',
      minChunkSize: 100,
      maxChunkSize: 1024,
      overlapSize: 200,
      strategy: 'auto',
      regexPattern: '',
      regexStrictBoundaries: false,
      customSeparators: '',
    },
    mode: 'onSubmit',
  })

  const nameValue = watch('name')
  const strategyValue = watch('strategy')
  const regexStrictBoundariesValue = watch('regexStrictBoundaries')

  useEffect(() => {
    if (open) {
      setSubmitStatus(null)
      setFileError(null)
      setFiles([])
      reset({
        name: '',
        description: '',
        minChunkSize: 100,
        maxChunkSize: 1024,
        overlapSize: 200,
        strategy: 'auto',
        regexPattern: '',
        regexStrictBoundaries: false,
        customSeparators: '',
      })
    }
  }, [open, reset])

  const processFiles = (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    try {
      assertMultiFileUploadAdmission(selectedFiles, { existingFiles: files })
      setFileError(null)
      const newFiles: File[] = []
      let hasError = false

      for (const file of selectedFiles) {
        const validationError = validateKnowledgeBaseFile(file)
        if (validationError) {
          setFileError(validationError)
          hasError = true
          continue
        }

        newFiles.push(file)
      }

      if (!hasError && newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles])
      }
    } catch (error) {
      if (error instanceof MultiFileUploadAdmissionError) {
        setFileError(error.message)
        return
      }
      logger.error('Error processing files:', error)
      setFileError(t('processFilesError'))
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isSubmitting =
    createKnowledgeBaseMutation.isPending || deleteKnowledgeBaseMutation.isPending || isUploading

  const onInvalid = (formErrors: FieldErrors<FormInputValues>) => {
    const firstMessage = Object.values(formErrors).find(
      (fieldError) => typeof fieldError?.message === 'string'
    )?.message
    toast.error(
      typeof firstMessage === 'string' ? tValidation(firstMessage, VALIDATION_ARGS) : t('fixFields')
    )
  }

  const onSubmit = async (data: FormValues) => {
    setSubmitStatus(null)

    try {
      const strategyOptions: StrategyOptions | undefined =
        data.strategy === 'regex' && data.regexPattern
          ? {
              pattern: data.regexPattern,
              ...(data.regexStrictBoundaries && { strictBoundaries: true }),
            }
          : data.strategy === 'recursive' && data.customSeparators?.trim()
            ? { separators: parseSeparators(data.customSeparators) }
            : undefined

      const newKnowledgeBase = await createKnowledgeBaseMutation.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        workspaceId: workspaceId,
        folderId,
        chunkingConfig: {
          maxSize: data.maxChunkSize,
          minSize: data.minChunkSize,
          overlap: data.overlapSize,
          ...(data.strategy !== 'auto' && { strategy: data.strategy }),
          ...(strategyOptions && { strategyOptions }),
        },
      })

      if (files.length > 0) {
        try {
          const uploadedFiles = await uploadFiles(files, newKnowledgeBase.id, {
            recipe: 'default',
          })

          logger.info(`Successfully uploaded ${uploadedFiles.length} files`)
          logger.info(`Started processing ${uploadedFiles.length} documents in the background`)
        } catch (uploadError) {
          logger.error('File upload failed, deleting knowledge base:', uploadError)
          try {
            await deleteKnowledgeBaseMutation.mutateAsync({
              knowledgeBaseId: newKnowledgeBase.id,
            })
            logger.info(`Deleted orphaned knowledge base: ${newKnowledgeBase.id}`)
          } catch (deleteError) {
            logger.error('Failed to delete orphaned knowledge base:', deleteError)
          }
          throw uploadError
        }
      }

      setFiles([])

      handleClose(false)
    } catch (error) {
      logger.error('Error creating knowledge base:', error)
      setSubmitStatus({
        type: 'error',
        message: getErrorMessage(error, t('unknownError')),
      })
    }
  }

  return (
    <ChipModal open={open} onOpenChange={handleClose} srTitle={t('title')} size='lg'>
      <ChipModalHeader onClose={() => handleClose(false)}>{t('title')}</ChipModalHeader>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className='flex min-h-0 flex-1 flex-col'>
        <button type='submit' hidden disabled={isSubmitting || !nameValue?.trim()} />
        <ChipModalBody>
          <input
            type='text'
            name='fakeusernameremembered'
            autoComplete='username'
            className='-left-[9999px] pointer-events-none absolute opacity-0'
            tabIndex={-1}
            readOnly
          />

          <ChipModalField type='custom' title={t('name')}>
            <ChipInput
              placeholder={t('namePlaceholder')}
              {...register('name')}
              error={Boolean(errors.name)}
              autoComplete='off'
              autoCorrect='off'
              autoCapitalize='off'
              data-lpignore='true'
              data-form-type='other'
            />
          </ChipModalField>

          <ChipModalField
            type='custom'
            title={t('description')}
            error={validationText(errors.description?.message)}
          >
            <ChipTextarea
              placeholder={t('descriptionPlaceholder')}
              rows={4}
              {...register('description')}
              error={Boolean(errors.description)}
            />
          </ChipModalField>

          <div className='flex gap-3'>
            <ChipModalField type='custom' title={t('minChunkSize')} className='flex-1'>
              <ChipInput
                type='number'
                min={1}
                max={2000}
                step={1}
                placeholder='100'
                {...register('minChunkSize', { valueAsNumber: true })}
                error={Boolean(errors.minChunkSize)}
                autoComplete='off'
                data-form-type='other'
              />
            </ChipModalField>

            <ChipModalField type='custom' title={t('maxChunkSize')} className='flex-1'>
              <ChipInput
                type='number'
                min={100}
                max={4000}
                step={1}
                placeholder='1024'
                {...register('maxChunkSize', { valueAsNumber: true })}
                error={Boolean(errors.maxChunkSize)}
                autoComplete='off'
                data-form-type='other'
              />
            </ChipModalField>
          </div>

          <ChipModalField type='custom' title={t('overlap')} hint={t('overlapHint')}>
            <ChipInput
              type='number'
              min={0}
              max={500}
              step={1}
              placeholder='200'
              {...register('overlapSize', { valueAsNumber: true })}
              error={Boolean(errors.overlapSize)}
              autoComplete='off'
              data-form-type='other'
            />
          </ChipModalField>

          <ChipModalField type='custom' title={t('strategy')} hint={t('strategyHint')}>
            <ChipCombobox
              options={strategyOptions}
              value={strategyValue}
              onChange={(value) => setValue('strategy', value as FormValues['strategy'])}
              dropdownWidth='trigger'
              align='start'
            />
          </ChipModalField>

          {strategyValue === 'regex' && (
            <>
              <ChipModalField
                type='custom'
                title={t('regexPattern')}
                error={validationText(errors.regexPattern?.message)}
                hint={t('regexPatternHint')}
              >
                <ChipInput
                  placeholder={t('regexPatternPlaceholder', {
                    first: '\\\\n\\\\n',
                    second: '(?<=\\\\})\\\\s*(?=\\\\{)',
                  })}
                  {...register('regexPattern')}
                  error={Boolean(errors.regexPattern)}
                  autoComplete='off'
                  data-form-type='other'
                />
              </ChipModalField>

              <ChipModalField
                type='custom'
                title={t('chunkBoundaries')}
                hint={t('chunkBoundariesHint')}
              >
                <label
                  htmlFor='regexStrictBoundaries'
                  className='flex cursor-pointer items-center gap-2'
                >
                  <Checkbox
                    id='regexStrictBoundaries'
                    checked={regexStrictBoundariesValue}
                    onCheckedChange={(checked) =>
                      setValue('regexStrictBoundaries', checked === true)
                    }
                  />
                  <span className='text-[var(--text-primary)] text-sm'>
                    {t('strictBoundaries')}
                  </span>
                </label>
              </ChipModalField>
            </>
          )}

          {strategyValue === 'recursive' && (
            <ChipModalField
              type='custom'
              title={t('customSeparators')}
              hint={t('customSeparatorsHint', { max: MAX_CHUNKING_SEPARATORS })}
              error={validationText(errors.customSeparators?.message)}
            >
              <ChipInput
                placeholder={t('customSeparatorsPlaceholder', { separators: '\\n\\n, \\n, . ,  ' })}
                {...register('customSeparators')}
                error={Boolean(errors.customSeparators)}
                autoComplete='off'
                data-form-type='other'
              />
            </ChipModalField>
          )}

          <ChipModalField
            type='file'
            title={t('uploadDocuments')}
            accept={ACCEPT_ATTRIBUTE}
            multiple
            onChange={processFiles}
            description={t('uploadDocumentsDescription')}
            error={fileError}
          />

          {files.length > 0 && (
            <ChipModalField type='custom' title={t('selectedFiles')}>
              <div className='space-y-2'>
                {files.map((file, index) => {
                  const fileStatus = uploadProgress.fileStatuses?.[index]
                  const isFailed = fileStatus?.status === 'failed'
                  const isProcessing = fileStatus?.status === 'uploading'

                  return (
                    <div
                      key={`${file.name}-${file.size}`}
                      className={cn(
                        'flex items-center gap-2 rounded-sm border p-2',
                        isFailed && 'border-[var(--text-error)]'
                      )}
                    >
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-caption',
                          isFailed && 'text-[var(--text-error)]'
                        )}
                        title={file.name}
                      >
                        {file.name}
                      </span>
                      <span className='shrink-0 text-[var(--text-muted)] text-xs'>
                        {formatFileSize(file.size)}
                      </span>
                      <div className='flex shrink-0 items-center gap-1'>
                        {isProcessing ? (
                          <Loader className='size-4 text-[var(--text-muted)]' animate />
                        ) : (
                          <Button
                            aria-label={t('removeFile')}
                            type='button'
                            variant='ghost'
                            className='size-4 p-0'
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                          >
                            <X className='size-3.5' />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ChipModalField>
          )}

          <ChipModalError>{uploadError?.message || submitStatus?.message}</ChipModalError>
        </ChipModalBody>

        <ChipModalFooter
          onCancel={() => handleClose(false)}
          cancelDisabled={isSubmitting}
          primaryAction={{
            label: isSubmitting
              ? isUploading
                ? uploadProgress.stage === 'uploading'
                  ? t('uploadingProgress', {
                      completed: uploadProgress.filesCompleted,
                      total: uploadProgress.totalFiles,
                    })
                  : uploadProgress.stage === 'processing'
                    ? t('processing')
                    : t('creating')
                : t('creating')
              : t('create'),
            onClick: handleSubmit(onSubmit, onInvalid),
            disabled: isSubmitting || !nameValue?.trim(),
          }}
        />
      </form>
    </ChipModal>
  )
})
