import type { ReactNode } from 'react'
import { Label } from '@sim/emcn'

interface FormFieldProps {
  label: string
  /** Id of the control the label names; omit for a group of controls. */
  htmlFor?: string
  hint?: string
  error?: string | null
  children: ReactNode
}

/** A labeled page field, in the chip field rhythm (muted label, control, caption below). */
export function FormField({ label, htmlFor, hint, error, children }: FormFieldProps) {
  return (
    <div className='flex min-w-0 flex-col gap-[9px]'>
      <Label htmlFor={htmlFor} className='pl-0.5 text-[var(--text-muted)]'>
        {label}
      </Label>
      {children}
      {error ? (
        <p className='pl-0.5 text-[var(--text-error)] text-caption'>{error}</p>
      ) : (
        hint && <p className='pl-0.5 text-[var(--text-muted)] text-caption'>{hint}</p>
      )}
    </div>
  )
}
